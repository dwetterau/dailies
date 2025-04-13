import { getTimeRangeForTimestamp } from "@/model/entities/entity_helpers";
import { useCurrentTimeRanges } from "@/model/time/timestamps";
import { api } from "@convex/_generated/api";
import { EntityId, ResetAfterInterval } from "@convex/entities";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useLayoutEffect, useMemo } from "react";
import { TouchableOpacity, View, Text, PlatformColor } from "react-native";

export default function FlashCardPage() {
  const { entityId: _entityId } = useLocalSearchParams();
  const entityId = _entityId as EntityId;

  const { currentTimestamp } = useCurrentTimeRanges();
  const timeRange = useMemo(
    () => getTimeRangeForTimestamp(ResetAfterInterval.DAILY, currentTimestamp),
    [currentTimestamp]
  );

  const currentEvent = useQuery(api.events.getCurrentEvent, {
    entityId: entityId,
    timeRange,
  });

  const navigation = useNavigation();
  const flashCards = useQuery(api.flashCards.listCards);

  const handleLoad = useCallback(() => {}, []);

  const handleSave = useCallback(() => {}, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 30 }}>
          <TouchableOpacity onPress={handleLoad}>
            <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
              Load
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave}>
            <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  });

  return (
    <View>
      <Text>{flashCards?.length}</Text>
      <Text>{JSON.stringify(currentEvent)}</Text>
    </View>
  );
}
