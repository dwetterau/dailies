import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { defineTable } from "convex/server";

export enum EventType {
  WORKOUT = "workout",
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

export const EVENTS_SCHEMA = defineTable({
  ownerId: v.id("users"),
  entityId: v.id("entities"),
  date: v.string(),
  details: v.union(WORKOUT_DETAILS_SCHEMA),
}).index("by_entity_id", ["entityId"]);

export const list = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, { entityId }) => {
    return await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("entityId"), entityId))
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
    details: v.union(WORKOUT_DETAILS_SCHEMA),
    date: v.string(),
  },
  handler: async (ctx, { entityId, details, date }) => {
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
    await ctx.db.insert("events", {
      ownerId: user._id,
      entityId,
      date,
      details,
    });
  },
});
