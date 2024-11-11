import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";

export enum EntityType {
  WORKOUT = "workout",
}

export const ENTITIES_SCHEMA = defineTable({
  ownerId: v.id("users"),
  name: v.string(),
  type: v.union(...Object.values(EntityType).map((type) => v.literal(type))),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const entities = await ctx.db.query("entities").collect();
    return {
      entities,
    };
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

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(...Object.values(EntityType).map((type) => v.literal(type))),
  },
  handler: async (ctx, { name, type }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    await ctx.db.insert("entities", {
      name,
      ownerId: userId,
      type,
    });
  },
});
