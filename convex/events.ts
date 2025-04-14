import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  defineTable,
  GenericDatabaseReader,
  GenericDataModel,
  GenericMutationCtx,
  GenericQueryCtx,
} from "convex/server";
import { getUserIdFromContextAsync } from "./users";
import { DataModel, Doc, Id } from "./_generated/dataModel";

export type Event = Doc<"events">;
export type EventId = Id<"events">;

export enum EventType {
  WORKOUT = "workout",
  FLASH_CARDS = "flashCards",
  GENERIC_COMPLETION = "genericCompletion",
}

export const WORKOUT_DETAILS_SCHEMA = v.object({
  type: v.literal(EventType.WORKOUT),
  payload: v.object({
    weight: v.optional(v.number()),
    numReps: v.optional(v.number()),
    numSets: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    distance: v.optional(v.number()),
    weightOverrides: v.optional(
      v.array(
        v.object({
          weight: v.optional(v.number()),
          repIndex: v.optional(v.number()),
          setIndex: v.optional(v.number()),
        })
      )
    ),
  }),
});

export const FLASH_CARDS_SCHEMA = v.object({
  type: v.literal(EventType.FLASH_CARDS),
  payload: v.object({
    numReviewed: v.number(),
    numCorrect: v.number(),
  }),
});

export const GENERIC_COMPLETION_SCHEMA = v.object({
  type: v.literal(EventType.GENERIC_COMPLETION),
  payload: v.object({
    numCompletions: v.number(),
    numRequiredCompletions: v.number(),
  }),
});

const allEventDetails = v.union(
  WORKOUT_DETAILS_SCHEMA,
  FLASH_CARDS_SCHEMA,
  GENERIC_COMPLETION_SCHEMA
);

export const EVENTS_SCHEMA = defineTable({
  ownerId: v.id("users"),
  entityId: v.id("entities"),
  timestamp: v.number(),
  details: allEventDetails,
}).index("by_entity_id", ["entityId"]);

export const list = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, { entityId }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    return await ctx.db
      .query("events")
      .filter((q) =>
        q.and(
          q.eq(q.field("ownerId"), ownerId),
          q.eq(q.field("entityId"), entityId)
        )
      )
      .collect();
  },
});

function getEnumType(typeString: string): EventType {
  for (const option of Object.values(EventType)) {
    if (option === typeString) {
      return option;
    }
  }
  throw new Error(`Invalid type: ${typeString}`);
}

export const create = mutation({
  args: {
    entityId: v.id("entities"),
    details: allEventDetails,
    timestamp: v.number(),
  },
  handler: async (ctx, { entityId, details, timestamp }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    await ctx.db.insert("events", {
      ownerId,
      entityId,
      timestamp,
      details,
    });
  },
});

export const getCurrentEventWithDb = async ({
  db,
  ownerId,
  entityId,
  timeRange: { startTimestamp, endTimestamp },
}: {
  db: GenericDatabaseReader<DataModel>;
  ownerId: Id<"users">;
  entityId: Id<"entities">;
  timeRange: {
    startTimestamp: number;
    endTimestamp: number;
  };
}): Promise<Doc<"events"> | null> => {
  // Check if an event already exists for this day
  const existingEvents = await db
    .query("events")
    .filter((q) =>
      q.and(
        q.eq(q.field("ownerId"), ownerId),
        q.eq(q.field("entityId"), entityId),
        q.gte(q.field("timestamp"), startTimestamp),
        q.lt(q.field("timestamp"), endTimestamp)
      )
    )
    .collect();
  return existingEvents[0] ?? null;
};

export const getCurrentEvent = query({
  args: {
    entityId: v.id("entities"),
    timeRange: v.object({
      startTimestamp: v.number(),
      endTimestamp: v.number(),
    }),
  },
  handler: async (ctx, { entityId, timeRange }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    return await getCurrentEventWithDb({
      db: ctx.db,
      ownerId,
      entityId,
      timeRange,
    });
  },
});

export const upsertCurrentEvent = mutation({
  args: {
    entityId: v.id("entities"),
    timeRange: v.object({
      startTimestamp: v.number(),
      endTimestamp: v.number(),
    }),
    timestamp: v.number(),
    details: allEventDetails,
  },
  handler: async (ctx, { entityId, details, timeRange, timestamp }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const existingEvent = await getCurrentEventWithDb({
      db: ctx.db,
      ownerId,
      timeRange,
      entityId,
    });
    if (existingEvent) {
      console.log("Patching current interval event to", details);
      await ctx.db.patch(existingEvent._id, {
        timestamp,
        details,
      });
    } else {
      // No existing event for the interval - create it
      await ctx.db.insert("events", {
        details,
        entityId,
        ownerId,
        timestamp,
      });
    }
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    details: allEventDetails,
  },
  handler: async (ctx, { id, details }) => {
    // Confirm that the user owns this event
    const ownerId = await getUserIdFromContextAsync(ctx);
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(q.eq(q.field("ownerId"), ownerId), q.eq(q.field("_id"), id))
      )
      .collect();
    if (!events.length) {
      throw new ConvexError(`Event not found: ${id}`);
    }
    await ctx.db.patch(id, { details });
  },
});

export const deleteEvent = mutation({
  args: {
    id: v.id("events"),
  },
  handler: async (ctx, { id }) => {
    // Confirm that the user owns this event
    const ownerId = await getUserIdFromContextAsync(ctx);
    const events = await ctx.db
      .query("events")
      .filter((q) =>
        q.and(q.eq(q.field("ownerId"), ownerId), q.eq(q.field("_id"), id))
      )
      .collect();
    if (!events.length) {
      throw new ConvexError(`Event not found: ${id}`);
    }
    await ctx.db.delete(id);
  },
});
