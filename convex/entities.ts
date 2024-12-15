import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";

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
    // TODO: Fetch these based on the logged in user!
    const entities = await ctx.db
      .query("entities")
      .filter((q) => q.eq(q.field("type"), type))
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
  handler: async (ctx, { id} ) => {
    const entity = await ctx.db.get(id)
    return entity;
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

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated call to mutation");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
    if (!user) {
      throw new Error("Unauthenticated call to mutation");
    }
    await ctx.db.insert("entities", {
      name,
      ownerId: user._id,
      type,
    });
  },
});
