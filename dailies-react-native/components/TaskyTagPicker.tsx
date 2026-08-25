import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  sortTaskyTags,
  taskyTagPath,
  type TaskyTag,
  type TaskyTagId,
} from "@/lib/taskyTags";
import { colors, fontSize, radius, spacing } from "@/lib/theme";

export function TaskyTagPicker({
  tags,
  selectedTagIds,
  onChange,
  isLoading = false,
}: {
  tags: TaskyTag[];
  selectedTagIds: TaskyTagId[];
  onChange: (tagIds: TaskyTagId[]) => void;
  isLoading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const orderedTags = useMemo(() => sortTaskyTags(tags), [tags]);
  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [String(tag._id), tag])),
    [tags],
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleTags = orderedTags.filter(
    (tag) =>
      normalizedSearch === "" ||
      taskyTagPath(tag, tagsById)
        .toLocaleLowerCase()
        .includes(normalizedSearch),
  );

  const toggleTag = (tagId: TaskyTagId) => {
    const selected = selectedTagIds.includes(tagId);
    onChange(
      selected
        ? selectedTagIds.filter((selectedId) => selectedId !== tagId)
        : [...selectedTagIds, tagId],
    );
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>Tags</Text>
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" />
          <Text style={styles.helpText}>Loading Tasky tags…</Text>
        </View>
      ) : tags.length === 0 ? (
        <Text style={styles.helpText}>
          No Tasky tags yet. Create tags in Tasky to organize signals.
        </Text>
      ) : (
        <>
          <TextInput
            style={styles.search}
            value={search}
            onChangeText={setSearch}
            placeholder="Find a tag"
            placeholderTextColor={colors.tertiaryLabel}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.tags}>
            {visibleTags.map((tag) => {
              const selected = selectedTagIds.includes(tag._id);
              const color = tag.color ?? colors.systemGray;
              return (
                <TouchableOpacity
                  key={tag._id}
                  style={[
                    styles.tag,
                    { borderColor: color },
                    selected && styles.tagSelected,
                  ]}
                  onPress={() => toggleTag(tag._id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text
                    style={[styles.tagText, selected && styles.tagTextSelected]}
                  >
                    {taskyTagPath(tag, tagsById)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {visibleTags.length === 0 ? (
            <Text style={styles.helpText}>No matching tags.</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  label: {
    color: colors.secondaryLabel,
    fontSize: fontSize.small,
    fontWeight: "700",
  },
  search: {
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
  loading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.systemBackground,
  },
  tagSelected: {
    backgroundColor: colors.tertiarySystemGroupedBackground,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  tagText: {
    flexShrink: 1,
    color: colors.secondaryLabel,
    fontSize: fontSize.caption,
    fontWeight: "600",
  },
  tagTextSelected: {
    color: colors.label,
    fontWeight: "800",
  },
  helpText: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
});
