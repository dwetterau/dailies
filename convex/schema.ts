import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { ENTITIES_SCHEMA } from "./entities";
import { EVENTS_SCHEMA } from "./events";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
export default defineSchema({
  ...authTables,
  entities: ENTITIES_SCHEMA,
  events: EVENTS_SCHEMA,
});
