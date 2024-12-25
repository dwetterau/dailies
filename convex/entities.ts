import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";
import { getUserIdFromContextAsync } from "./users";
import { Id } from "./_generated/dataModel";
import { EventType, getCurrentEvent } from "./events";

export enum EntityType {
  EXERCISE = "exercise",
  LEARNING = "learning",
  CARE = "care",
  THINKING = "thinking",
  TIDYING = "tidying",
}

const entityTypesSchema = v.union(
  ...Object.values(EntityType).map((type) => v.literal(type))
);

export const ENTITIES_SCHEMA = defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: entityTypesSchema,
  isRequiredDaily: v.boolean(),
  // TODO: Add a "resetAfterInterval" field - so that weekly events don't reset daily
});

export const list = query({
  args: {
    date: v.optional(v.string()),
    type: v.optional(entityTypesSchema),
  },
  handler: async (ctx, { date, type }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    const entities = await ctx.db
      .query("entities")
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), ownerId), 
        ...(type ? [q.eq(q.field("type"), type)] : []),
      ))
      .collect();

    const entityIdToIsDone: Record<Id<"entities">, boolean> = {};
    if (date) {
      for (const entity of entities) {
        // TODO: Can this happen in parallel?
        const currentEvent = await getCurrentEvent({db: ctx.db, ownerId, entityId: entity._id, dateString: date});
        // TODO: Generalize this logic!
        if (entity.type === EntityType.LEARNING && currentEvent?.details.type === EventType.FLASH_CARDS) {
          entityIdToIsDone[entity._id] = currentEvent.details.payload.numReviewed >= 100;
        }
        if (entity.type === EntityType.EXERCISE) {
          entityIdToIsDone[entity._id] = !!currentEvent;
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
  },
  handler: async (ctx, { name, type }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    await ctx.db.insert("entities", {
      name,
      ownerId,
      type,
      isRequiredDaily: false,
    });
  },
});
