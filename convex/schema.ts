import { defineSchema } from "convex/server";
import { ENTITIES_SCHEMA } from "./entities";
import { EVENTS_SCHEMA } from "./events";
import { TOKENS_SCHEMA } from "./tokens";
import { USERS_SCHEMA } from "./users";
import { FLASH_CARDS_SCHEMA } from "./flashCards";
import { REVIEW_LOGS_SCHEMA } from "./reviewLogs";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
export default defineSchema({
  entities: ENTITIES_SCHEMA,
  events: EVENTS_SCHEMA,
  flashCards: FLASH_CARDS_SCHEMA,
  tokens: TOKENS_SCHEMA,
  users: USERS_SCHEMA,
  reviewLogs: REVIEW_LOGS_SCHEMA,
});
