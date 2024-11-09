import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
export default defineSchema({
  ...authTables,
  entities: defineTable({
    ownerId: v.id("users"),
    name: v.string(),
  }),
  messages: defineTable({
    userId: v.id("users"),
    body: v.string(),
  }),
});
