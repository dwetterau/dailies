import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function assert(condition: unknown): asserts condition {
  if (!condition) {
    console.error(condition);
    throw new Error("Condition is not true");
  }
}

export function assertIsNotNull<T>(x: T): asserts x is NonNullable<T> {
  if (!x) {
    console.error(x);
    throw new Error("value is not truthy");
  }
}

const DATE_TIME_OPTIONS = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  //hour: "2-digit",
  //minute: "2-digit",
  //hour12: true,
} as const;

export function formatTimestamp(date: Date): string {
  return Intl.DateTimeFormat("en-US", DATE_TIME_OPTIONS).format(date);
}
