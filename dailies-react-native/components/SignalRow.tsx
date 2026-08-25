import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ColorValue,
} from "react-native";
import {
  signalPrimaryText,
  signalSecondaryText,
  type SignalDashboardItem,
} from "@/lib/signals";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

type SignalAttention = SignalDashboardItem["evaluation"]["attention"];

const ATTENTION_LABELS: Record<SignalAttention, string> = {
  due: "Due",
  soon: "Soon",
  unknown: "Unknown",
  ok: "OK",
};

export function signalAttentionColor(attention: SignalAttention): ColorValue {
  switch (attention) {
    case "due":
      return colors.systemRed;
    case "soon":
      return colors.systemOrange;
    case "unknown":
      return colors.systemGray;
    case "ok":
      return colors.systemGreen;
  }
}

export function SignalRow({
  signal,
  now,
  onPress,
  onQuickAction,
  quickActionLabel,
  isSaving,
  compact = false,
}: {
  signal: SignalDashboardItem;
  now: number;
  onPress: () => void;
  onQuickAction?: () => void;
  quickActionLabel?: string;
  isSaving?: boolean;
  compact?: boolean;
}) {
  const attentionColor = signalAttentionColor(signal.evaluation.attention);

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View
        style={[styles.attentionBar, { backgroundColor: attentionColor }]}
      />
      <TouchableOpacity
        style={styles.main}
        activeOpacity={0.65}
        onPress={onPress}
      >
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {signal.name}
          </Text>
          <Text style={[styles.attention, { color: attentionColor }]}>
            {ATTENTION_LABELS[signal.evaluation.attention]}
          </Text>
        </View>
        <Text style={styles.primary}>{signalPrimaryText(signal, now)}</Text>
        <View style={styles.metaRow}>
          {signal.tags.slice(0, 2).map((tag) => (
            <View key={tag.id} style={styles.tag}>
              <View
                style={[
                  styles.tagDot,
                  {
                    backgroundColor: tag.color ?? colors.systemGray,
                  },
                ]}
              />
              <Text style={styles.tagText}>{tag.name}</Text>
            </View>
          ))}
          {signal.tags.length > 2 ? (
            <Text style={styles.tagMore}>+{signal.tags.length - 2}</Text>
          ) : null}
          <Text style={styles.secondary}>
            {signalSecondaryText(signal, now)}
          </Text>
        </View>
      </TouchableOpacity>
      {onQuickAction && quickActionLabel ? (
        <TouchableOpacity
          style={[styles.quickAction, isSaving && styles.disabled]}
          onPress={onQuickAction}
          disabled={isSaving}
          activeOpacity={0.7}
        >
          <Text style={styles.quickActionText}>
            {isSaving ? "…" : quickActionLabel}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.chevron}>{"›"}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  rowCompact: {
    minHeight: 76,
    paddingHorizontal: 0,
    backgroundColor: "transparent",
  },
  attentionBar: {
    width: 4,
    height: 38,
    borderRadius: radius.pill,
  },
  main: {
    flex: 1,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    color: colors.label,
    fontSize: fontSize.body,
    fontWeight: "700",
  },
  attention: {
    fontSize: fontSize.micro,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  primary: {
    color: colors.label,
    fontSize: fontSize.small,
    fontVariant: ["tabular-nums"],
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  tagDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
  },
  tagText: {
    color: colors.secondaryLabel,
    fontSize: fontSize.micro,
    fontWeight: "700",
  },
  tagMore: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.micro,
    fontWeight: "700",
  },
  secondary: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
  },
  quickAction: {
    minWidth: 54,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.systemBlue,
    alignItems: "center",
  },
  quickActionText: {
    color: "white",
    fontSize: fontSize.caption,
    fontWeight: "800",
  },
  chevron: {
    color: colors.tertiaryLabel,
    fontSize: 24,
    fontWeight: "300",
  },
  disabled: {
    opacity: 0.45,
  },
});
