import { Entity } from "@convex/entities";
import {
  getEndOfDayTimestamp,
  getEndOfWeekTimestamp,
  getStartOfDayTimestamp,
  getStartOfWeekTimestamp,
} from "../time/timestamps";

export function getTimeRangeForTimestamp(
  resetAfterInterval: Entity["resetAfterInterval"],
  timestamp: number
): { startTimestamp: number; endTimestamp: number } {
  switch (resetAfterInterval) {
    case "daily":
      return {
        startTimestamp: getStartOfDayTimestamp(timestamp),
        endTimestamp: getEndOfDayTimestamp(timestamp),
      };
    case "weekly":
      return {
        startTimestamp: getStartOfWeekTimestamp(timestamp),
        endTimestamp: getEndOfWeekTimestamp(timestamp),
      };
    default:
      throw new Error(`Invalid resetAfterInterval: ${resetAfterInterval}`);
  }
}
