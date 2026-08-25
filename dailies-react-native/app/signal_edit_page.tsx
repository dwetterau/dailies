import type { FunctionArgs } from "convex/server";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { TaskyTagPicker } from "@/components/TaskyTagPicker";
import {
  getSignalPeriodBounds,
  SIGNAL_SOON_WINDOW_MS,
  useSignalClock,
} from "@/lib/signals";
import type { TaskyTagId } from "@/lib/taskyTags";
import {
  taskyApi,
  useTaskyAuth,
  useTaskyMutation,
  useTaskyQuery,
} from "@/lib/tasky";
import { colors, fontSize, radius, sharedStyles, spacing } from "@/lib/theme";

type SignalId = FunctionArgs<typeof taskyApi.signals.get>["signalId"];
type SignalKind = "activity" | "inventory";
type ActivityGoalMode = "tracking" | "daily" | "weekly";
type InventoryComparison = "atOrBelow" | "atOrAbove";

function NumberField({
  label,
  value,
  onChangeText,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, disabled && styles.disabledInput]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tertiaryLabel}
        keyboardType="decimal-pad"
        editable={!disabled}
      />
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.segment,
              selected && styles.segmentSelected,
              disabled && styles.controlDisabled,
            ]}
            onPress={() => onChange(option.value)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.segmentText,
                selected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SignalEditPage() {
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
  const periodBounds = getSignalPeriodBounds(now);
  const signal = useTaskyQuery(
    taskyApi.signals.get,
    taskyEnabled && signalId
      ? {
          signalId,
          now,
          soonWindowMs: SIGNAL_SOON_WINDOW_MS,
          periodBounds,
        }
      : "skip",
  );
  const tags = useTaskyQuery(taskyApi.tags.list, taskyEnabled ? {} : "skip");
  const createActivity = useTaskyMutation(taskyApi.signals.createActivity);
  const createInventory = useTaskyMutation(taskyApi.signals.createInventory);
  const updateActivity = useTaskyMutation(taskyApi.signals.updateActivity);
  const updateInventory = useTaskyMutation(taskyApi.signals.updateInventory);
  const setArchived = useTaskyMutation(taskyApi.signals.setArchived);

  const initialized = useRef(false);
  const [kind, setKind] = useState<SignalKind>("activity");
  const [name, setName] = useState("");
  const [tagIds, setTagIds] = useState<TaskyTagId[]>([]);
  const [activityGoalMode, setActivityGoalMode] =
    useState<ActivityGoalMode>("tracking");
  const [targetCount, setTargetCount] = useState("1");
  const [unit, setUnit] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("");
  const [thresholdValue, setThresholdValue] = useState("");
  const [comparison, setComparison] =
    useState<InventoryComparison>("atOrBelow");
  const [flowEnabled, setFlowEnabled] = useState(false);
  const [flowAmount, setFlowAmount] = useState("");
  const [flowEveryDays, setFlowEveryDays] = useState("1");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!signal.data || initialized.current) return;
    initialized.current = true;
    setName(signal.data.name);
    setTagIds(signal.data.tagIds);
    setKind(signal.data.model.kind);
    if (signal.data.model.kind === "activity") {
      const target = signal.data.model.target;
      if (target?.type === "period") {
        setActivityGoalMode(target.period === "day" ? "daily" : "weekly");
        setTargetCount(String(target.targetCount));
      } else {
        setActivityGoalMode("tracking");
      }
      return;
    }
    setUnit(signal.data.model.unit);
    setInitialQuantity(String(signal.data.model.confirmedQuantity));
    setThresholdValue(String(signal.data.model.threshold.value));
    setComparison(signal.data.model.threshold.comparison);
    setFlowEnabled(signal.data.model.flow !== undefined);
    setFlowAmount(String(signal.data.model.flow?.amount ?? ""));
    setFlowEveryDays(String(signal.data.model.flow?.everyDays ?? 1));
  }, [signal.data]);

  const handleSave = async () => {
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Name is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (kind === "activity") {
        let target:
          | {
              type: "period";
              period: "day" | "week";
              targetCount: number;
            }
          | undefined;
        if (activityGoalMode === "daily" || activityGoalMode === "weekly") {
          const parsedTargetCount = Number(targetCount);
          if (!Number.isInteger(parsedTargetCount) || parsedTargetCount <= 0) {
            throw new Error(
              "Completion target must be a positive whole number",
            );
          }
          target = {
            type: "period",
            period: activityGoalMode === "daily" ? "day" : "week",
            targetCount: parsedTargetCount,
          };
        }
        if (signalId) {
          await updateActivity({
            signalId,
            name: normalizedName,
            tagIds,
            target: target ?? null,
          });
          router.back();
          return;
        }
        const createdId = await createActivity({
          name: normalizedName,
          tagIds,
          target,
        });
        if (createdId) {
          router.replace({
            pathname: "/signal_history_page",
            params: { signalId: createdId },
          } as unknown as Href);
        }
        return;
      }

      const normalizedUnit = unit.trim();
      const parsedQuantity = Number(initialQuantity);
      const parsedThreshold = Number(thresholdValue);
      if (!normalizedUnit) {
        throw new Error("Unit is required");
      }
      if (
        (!signalId &&
          (!Number.isFinite(parsedQuantity) || parsedQuantity < 0)) ||
        !Number.isFinite(parsedThreshold) ||
        parsedThreshold < 0
      ) {
        throw new Error("Quantity and threshold must be zero or greater");
      }
      let flow:
        | {
            amount: number;
            everyDays: number;
          }
        | undefined;
      if (flowEnabled) {
        const amount = Number(flowAmount);
        const everyDays = Number(flowEveryDays);
        if (
          !Number.isFinite(amount) ||
          amount === 0 ||
          !Number.isFinite(everyDays) ||
          everyDays <= 0
        ) {
          throw new Error(
            "Scheduled amount must be non-zero and interval must be positive",
          );
        }
        flow = { amount, everyDays };
      }

      if (signalId) {
        await updateInventory({
          signalId,
          name: normalizedName,
          tagIds,
          unit: normalizedUnit,
          threshold: {
            value: parsedThreshold,
            comparison,
          },
          flow: flowEnabled ? flow : null,
        });
        router.back();
        return;
      }
      const createdId = await createInventory({
        name: normalizedName,
        tagIds,
        unit: normalizedUnit,
        initialQuantity: parsedQuantity,
        threshold: {
          value: parsedThreshold,
          comparison,
        },
        flow,
      });
      if (createdId) {
        router.replace({
          pathname: "/signal_history_page",
          params: { signalId: createdId },
        } as unknown as Href);
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save signal",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = () => {
    if (!signalId) return;
    Alert.alert(
      "Archive signal?",
      "Its history will be kept, but it will leave the dashboard.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setIsSaving(true);
              setError(null);
              try {
                await setArchived({ signalId, archived: true });
                router.dismissTo("/signals_page" as Href);
              } catch (archiveError) {
                setError(
                  archiveError instanceof Error
                    ? archiveError.message
                    : "Failed to archive signal",
                );
              } finally {
                setIsSaving(false);
              }
            })();
          },
        },
      ],
    );
  };

  if (!taskyEnabled) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <ActivityIndicator />
        <Text style={sharedStyles.muted}>Preparing Tasky…</Text>
      </View>
    );
  }

  if (signalId && signal.isLoading) {
    return (
      <View style={[sharedStyles.screen, styles.center]}>
        <ActivityIndicator />
        <Text style={sharedStyles.muted}>Loading signal…</Text>
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
        <View style={styles.section}>
          <Text style={sharedStyles.sectionTitle}>Type</Text>
          <Segmented
            value={kind}
            onChange={setKind}
            disabled={Boolean(signalId)}
            options={[
              { value: "activity", label: "Activity" },
              { value: "inventory", label: "Inventory" },
            ]}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={kind === "activity" ? "Run" : "Prescription name"}
              placeholderTextColor={colors.tertiaryLabel}
            />
          </View>
          <TaskyTagPicker
            tags={tags.data ?? []}
            selectedTagIds={tagIds}
            onChange={setTagIds}
            isLoading={tags.isLoading}
          />
        </View>

        {kind === "activity" ? (
          <View style={styles.section}>
            <Text style={sharedStyles.sectionTitle}>Goal</Text>
            <View style={styles.card}>
              <Segmented
                value={activityGoalMode}
                onChange={setActivityGoalMode}
                options={[
                  { value: "tracking", label: "Tracking only" },
                  { value: "daily", label: "Daily" },
                  { value: "weekly", label: "Weekly" },
                ]}
              />
              {activityGoalMode === "daily" || activityGoalMode === "weekly" ? (
                <>
                  <NumberField
                    label={`Completions per ${
                      activityGoalMode === "daily" ? "day" : "week"
                    }`}
                    value={targetCount}
                    onChangeText={setTargetCount}
                    placeholder="1"
                  />
                  <Text style={styles.helpText}>
                    Progress resets at the start of each local{" "}
                    {activityGoalMode === "daily" ? "day" : "week"}.
                  </Text>
                </>
              ) : (
                <Text style={styles.helpText}>
                  Records history without marking the activity due.
                </Text>
              )}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={sharedStyles.sectionTitle}>Inventory</Text>
              <View style={styles.card}>
                <View style={styles.field}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder="pills"
                    placeholderTextColor={colors.tertiaryLabel}
                  />
                </View>
                <NumberField
                  label={
                    signalId
                      ? "Current confirmed quantity"
                      : "Starting quantity"
                  }
                  value={initialQuantity}
                  onChangeText={setInitialQuantity}
                  placeholder="60"
                  disabled={Boolean(signalId)}
                />
                <NumberField
                  label="Action threshold"
                  value={thresholdValue}
                  onChangeText={setThresholdValue}
                  placeholder="14"
                />
                <Segmented
                  value={comparison}
                  onChange={setComparison}
                  options={[
                    { value: "atOrBelow", label: "At or below" },
                    { value: "atOrAbove", label: "At or above" },
                  ]}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeadingRow}>
                <Text style={sharedStyles.sectionTitle}>Scheduled flow</Text>
                <TouchableOpacity
                  style={[styles.toggle, flowEnabled && styles.toggleEnabled]}
                  onPress={() => setFlowEnabled((enabled) => !enabled)}
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      flowEnabled && styles.toggleKnobEnabled,
                    ]}
                  />
                </TouchableOpacity>
              </View>
              {flowEnabled ? (
                <View style={styles.card}>
                  <NumberField
                    label="Amount each interval"
                    value={flowAmount}
                    onChangeText={setFlowAmount}
                    placeholder="-1 drains, +1 fills"
                  />
                  <NumberField
                    label="Every days"
                    value={flowEveryDays}
                    onChangeText={setFlowEveryDays}
                    placeholder="1"
                  />
                  <Text style={styles.helpText}>
                    Counts are projected. Use Set count on the detail screen to
                    reconcile with a real count.
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}

        {error || signal.error || tags.error ? (
          <Text style={sharedStyles.error}>
            {error ?? signal.error ?? tags.error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.controlDisabled]}
          onPress={() => void handleSave()}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving…" : signalId ? "Save changes" : "Create signal"}
          </Text>
        </TouchableOpacity>

        {signalId ? (
          <TouchableOpacity
            style={styles.archiveButton}
            onPress={handleArchive}
            disabled={isSaving}
          >
            <Text style={styles.archiveButtonText}>Archive signal</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
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
  disabledInput: {
    color: colors.secondaryLabel,
    backgroundColor: colors.tertiarySystemGroupedBackground,
  },
  segmented: {
    flexDirection: "row",
    gap: 2,
    padding: 2,
    borderRadius: radius.md,
    backgroundColor: colors.tertiarySystemGroupedBackground,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  segmentSelected: {
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  segmentText: {
    color: colors.secondaryLabel,
    fontSize: fontSize.small,
    fontWeight: "700",
  },
  segmentTextSelected: {
    color: colors.label,
  },
  helpText: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
  toggle: {
    width: 48,
    height: 28,
    padding: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.systemGray,
  },
  toggleEnabled: {
    backgroundColor: colors.systemGreen,
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: "white",
  },
  toggleKnobEnabled: {
    alignSelf: "flex-end",
  },
  saveButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
  },
  saveButtonText: {
    color: "white",
    fontSize: fontSize.bodyLg,
    fontWeight: "800",
  },
  archiveButton: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  archiveButtonText: {
    color: colors.systemRed,
    fontSize: fontSize.body,
    fontWeight: "700",
  },
  controlDisabled: {
    opacity: 0.45,
  },
});
