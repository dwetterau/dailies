import { api } from "@convex/_generated/api";
import { Entity, EntityCategory } from "@convex/entities";
import { useQuery } from "convex/react";
import { useCallback, useLayoutEffect, useMemo } from "react";
import {
  PlatformColor,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { useNavigation, useRouter } from "expo-router";
import { automaticKeyboardInsets, iosHeaderTextItems } from "@/lib/headerItems";
import {
  getCategoryCompletionRatio,
  getColorForCategory,
  getDisplayNameForCategory,
} from "@/model/entities/category_helpers";
import BigButton from "./big_button";
import { useCurrentTimeRanges } from "@/model/time/timestamps";
import { useAuth0 } from "react-native-auth0";
import LoadingScreen from "./loading_screen";

export const DAILIES_PAGE_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: "center",
    paddingTop: 70,
    paddingBottom: 40,
    gap: 20,
  },
  title: {
    fontSize: 40,
    marginBottom: 40,
    fontWeight: "bold",
    color: "black",
    fontFamily: "System",
  },
});

const ORDERED_CATEGORIES: Array<EntityCategory> = [
  EntityCategory.LEARNING,
  EntityCategory.CARE,
  EntityCategory.EXERCISE,
  EntityCategory.TIDYING,
  EntityCategory.THINKING,
];

export default function DailiesPage() {
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
      unstable_headerRightItems: () =>
        iosHeaderTextItems([
          {
            label: "New",
            onPress: () => {
              router.push({
                pathname: "/entity_edit_page",
              });
            },
          },
        ]),
    });
  }, [navigation, router]);

  if (entities === undefined) {
    return <LoadingScreen message="Loading activities..." />;
  }

  return (
    <ScrollView
      style={DAILIES_PAGE_STYLES.container}
      contentContainerStyle={DAILIES_PAGE_STYLES.content}
      {...automaticKeyboardInsets}
    >
      <Text style={DAILIES_PAGE_STYLES.title}>Dailies</Text>
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
    </ScrollView>
  );
}
