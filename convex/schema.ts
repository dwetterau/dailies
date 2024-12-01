import { defineSchema } from "convex/server";
import { ENTITIES_SCHEMA } from "./entities";
import { EVENTS_SCHEMA } from "./events";
import { USERS_SCHEMA } from "./users";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
export default defineSchema({
  entities: ENTITIES_SCHEMA,
  events: EVENTS_SCHEMA,
  users: USERS_SCHEMA,
});
