import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";
import { getUserIdFromContextAsync } from "./users";

export enum EntityType {
  WORKOUT = "workout",
}

const entityTypesSchema = v.union(
  ...Object.values(EntityType).map((type) => v.literal(type))
);

export const ENTITIES_SCHEMA = defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: entityTypesSchema,
});

export const list = query({
  args: {
    type: entityTypesSchema,
  },
  handler: async (ctx, { type }) => {
    const ownerId = await getUserIdFromContextAsync(ctx)
    const entities = await ctx.db
      .query("entities")
      .filter((q) => q.and(
        q.eq(q.field("ownerId"), ownerId), 
        q.eq(q.field("type"), type),
      ))
      .collect();
    return {
      entities,
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
    });
  },
});
