import { api } from "@convex/_generated/api";
import { EntityCategory } from "@convex/entities";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import CategoryButton from "./category_button";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 100, // Spacing from the top
    gap: 20,
  },
  title: {
    fontSize: 40,
    marginBottom: 40,
    fontWeight: "bold",
    color: "black",
    fontFamily: "System", // Rounded design equivalent
  },
});

const ORDERED_CATEGORIES: Array<EntityCategory> = [
  EntityCategory.LEARNING,
  EntityCategory.CARE,
  EntityCategory.EXERCISE,
  EntityCategory.TIDYING,
  EntityCategory.THINKING,
];

export default function EntityList() {
  const entities = useQuery(api.entities.list, {});

  const categoryToEntities = useMemo(() => {
    const categoryToEntities = new Map<string, Array<Doc<"entities">>>();
    entities?.entities.forEach((entity) => {
      if (!categoryToEntities.has(entity.category)) {
        categoryToEntities.set(entity.category, []);
      }
      categoryToEntities.get(entity.category)!.push(entity);
    });
    return categoryToEntities;
  }, [entities]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dailies 2</Text>
      {ORDERED_CATEGORIES.filter((category) =>
        categoryToEntities.has(category)
      ).map((category) => (
        <CategoryButton
          key={category}
          category={category}
          entities={categoryToEntities.get(category)!}
        />
      ))}
    </View>
  );
}
