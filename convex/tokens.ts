import { v } from "convex/values";
import { defineTable } from "convex/server";
import { query } from "./_generated/server";
import { getUserIdFromContextAsync } from "./users";

export enum TokenType {
  AIRTABLE = "airtable",
  FSRS_LAMBDA = "fsrs_lambda",
}

export const TOKENS_SCHEMA = defineTable({
  ownerId: v.string(),
  tokenType: v.union(...Object.values(TokenType).map((t) => v.literal(t))),
  token: v.string(),
}).index("by_owner", ["ownerId"]);

export const getTokenIfExists = query({
  args: {
    tokenType: v.union(...Object.values(TokenType).map((t) => v.literal(t))),
  },
  handler: async (ctx, { tokenType }) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const tokens = await ctx.db
      .query("tokens")
      .filter((q) =>
        q.and(
          q.eq(q.field("ownerId"), ownerId),
          q.eq(q.field("tokenType"), tokenType)
        )
      )
      .collect();
    if (!tokens.length) {
      return null;
    }
    return tokens[0]!;
  },
});
