import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";
import { getUserIdFromContextAsync } from "./users";

export enum EventType {
  WORKOUT = "workout",
  FLASH_CARDS = "flashCards",
}

export const WORKOUT_DETAILS_SCHEMA = v.object({
  type: v.literal(EventType.WORKOUT),
  payload: v.object({
    weight: v.number(),
    numReps: v.number(),
    numSets: v.number(),
    overrides: v.optional(
      v.array(
        v.object({
          weight: v.number(),
          repIndex: v.number(),
          setIndex: v.number(),
        })
      )
    ),
  })
});

export const FLASH_CARDS_SCHEMA = v.object({
  type: v.literal(EventType.FLASH_CARDS),
  payload: v.object({
    numReviewed: v.number(),
    numCorrect: v.number(),
  })
})

export const EVENTS_SCHEMA = defineTable({
  ownerId: v.id("users"),
  entityId: v.id("entities"),
  date: v.string(),
  details: v.union(WORKOUT_DETAILS_SCHEMA, FLASH_CARDS_SCHEMA),
}).index("by_entity_id", ["entityId"]);

export const list = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, { entityId }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    return await ctx.db
      .query("events")
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), ownerId),
        q.eq(q.field("entityId"), entityId)
      ))
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
    details: v.union(WORKOUT_DETAILS_SCHEMA, FLASH_CARDS_SCHEMA),
    date: v.string(),
  },
  handler: async (ctx, { entityId, details, date }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    await ctx.db.insert("events", {
      ownerId,
      entityId,
      date,
      details,
    });
  },
});

export const upsertDayEvent = mutation({
  args: {
    entityId: v.id("entities"),
    date: v.string(),
    details: v.union(WORKOUT_DETAILS_SCHEMA, FLASH_CARDS_SCHEMA),
  },
  handler: async (ctx, { entityId, details, date: _date }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)

    // TODO: Handle timezones better than this, not sure what the mobile app is going to be doing:
    // Extract the date portion (first 10 characters of the string)
    const date = _date.slice(0, 10);

    // Calculate start and end of the day
    const startOfDay = `${date}T00:00:00.000Z`;
    const endOfDay = `${date}T23:59:59.999Z`;

    // Check if an event already exists for this day
    const existingEvents = await ctx.db
      .query("events")
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), ownerId),
        q.eq(q.field("entityId"), entityId),
        q.gte(q.field("date"), startOfDay),
        q.lte(q.field("date"), endOfDay),
      ))
      .collect();
    if (existingEvents.length > 0) {
      const existingEvent = existingEvents[0]!;
      await ctx.db.patch(existingEvent._id, {
        details,
      });
    } else {
      // No existing event for the day - create it
      await ctx.db.insert("events", {
        ownerId,
        entityId,
        date: _date,
        details,
      });
    }
  },
})
