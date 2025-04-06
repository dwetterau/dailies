import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import BigButton from "./big_button";
import { getColorForCategory } from "@/model/entities/category_helpers";
import { EntityCategory } from "@convex/entities";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 100, // Spacing from the top
    gap: 20,
  },
});

export default function CategoryPage() {
  const { category: _category } = useLocalSearchParams();
  const category = _category as EntityCategory;
  const allEntities = useQuery(api.entities.list, {});
  const entities = useMemo(
    () =>
      allEntities?.entities.filter((entity) => entity.category === category),
    [allEntities, category]
  );

  return (
    <View style={styles.container}>
      {entities?.map((entity) => (
        <BigButton
          key={entity._id}
          buttonText={entity.name}
          buttonCompleteColor={getColorForCategory(category)}
          completionRatio={
            allEntities?.entityIdToCompletionRatio[entity._id] ?? 0
          }
          onPress={() => {
            console.log("pushed", entity);
          }}
        />
      ))}
    </View>
  );
}
