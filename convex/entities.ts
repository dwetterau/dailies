import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";
import { getUserIdFromContextAsync } from "./users";
import { Id } from "./_generated/dataModel";
import { EventType, getCurrentEvent } from "./events";

export enum EntityCategory {
  EXERCISE = "exercise",
  LEARNING = "learning",
  CARE = "care",
  THINKING = "thinking",
  TIDYING = "tidying",
}

const entityCategoriesSchema = v.union(
  ...Object.values(EntityCategory).map((category) => v.literal(category))
)

export enum EntityType {
  WORKOUT = "workout",
  FLASH_CARDS = "flashCards",
  DUOLINGO = "duolingo",
  HYDRATION = "hydration",
  JOURNALING = "journaling",
  PRESCRIPTIONS = "prescriptions",
}

const entityTypesSchema = v.union(
  ...Object.values(EntityType).map((type) => v.literal(type))
);

export const ENTITIES_SCHEMA = defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: entityTypesSchema,
  category: entityCategoriesSchema,
  isRequiredDaily: v.boolean(),
  numRequiredCompletions: v.optional(v.number()),
  // TODO: Add a "resetAfterInterval" field - so that weekly events don't reset daily
});

export const list = query({
  args: {
    timeRange: v.optional(v.object({
      startTimestamp: v.number(),
      endTimestamp: v.number(),
    })),
    type: v.optional(entityTypesSchema),
  },
  handler: async (ctx, { timeRange, type }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    const entities = await ctx.db
      .query("entities")
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), ownerId), 
        ...(type ? [q.eq(q.field("type"), type)] : []),
      ))
      .collect();

    const entityIdToIsDone: Record<Id<"entities">, boolean> = {};
    if (timeRange) {
      for (const entity of entities) {
        // TODO: Can this happen in parallel?
        const currentEvent = await getCurrentEvent({db: ctx.db, ownerId, entityId: entity._id, timeRange});
        if (currentEvent?.details.type === EventType.GENERIC_COMPLETION) {
          const {numCompletions, numRequiredCompletions} = currentEvent.details.payload;
          entityIdToIsDone[entity._id] = numCompletions >= numRequiredCompletions; 
        }
        // TODO: Generalize this logic!
        switch (entity.type) {
          case EntityType.FLASH_CARDS: {
            if (currentEvent?.details.type === EventType.FLASH_CARDS) {
              entityIdToIsDone[entity._id] = currentEvent.details.payload.numReviewed >= 100;
            }
            break;
          }
          case EntityType.WORKOUT: {
            entityIdToIsDone[entity._id] = !!currentEvent;
            break;
          }
        }
      }
    }
    return {
      entities,
      entityIdToIsDone,
    };
  },
});

export const get = query({
  args: {
    id: v.id('entities') 
  },
  handler: async (ctx, {id}) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    const entities = await ctx.db
      .query("entities")
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), ownerId), 
        q.eq(q.field("_id"), id)),
      )
      .collect();
    return entities[0] ?? null;
  }
})

function getEnumType(typeString: string): EntityType {
  for (const option of Object.values(EntityType)) {
    if (option === typeString) {
      return option;
    }
  }
  throw new Error(`Invalid type: ${typeString}`);
}

export const create = mutation({
  args: {
    name: v.string(),
    type: entityTypesSchema,
    category: entityCategoriesSchema,
  },
  handler: async (ctx, { category, name, type }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    await ctx.db.insert("entities", {
      name,
      ownerId,
      type,
      category,
      isRequiredDaily: false,
    });
  },
});
