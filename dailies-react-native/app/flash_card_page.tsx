import { getTimeRangeForTimestamp } from "@/model/entities/entity_helpers";
import { useCurrentTimeRanges } from "@/model/time/timestamps";
import { api } from "@convex/_generated/api";
import { EntityId, ResetAfterInterval } from "@convex/entities";
import { FlashCard, ReviewStatus } from "@convex/flashCards";
import { Event, EventType } from "@convex/events";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { TouchableOpacity, View, Text, PlatformColor } from "react-native";
import FlashCardView from "./flash_card";

type EventForUpsert = {
  entityId: EntityId;
  timestamp: number;
  timeRange: {
    startTimestamp: number;
    endTimestamp: number;
  };
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
    timeRange,
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
      _currentEvent.timestamp >= timeRange.startTimestamp &&
      _currentEvent.timestamp <= timeRange.endTimestamp &&
      _currentEvent.timestamp > currentEvent.timestamp
    ) {
      setCurrentEvent({
        ..._currentEvent,
        timeRange,
      } as EventForUpsert);
    }
  }, [_currentEvent, timeRange]);

  const flashCards = useQuery(api.flashCards.listCards);

  const saveFlashCards = useMutation(api.flashCards.startSaveReviewStatus);
  const upsertEvent = useMutation(api.events.upsertCurrentEvent);

  const handleLoad = useCallback(async () => {
    // TODO: Handle loading
  }, []);

  const handleSave = useCallback(async () => {
    await saveFlashCards({
      cards: (flashCards ?? [])
        .filter((card) => card.reviewStatus !== null)
        .map((card) => ({
          id: card._id,
          reviewStatus: card.reviewStatus!,
        })),
    });
    await upsertEvent(currentEvent);
  }, [flashCards, currentEvent, saveFlashCards, upsertEvent]);

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

  const currentCard = getFirstUnreviewedCard(flashCards ?? []);
  return (
    <View>
      <FlashCardStatsHeader
        flashCards={flashCards ?? []}
        currentEvent={currentEvent}
      />
      {currentCard && <FlashCardView card={currentCard} />}
    </View>
  );
}

function getFirstUnreviewedCard(
  flashCards: Array<FlashCard>
): FlashCard | null {
  for (const card of flashCards) {
    if (card.reviewStatus === null) {
      return card;
    }
  }
  return null;
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
