import { useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet } from "react-native";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { EntityCategory } from "@convex/entities";
import EntityButton from "./entity_button";
import { useCurrentTimeRanges } from "@/model/time/timestamps";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 50, // Spacing from the top
    gap: 20,
  },
});

export default function CategoryPage() {
  const { category: _category } = useLocalSearchParams();
  const category = _category as EntityCategory;

  const { timeRanges } = useCurrentTimeRanges();
  const allEntities = useQuery(api.entities.list, { ...timeRanges });
  const entities = useMemo(
    () =>
      allEntities?.entities.filter((entity) => entity.category === category) ??
      [],
    [allEntities, category],
  );

  return (
    <FlatList
      data={entities}
      keyExtractor={(entity) => entity._id}
      renderItem={({ item: entity }) => (
        <EntityButton
          key={entity._id}
          entity={entity}
          completionRatio={
            allEntities?.entityIdToCompletionRatio[entity._id] ?? 0
          }
        />
      )}
      contentContainerStyle={styles.container}
    />
  );
}
