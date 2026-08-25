import { type Href, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SignalRow } from "@/components/SignalRow";
import {
  createSignalIdempotencyKey,
  getSignalPeriodBounds,
  SIGNAL_SOON_WINDOW_MS,
  type SignalDashboardItem,
  useSignalClock,
} from "@/lib/signals";
import { sortTaskyTags, taskyTagPath, type TaskyTagId } from "@/lib/taskyTags";
import {
  taskyApi,
  useTaskyAuth,
  useTaskyMutation,
  useTaskyQuery,
} from "@/lib/tasky";
import { colors, fontSize, radius, sharedStyles, spacing } from "@/lib/theme";

type SignalAttention = SignalDashboardItem["evaluation"]["attention"];

const ATTENTION_ORDER: SignalAttention[] = ["due", "soon", "unknown", "ok"];
const ATTENTION_TITLES: Record<SignalAttention, string> = {
  due: "Due",
  soon: "Coming up",
  unknown: "Needs a first entry",
  ok: "On track",
};

function signalDetailsRoute(signalId: string) {
  return {
    pathname: "/signal_history_page" as const,
    params: { signalId },
  } as unknown as Href;
}

export default function SignalsPage() {
  const router = useRouter();
  const taskyAuth = useTaskyAuth();
  const now = useSignalClock();
  const periodBounds = getSignalPeriodBounds(now);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<TaskyTagId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taskyEnabled =
    taskyAuth.isAuthenticated && taskyAuth.convexAuthenticated;
  const signals = useTaskyQuery(
    taskyApi.signals.listDashboard,
    taskyEnabled
      ? {
          now,
          soonWindowMs: SIGNAL_SOON_WINDOW_MS,
          periodBounds,
          ...(selectedTagId === null ? {} : { tagId: selectedTagId }),
        }
      : "skip",
  );
  const tags = useTaskyQuery(taskyApi.tags.list, taskyEnabled ? {} : "skip");
  const recordSignal = useTaskyMutation(taskyApi.signals.record);
  const orderedTags = useMemo(
    () => sortTaskyTags(tags.data ?? []),
    [tags.data],
  );
  const tagsById = useMemo(
    () =>
      new Map((tags.data ?? []).map((tag) => [String(tag._id), tag] as const)),
    [tags.data],
  );
  useEffect(() => {
    if (
      selectedTagId !== null &&
      tags.data &&
      !tags.data.some((tag) => tag._id === selectedTagId)
    ) {
      setSelectedTagId(null);
    }
  }, [selectedTagId, tags.data]);

  const grouped = useMemo(() => {
    const result: Array<{
      attention: SignalAttention;
      items: SignalDashboardItem[];
    }> = [];
    for (const attention of ATTENTION_ORDER) {
      const matching = (signals.data ?? []).filter(
        (signal) => signal.evaluation.attention === attention,
      );
      if (matching.length === 0) continue;
      result.push({
        attention,
        items: matching,
      });
    }
    return result;
  }, [signals.data]);

  const openSignal = (signalId: string) => {
    router.push(signalDetailsRoute(signalId));
  };

  const handleQuickAction = async (signal: SignalDashboardItem) => {
    if (signal.model.kind === "inventory") {
      openSignal(signal.id);
      return;
    }
    setSavingId(signal.id);
    setError(null);
    try {
      await recordSignal({
        signalId: signal.id,
        idempotencyKey: createSignalIdempotencyKey("mobile-activity"),
        operation: { type: "activity.occurred" },
        soonWindowMs: SIGNAL_SOON_WINDOW_MS,
        periodBounds,
      });
    } catch (recordError) {
      setError(
        recordError instanceof Error
          ? recordError.message
          : "Failed to record activity",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (!taskyAuth.isAuthenticated) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <View style={sharedStyles.card}>
          <Text style={styles.emptyTitle}>Connect Tasky for signals</Text>
          <Text style={sharedStyles.muted}>
            Signals use your existing Tasky account so they are also available
            to approved MCP clients.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/settings_page")}
          >
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={sharedStyles.screen}
      contentContainerStyle={sharedStyles.screenContent}
    >
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderText}>
          <Text style={styles.pageTitle}>Life signals</Text>
          <Text style={sharedStyles.muted}>
            Activities and inventories ordered by when they need attention.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push("/signal_edit_page" as Href)}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {orderedTags.length > 0 ? (
        <View style={styles.filters}>
          <Text style={sharedStyles.sectionTitle}>Filter by tag</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedTagId === null && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedTagId(null)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedTagId === null && styles.filterChipTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {orderedTags.map((tag) => {
              const selected = selectedTagId === tag._id;
              return (
                <TouchableOpacity
                  key={tag._id}
                  style={[
                    styles.filterChip,
                    selected && styles.filterChipSelected,
                  ]}
                  onPress={() => setSelectedTagId(tag._id)}
                >
                  <View
                    style={[
                      styles.filterDot,
                      {
                        backgroundColor: tag.color ?? colors.systemGray,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      selected && styles.filterChipTextSelected,
                    ]}
                  >
                    {taskyTagPath(tag, tagsById)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {!taskyEnabled || signals.isLoading ? (
        <View style={sharedStyles.inlineLoading}>
          <ActivityIndicator />
          <Text style={sharedStyles.muted}>Loading signals…</Text>
        </View>
      ) : grouped.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No signals yet</Text>
          <Text style={sharedStyles.muted}>
            Add an activity such as running, or an inventory such as a
            prescription.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push("/signal_edit_page" as Href)}
          >
            <Text style={styles.primaryButtonText}>Create first signal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        grouped.map((attentionGroup) => (
          <View key={attentionGroup.attention} style={styles.attentionGroup}>
            <Text style={sharedStyles.sectionTitle}>
              {ATTENTION_TITLES[attentionGroup.attention]}
            </Text>
            <View style={styles.listCard}>
              {attentionGroup.items.map((signal, index) => (
                <View key={signal.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <SignalRow
                    signal={signal}
                    now={now}
                    onPress={() => openSignal(signal.id)}
                    onQuickAction={() => void handleQuickAction(signal)}
                    quickActionLabel={
                      signal.model.kind === "activity" ? "Done" : "Update"
                    }
                    isSaving={savingId === signal.id}
                  />
                </View>
              ))}
            </View>
          </View>
        ))
      )}

      {(error || taskyAuth.error || signals.error || tags.error) && (
        <Text style={sharedStyles.error}>
          {error ?? taskyAuth.error ?? signals.error ?? tags.error}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    padding: spacing.xl,
    justifyContent: "center",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pageHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  pageTitle: {
    color: colors.label,
    fontSize: fontSize.title,
    fontWeight: "800",
  },
  addButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
  },
  addButtonText: {
    color: "white",
    fontSize: fontSize.body,
    fontWeight: "800",
  },
  attentionGroup: {
    gap: spacing.md,
  },
  filters: {
    gap: spacing.sm,
  },
  filterRow: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.separator,
    borderRadius: radius.pill,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  filterChipSelected: {
    borderColor: colors.systemBlue,
    backgroundColor: colors.systemBlue,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  filterChipText: {
    color: colors.secondaryLabel,
    fontSize: fontSize.caption,
    fontWeight: "700",
  },
  filterChipTextSelected: {
    color: "white",
  },
  listCard: {
    overflow: "hidden",
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xl,
    backgroundColor: colors.separator,
  },
  emptyState: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    color: colors.label,
    fontSize: fontSize.subhead,
    fontWeight: "800",
  },
  primaryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
  },
  primaryButtonText: {
    color: "white",
    fontSize: fontSize.body,
    fontWeight: "800",
  },
});
