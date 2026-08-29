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
  const selectedTags = orderedTags.filter((tag) =>
    selectedTagIds.includes(tag._id),
  );
  const availableTags = orderedTags.filter(
    (tag) =>
      !selectedTagIds.includes(tag._id) &&
      (normalizedSearch === "" ||
        taskyTagPath(tag, tagsById)
          .toLocaleLowerCase()
          .includes(normalizedSearch)),
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
          <View style={styles.selection}>
            <View style={styles.selectionHeading}>
              <Text style={styles.selectionTitle}>
                Selected for this signal
              </Text>
              <Text style={styles.selectionCount}>{selectedTags.length}</Text>
            </View>
            {selectedTags.length === 0 ? (
              <Text style={styles.emptySelection}>No tags selected</Text>
            ) : (
              <View style={styles.selectedTags}>
                {selectedTags.map((tag) => {
                  const color = tag.color ?? colors.systemGray;
                  return (
                    <TouchableOpacity
                      key={tag._id}
                      style={styles.selectedTag}
                      onPress={() => toggleTag(tag._id)}
                      activeOpacity={0.7}
                      accessibilityLabel={`Remove ${taskyTagPath(tag, tagsById)}`}
                    >
                      <View style={[styles.dot, { backgroundColor: color }]} />
                      <Text style={styles.selectedTagText}>
                        {taskyTagPath(tag, tagsById)}
                      </Text>
                      <Text style={styles.removeTag}>×</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <Text style={styles.addLabel}>Add tags</Text>
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
            {availableTags.map((tag) => {
              const color = tag.color ?? colors.systemGray;
              return (
                <TouchableOpacity
                  key={tag._id}
                  style={styles.tag}
                  onPress={() => toggleTag(tag._id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.addTag}>+</Text>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.tagText}>
                    {taskyTagPath(tag, tagsById)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {availableTags.length === 0 ? (
            <Text style={styles.helpText}>
              {normalizedSearch === ""
                ? "All available tags are selected."
                : "No matching tags."}
            </Text>
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
  selection: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.systemBlue,
    borderRadius: radius.md,
    backgroundColor: colors.tertiarySystemGroupedBackground,
  },
  selectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectionTitle: {
    color: colors.label,
    fontSize: fontSize.caption,
    fontWeight: "800",
  },
  selectionCount: {
    minWidth: 22,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
    backgroundColor: colors.systemBlue,
    color: "white",
    fontSize: fontSize.micro,
    fontWeight: "800",
    textAlign: "center",
  },
  emptySelection: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
  },
  selectedTags: {
    gap: spacing.xs,
  },
  selectedTag: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.secondarySystemGroupedBackground,
  },
  selectedTagText: {
    flex: 1,
    color: colors.label,
    fontSize: fontSize.caption,
    fontWeight: "700",
  },
  removeTag: {
    color: colors.systemBlue,
    fontSize: fontSize.bodyLg,
    fontWeight: "700",
  },
  addLabel: {
    marginTop: spacing.xs,
    color: colors.secondaryLabel,
    fontSize: fontSize.caption,
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
    borderColor: colors.separator,
    borderRadius: radius.pill,
    backgroundColor: colors.systemBackground,
  },
  addTag: {
    color: colors.systemBlue,
    fontSize: fontSize.caption,
    fontWeight: "800",
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
  helpText: {
    color: colors.tertiaryLabel,
    fontSize: fontSize.caption,
    lineHeight: 17,
  },
});
