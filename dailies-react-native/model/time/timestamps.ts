import { useMemo } from "react";

/**
 * Returns the current timestamp in milliseconds.
 */
export function getCurrentTimestamp(): number {
  return Math.floor(Date.now());
}

export function getStartOfDayTimestamp(currentTimestamp: number): number {
  const now = new Date(currentTimestamp);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return startOfDay.getTime();
}

export function getEndOfDayTimestamp(currentTimestamp: number): number {
  const now = new Date(currentTimestamp);
  const endOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
  return endOfDay.getTime();
}

export function getStartOfWeekTimestamp(currentTimestamp: number): number {
  const now = new Date(currentTimestamp);
  const dayOfWeek = now.getDay();

  const startOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - dayOfWeek
  );
  startOfWeek.setHours(0, 0, 0, 0);
  return startOfWeek.getTime();
}

export function getEndOfWeekTimestamp(currentTimestamp: number): number {
  const now = new Date(currentTimestamp);
  const dayOfWeek = now.getDay();
  const daysUntilSaturday = 6 - dayOfWeek;

  const endOfWeek = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSaturday,
    23,
    59,
    59,
    999
  );
  return endOfWeek.getTime();
}

export function useCurrentTimeRanges() {
  const currentTime = getCurrentTimestamp();
  const startTimestamp = getStartOfDayTimestamp(currentTime);
  return useMemo(() => {
    return {
      timeRanges: {
        dailyTimeRange: {
          startTimestamp: startTimestamp,
          endTimestamp: getEndOfDayTimestamp(currentTime),
        },
        weeklyTimeRange: {
          startTimestamp: getStartOfWeekTimestamp(currentTime),
          endTimestamp: getEndOfWeekTimestamp(currentTime),
        },
      },
      currentTimestamp: currentTime,
    };
  }, [startTimestamp]);
}
