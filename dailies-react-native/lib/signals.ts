import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { taskyApi } from "./tasky";

export const SIGNAL_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type SignalDashboardItem = FunctionReturnType<
  typeof taskyApi.signals.listDashboard
>[number];

export type SignalEntry = FunctionReturnType<
  typeof taskyApi.signals.history
>["page"][number];

export function useSignalClock(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return now;
}

export function createSignalIdempotencyKey(prefix: string): string {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
}

export function formatSignalQuantity(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

export function formatElapsed(milliseconds: number): string {
  const safe = Math.max(0, milliseconds);
  const minutes = Math.floor(safe / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 12) return `${weeks}w ago`;
  return new Date(Date.now() - safe).toLocaleDateString();
}

export function formatFuture(timestamp: number, now: number): string {
  const remaining = timestamp - now;
  if (remaining <= 0) return "due now";
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  if (hours < 24) return `due in ${hours}h`;
  const days = Math.ceil(hours / 24);
  return `due in ${days}d`;
}

export function signalPrimaryText(
  signal: SignalDashboardItem,
  now: number,
): string {
  if (signal.model.kind === "activity") {
    return signal.model.lastOccurredAt === undefined
      ? "Never recorded"
      : formatElapsed(now - signal.model.lastOccurredAt);
  }
  const quantity =
    signal.evaluation.projectedQuantity ?? signal.model.confirmedQuantity;
  return `${formatSignalQuantity(quantity)} ${signal.model.unit}${
    signal.evaluation.isProjected ? " projected" : ""
  }`;
}

export function signalSecondaryText(
  signal: SignalDashboardItem,
  now: number,
): string {
  if (signal.evaluation.actionAt !== undefined) {
    return formatFuture(signal.evaluation.actionAt, now);
  }
  if (signal.model.kind === "inventory") {
    return `Last confirmed ${new Date(signal.model.confirmedAt).toLocaleDateString()}`;
  }
  return signal.evaluation.reason;
}
