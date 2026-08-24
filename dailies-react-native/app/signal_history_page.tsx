import type { FunctionArgs } from "convex/server";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SignalRow } from "@/components/SignalRow";
import {
  createSignalIdempotencyKey,
  formatSignalQuantity,
  SIGNAL_SOON_WINDOW_MS,
  type SignalEntry,
  useSignalClock,
} from "@/lib/signals";
import {
  taskyApi,
  useTaskyAuth,
  useTaskyMutation,
  useTaskyQuery,
} from "@/lib/tasky";
import { colors, fontSize, radius, sharedStyles, spacing } from "@/lib/theme";

type SignalId = FunctionArgs<typeof taskyApi.signals.get>["signalId"];

function formatSigned(value: number): string {
  const formatted = formatSignalQuantity(Math.abs(value));
  return `${value >= 0 ? "+" : "-"}${formatted}`;
}

function entryTitle(entry: SignalEntry): string {
  switch (entry.operation.type) {
    case "activity.occurred":
      return "Activity recorded";
    case "inventory.adjusted":
      return `${formatSigned(entry.operation.amount)} adjustment`;
    case "inventory.set":
      return `Set to ${formatSignalQuantity(entry.operation.quantity)}`;
  }
}

function entryDetail(entry: SignalEntry): string | undefined {
  switch (entry.operation.type) {
    case "activity.occurred":
      return entry.operation.note;
    case "inventory.adjusted":
      return `Result: ${formatSignalQuantity(entry.operation.resultingQuantity)}`;
    case "inventory.set":
      return `Previously ${formatSignalQuantity(entry.operation.previousQuantity)}`;
  }
}

function parseLocalDateTime(value: string): number | null {
  const normalized = value.trim().replace(" ", "T");
  if (!normalized) return null;
  const parsed = new Date(normalized).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

export default function SignalHistoryPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ signalId?: string }>();
  const rawSignalId = Array.isArray(params.signalId)
    ? params.signalId[0]
    : params.signalId;
  const signalId = rawSignalId as SignalId | undefined;
  const taskyAuth = useTaskyAuth();
  const taskyEnabled =
    taskyAuth.isAuthenticated && taskyAuth.convexAuthenticated;
  const now = useSignalClock();
  const signal = useTaskyQuery(
    taskyApi.signals.get,
    taskyEnabled && signalId
      ? {
          signalId,
          now,
          soonWindowMs: SIGNAL_SOON_WINDOW_MS,
        }
      : "skip",
  );
  const history = useTaskyQuery(
    taskyApi.signals.history,
    taskyEnabled && signalId
      ? {
          signalId,
          paginationOpts: { numItems: 100, cursor: null },
        }
      : "skip",
  );
  const recordSignal = useTaskyMutation(taskyApi.signals.record);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backdatedAt, setBackdatedAt] = useState("");
  const [activityNote, setActivityNote] = useState("");
  const [inventoryValue, setInventoryValue] = useState("");

  useEffect(() => {
    if (
      signal.data?.model.kind === "inventory" &&
      inventoryValue.trim() === ""
    ) {
      const current =
        signal.data.evaluation.projectedQuantity ??
        signal.data.model.confirmedQuantity;
      setInventoryValue(formatSignalQuantity(current));
    }
  }, [inventoryValue, signal.data]);

  const record = async (
    operation:
      | {
          type: "activity.occurred";
          occurredAt?: number;
          note?: string;
        }
      | {
          type: "inventory.adjusted";
          amount: number;
        }
      | {
          type: "inventory.set";
          quantity: number;
        },
  ) => {
    if (!signalId) return;
    setIsSaving(true);
    setError(null);
    try {
      await recordSignal({
        signalId,
        idempotencyKey: createSignalIdempotencyKey("mobile-signal"),
        operation,
        soonWindowMs: SIGNAL_SOON_WINDOW_MS,
      });
      setBackdatedAt("");
      setActivityNote("");
      if (operation.type !== "activity.occurred") {
        setInventoryValue("");
      }
    } catch (recordError) {
      setError(
        recordError instanceof Error
          ? recordError.message
          : "Failed to record signal",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackdatedActivity = async () => {
    const occurredAt = parseLocalDateTime(backdatedAt);
    if (occurredAt === null) {
      setError("Use a local date and time such as 2026-08-23 09:30");
      return;
    }
    if (occurredAt > Date.now()) {
      setError("Activity time cannot be in the future");
      return;
    }
    await record({
      type: "activity.occurred",
      occurredAt,
      note: activityNote.trim() || undefined,
    });
  };

  const handleInventory = async (mode: "adjust" | "set") => {
    const value = Number(inventoryValue);
    if (!Number.isFinite(value)) {
      setError("Enter a valid number");
      return;
    }
    if (mode === "adjust") {
      if (value === 0) {
        setError("Adjustment must not be zero");
        return;
      }
      await record({ type: "inventory.adjusted", amount: value });
      return;
    }
    if (value < 0) {
      setError("Count must be zero or greater");
      return;
    }
    await record({ type: "inventory.set", quantity: value });
  };

  if (!signalId) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <Text style={sharedStyles.error}>Signal ID is missing.</Text>
      </View>
    );
  }

  if (!taskyEnabled || signal.isLoading) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <ActivityIndicator />
        <Text style={sharedStyles.muted}>Loading signal…</Text>
      </View>
    );
  }

  if (!signal.data) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <Text style={styles.emptyTitle}>Signal not found</Text>
        <Text style={sharedStyles.muted}>
          It may have been removed or belong to another account.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={sharedStyles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={sharedStyles.screen}
        contentContainerStyle={sharedStyles.screenContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.detailCard}>
          <SignalRow
            signal={signal.data}
            now={now}
            compact
            onPress={() => undefined}
          />
          <View style={styles.detailFooter}>
            <Text style={styles.detailReason}>
              {signal.data.evaluation.reason}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/signal_edit_page",
                  params: { signalId },
                } as unknown as Href)
              }
            >
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
          {signal.data.model.kind === "inventory" ? (
            <Text style={styles.confirmedText}>
              Last confirmed{" "}
              {new Date(signal.data.model.confirmedAt).toLocaleString()}
            </Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={sharedStyles.sectionTitle}>Record</Text>
          {signal.data.model.kind === "activity" ? (
            <View style={styles.actionCard}>
              <TouchableOpacity
                style={[styles.primaryButton, isSaving && styles.disabled]}
                onPress={() =>
                  void record({
                    type: "activity.occurred",
                    note: activityNote.trim() || undefined,
                  })
                }
                disabled={isSaving}
              >
                <Text style={styles.primaryButtonText}>
                  {isSaving ? "Saving…" : "Done now"}
                </Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={activityNote}
                onChangeText={setActivityNote}
                placeholder="Optional note"
                placeholderTextColor={colors.tertiaryLabel}
              />
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>Log an earlier time</Text>
              <TextInput
                style={styles.input}
                value={backdatedAt}
                onChangeText={setBackdatedAt}
                placeholder="YYYY-MM-DD HH:mm"
                placeholderTextColor={colors.tertiaryLabel}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.secondaryButton, isSaving && styles.disabled]}
                onPress={() => void handleBackdatedActivity()}
                disabled={isSaving}
              >
                <Text style={styles.secondaryButtonText}>Record earlier</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionCard}>
              <Text style={styles.fieldLabel}>
                Adjustment or confirmed count ({signal.data.model.unit})
              </Text>
              <TextInput
                style={styles.input}
                value={inventoryValue}
                onChangeText={setInventoryValue}
                placeholder="-1, +30, or exact count"
                placeholderTextColor={colors.tertiaryLabel}
                keyboardType="numbers-and-punctuation"
              />
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.secondaryButton, isSaving && styles.disabled]}
                  onPress={() => void handleInventory("adjust")}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Adjust by</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, isSaving && styles.disabled]}
                  onPress={() => void handleInventory("set")}
                  disabled={isSaving}
                >
                  <Text style={styles.primaryButtonText}>Set count</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                Setting the count reconciles any scheduled projection with a
                real count.
              </Text>
            </View>
          )}
        </View>

        {error || signal.error || history.error ? (
          <Text style={sharedStyles.error}>
            {error ?? signal.error ?? history.error}
          </Text>
        ) : null}

        <View style={styles.section}>
          <Text style={sharedStyles.sectionTitle}>History</Text>
          {history.isLoading ? (
            <View style={sharedStyles.inlineLoading}>
              <ActivityIndicator />
              <Text style={sharedStyles.muted}>Loading history…</Text>
            </View>
          ) : (history.data?.page.length ?? 0) === 0 ? (
            <View style={styles.emptyHistory}>
              <Text style={sharedStyles.muted}>No entries yet.</Text>
            </View>
          ) : (
            <View style={styles.historyCard}>
              {history.data?.page.map((entry, index) => (
                <View key={entry.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <View style={styles.historyRow}>
                    <View style={styles.historyMain}>
                      <Text style={styles.historyTitle}>
                        {entryTitle(entry)}
                      </Text>
                      {entryDetail(entry) ? (
                        <Text style={styles.historyDetail}>
                          {entryDetail(entry)}
                        </Text>
                      ) : null}
                      <Text style={styles.historyDate}>
                        {new Date(entry.effectiveAt).toLocaleString()}
                      </Text>
                    </View>
                    <Text style={styles.source}>{entry.source}</Text>
                  </View>
                </View>
              ))}
              {history.data && !history.data.isDone ? (
                <Text style={styles.historyLimit}>
                  Showing the latest 100 entries
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.label,
    fontSize: fontSize.subhead,
    fontWeight: "800",
  },
  detailCard: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  detailFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  detailReason: {
    flex: 1,
    color: colors.secondaryLabel,
    fontSize: fontSize.small,
  },
  editLink: {
    color: colors.systemBlue,
    fontSize: fontSize.body,
    fontWeight: "700",
  },
  confirmedText: {
    marginTop: spacing.sm,
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
  },
  section: {
    gap: spacing.sm,
  },
  actionCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  fieldLabel: {
    color: colors.secondaryLabel,
    fontSize: fontSize.small,
    fontWeight: "700",
  },
  input: {
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    borderRadius: radius.md,
    backgroundColor: colors.systemBackground,
    color: colors.label,
    fontSize: fontSize.body,
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
  },
  primaryButtonText: {
    color: "white",
    fontSize: fontSize.body,
    fontWeight: "800",
  },
  secondaryButton: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.tertiarySystemGroupedBackground,
  },
  secondaryButtonText: {
    color: colors.label,
    fontSize: fontSize.body,
    fontWeight: "700",
  },
  helpText: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
  historyCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  historyMain: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    color: colors.label,
    fontSize: fontSize.body,
    fontWeight: "700",
  },
  historyDetail: {
    color: colors.secondaryLabel,
    fontSize: fontSize.small,
  },
  historyDate: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
  },
  source: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.micro,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  historyLimit: {
    padding: spacing.md,
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
    textAlign: "center",
  },
  emptyHistory: {
    alignItems: "center",
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  disabled: {
    opacity: 0.45,
  },
});
