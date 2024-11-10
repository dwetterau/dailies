import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function assert<T>(x: T): asserts x is NonNullable<T> {
  if (!x) {
    console.error(x);
    throw new Error("value is not truthy");
  }
}
