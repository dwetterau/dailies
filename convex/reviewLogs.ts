import { v } from "convex/values";
import { defineTable } from "convex/server";
import { internalMutation } from "./_generated/server";
import { ReviewStatus } from "./flashCards";

export const REVIEW_LOGS_SCHEMA = defineTable({
  ownerId: v.id("users"),
  cardId: v.id("flashCards"),
  rating: v.union(...Object.values(ReviewStatus).map((t) => v.literal(t))),
  reviewTimestamp: v.number(), // unix timestamp in seconds
});

export const storeReviewLogs = internalMutation({
  args: {
    ownerId: v.id("users"),
    logs: v.array(
      v.object({
        cardId: v.id("flashCards"),
        rating: v.union(
          ...Object.values(ReviewStatus).map((t) => v.literal(t))
        ),
        reviewTimestamp: v.number(),
      })
    ),
  },
  handler: async (ctx, { ownerId, logs }) => {
    for (const log of logs) {
      await ctx.db.insert("reviewLogs", { ...log, ownerId });
    }
  },
});
