import { getTimeRangeForTimestamp } from "@/model/entities/entity_helpers";
import { useCurrentTimeRanges } from "@/model/time/timestamps";
import { api } from "@convex/_generated/api";
import { EntityId, ResetAfterInterval } from "@convex/entities";
import { FlashCard, ReviewStatus } from "@convex/flashCards";
import { Event, EventType } from "@convex/events";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { TouchableOpacity, View, Text, PlatformColor } from "react-native";

type EventForUpsert = {
  entityId: EntityId;
  timestamp: number;
  details: {
    type: EventType.FLASH_CARDS;
    payload: {
      numReviewed: number;
      numCorrect: number;
    };
  };
};

export default function FlashCardPage() {
  const navigation = useNavigation();
  const { entityId: _entityId } = useLocalSearchParams();
  const entityId = _entityId as EntityId;

  const { currentTimestamp } = useCurrentTimeRanges();
  const timeRange = useMemo(
    () => getTimeRangeForTimestamp(ResetAfterInterval.DAILY, currentTimestamp),
    [currentTimestamp]
  );

  const _currentEvent = useQuery(api.events.getCurrentEvent, {
    entityId: entityId,
    timeRange,
  });
  const [currentEvent, setCurrentEvent] = useState<EventForUpsert>({
    entityId,
    // TODO: Make sure to update to the current timestamp if needed
    timestamp: 0,
    details: {
      type: EventType.FLASH_CARDS,
      payload: {
        numReviewed: 0,
        numCorrect: 0,
      },
    },
  });

  useEffect(() => {
    if (
      _currentEvent &&
      _currentEvent.details.type === EventType.FLASH_CARDS &&
      _currentEvent.timestamp > currentEvent.timestamp
    ) {
      setCurrentEvent(_currentEvent as EventForUpsert);
    }
  }, [_currentEvent]);

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
      <FlashCardStatsHeader
        flashCards={flashCards ?? []}
        currentEvent={currentEvent}
      />
      <Text>{JSON.stringify(currentEvent)}</Text>
    </View>
  );
}

function FlashCardStatsHeader({
  flashCards,
  currentEvent,
}: {
  flashCards: Array<FlashCard>;
  currentEvent: EventForUpsert;
}) {
  const totalCards = flashCards.length;
  const { numReviewed, numCorrect } = currentEvent.details.payload;
  const correctPercentage = new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numReviewed === 0 ? 0 : numCorrect / numReviewed);

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text>{`${totalCards} loaded`}</Text>
      <Text>{`${numReviewed} reviewed - ${correctPercentage}`}</Text>
    </View>
  );
}
