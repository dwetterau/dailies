import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";
import { getUserIdFromContextAsync } from "./users";
import { Doc, Id } from "./_generated/dataModel";
import { EventType, getCurrentEventWithDb } from "./events";

export type Entity = Doc<"entities">;
export type EntityId = Id<"entities">;

export enum EntityCategory {
  EXERCISE = "exercise",
  LEARNING = "learning",
  CARE = "care",
  THINKING = "thinking",
  TIDYING = "tidying",
}

const entityCategoriesSchema = v.union(
  ...Object.values(EntityCategory).map((category) => v.literal(category))
);

export enum EntityType {
  WORKOUT = "workout",
  GENERIC_COMPLETION = "genericCompletion",
  FLASH_CARDS = "flashCards",
}

export enum ResetAfterInterval {
  DAILY = "daily",
  WEEKLY = "weekly",
}

const entityTypesSchema = v.union(
  ...Object.values(EntityType).map((type) => v.literal(type))
);

export const ENTITIES_SCHEMA = defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: entityTypesSchema,
  category: entityCategoriesSchema,
  isRequired: v.boolean(),
  numRequiredCompletions: v.optional(v.number()),
  // Used for some entity types to specify which fields are required on events for the entity.
  includedEventFields: v.optional(v.array(v.string())),
  resetAfterInterval: v.union(
    ...Object.values(ResetAfterInterval).map(v.literal)
  ),
});

export const list = query({
  args: {
    weeklyTimeRange: v.optional(
      v.object({
        startTimestamp: v.number(),
        endTimestamp: v.number(),
      })
    ),
    dailyTimeRange: v.optional(
      v.object({
        startTimestamp: v.number(),
        endTimestamp: v.number(),
      })
    ),
    type: v.optional(entityTypesSchema),
  },
  handler: async (ctx, { dailyTimeRange, type, weeklyTimeRange }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const entities = await ctx.db
      .query("entities")
      .filter((q) =>
        q.and(
          q.eq(q.field("ownerId"), ownerId),
          ...(type ? [q.eq(q.field("type"), type)] : [])
        )
      )
      .collect();

    const entityIdToIsDone: Record<Id<"entities">, boolean> = {};
    const entityIdToCompletionRatio: Record<Id<"entities">, number> = {};
    if (dailyTimeRange && weeklyTimeRange) {
      for (const entity of entities) {
        // TODO: Can this happen in parallel?
        const timeRange =
          entity.resetAfterInterval === "daily"
            ? dailyTimeRange
            : weeklyTimeRange;
        const currentEvent = await getCurrentEventWithDb({
          db: ctx.db,
          ownerId,
          entityId: entity._id,
          timeRange,
        });
        if (currentEvent?.details.type === EventType.GENERIC_COMPLETION) {
          // TODO: We probably don't need both of these numRequiredCompletions fields (on the entity too)
          const { numCompletions, numRequiredCompletions } =
            currentEvent.details.payload;
          entityIdToIsDone[entity._id] =
            numCompletions >= numRequiredCompletions;
          entityIdToCompletionRatio[entity._id] =
            numCompletions >= numRequiredCompletions
              ? 1
              : numCompletions / numRequiredCompletions;
        }
        // TODO: Generalize this logic!
        switch (entity.type) {
          case EntityType.FLASH_CARDS: {
            if (
              currentEvent?.details.type === EventType.FLASH_CARDS &&
              entity.numRequiredCompletions
            ) {
              const { numReviewed } = currentEvent.details.payload;
              entityIdToIsDone[entity._id] =
                numReviewed >= entity.numRequiredCompletions;
              entityIdToCompletionRatio[entity._id] =
                numReviewed >= entity.numRequiredCompletions
                  ? 1
                  : numReviewed / entity.numRequiredCompletions;
            }
            break;
          }
          case EntityType.WORKOUT: {
            entityIdToIsDone[entity._id] = !!currentEvent;
            entityIdToCompletionRatio[entity._id] = !!currentEvent ? 1 : 0;
            break;
          }
        }
      }
    }
    return {
      entities,
      entityIdToIsDone,
      entityIdToCompletionRatio,
    };
  },
});

export const get = query({
  args: {
    id: v.id("entities"),
  },
  handler: async (ctx, { id }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const entities = await ctx.db
      .query("entities")
      .filter((q) =>
        q.and(q.eq(q.field("ownerId"), ownerId), q.eq(q.field("_id"), id))
      )
      .collect();
    return entities[0] ?? null;
  },
});

function getEnumType(typeString: string): EntityType {
  for (const option of Object.values(EntityType)) {
    if (option === typeString) {
      return option;
    }
  }
  throw new Error(`Invalid type: ${typeString}`);
}

const COMMON_ENTITY_CREATE_ARGS = {
  name: v.string(),
  type: entityTypesSchema,
  category: entityCategoriesSchema,
  isRequired: v.boolean(),
  resetAfterInterval: v.union(
    ...Object.values(ResetAfterInterval).map(v.literal)
  ),
  numRequiredCompletions: v.optional(v.number()),
  includedEventFields: v.optional(v.array(v.string())),
};

export const create = mutation({
  args: COMMON_ENTITY_CREATE_ARGS,
  handler: async (ctx, args) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    await ctx.db.insert("entities", {
      ...args,
      ownerId,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("entities"),
    ...COMMON_ENTITY_CREATE_ARGS,
  },
  handler: async (ctx, { id, ...remainingArgs }) => {
    // Confirm that the user owns this event
    const ownerId = await getUserIdFromContextAsync(ctx);
    const entities = await ctx.db
      .query("entities")
      .filter((q) =>
        q.and(q.eq(q.field("ownerId"), ownerId), q.eq(q.field("_id"), id))
      )
      .collect();
    if (!entities.length) {
      throw new ConvexError(`Entity not found: ${id}`);
    }
    await ctx.db.patch(id, {
      ...remainingArgs,
      ownerId,
    });
  },
});
