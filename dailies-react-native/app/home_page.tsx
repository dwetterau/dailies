import { api } from "@convex/_generated/api";
import { Entity, EntityCategory } from "@convex/entities";
import { useQuery } from "convex/react";
import { useCallback, useLayoutEffect, useMemo } from "react";
import {
  PlatformColor,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import {
  getCategoryCompletionRatio,
  getColorForCategory,
  getDisplayNameForCategory,
} from "@/model/entities/category_helpers";
import BigButton from "./big_button";
import { useCurrentTimeRanges } from "@/model/time/timestamps";
import { useAuth0 } from "react-native-auth0";
import { head } from "lodash";

export const HOME_PAGE_STYLES = StyleSheet.create({
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

export default function HomePage() {
  const { clearCredentials } = useAuth0();
  const router = useRouter();
  const navigation = useNavigation();

  const { timeRanges } = useCurrentTimeRanges();
  const entities = useQuery(api.entities.list, { ...timeRanges });

  const categoryToEntities = useMemo(() => {
    const categoryToEntities = new Map<string, Array<Entity>>();
    entities?.entities.forEach((entity) => {
      if (!categoryToEntities.has(entity.category)) {
        categoryToEntities.set(entity.category, []);
      }
      categoryToEntities.get(entity.category)!.push(entity);
    });
    return categoryToEntities;
  }, [entities]);

  const handleLogout = useCallback(() => {
    clearCredentials();
  }, [clearCredentials]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "",
      headerRight: () => {
        return (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/entity_edit_page",
              });
            }}
          >
            <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
              New
            </Text>
          </TouchableOpacity>
        );
      },
    });
  }, [navigation, router]);

  return (
    <View style={HOME_PAGE_STYLES.container}>
      <Text style={HOME_PAGE_STYLES.title}>Dailies 2</Text>
      {ORDERED_CATEGORIES.filter((category) =>
        categoryToEntities.has(category),
      ).map((category) => (
        <BigButton
          key={category}
          buttonText={getDisplayNameForCategory(category)}
          buttonCompleteColor={getColorForCategory(category)}
          completionRatio={getCategoryCompletionRatio(
            entities?.entities ?? [],
            entities?.entityIdToCompletionRatio ?? {},
            category,
          )}
          onPress={() => {
            router.push({
              pathname: "/category_page",
              params: { category },
            });
          }}
        />
      ))}
      <TouchableOpacity onPress={handleLogout} style={{ marginTop: 20 }}>
        <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
          Logout
        </Text>
      </TouchableOpacity>
    </View>
  );
}
