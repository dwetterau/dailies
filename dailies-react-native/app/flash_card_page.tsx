import { getTimeRangeForTimestamp } from "@/model/entities/entity_helpers";
import {
  getIsTimestampInTimeRange,
  useCurrentTimeRanges,
} from "@/model/time/timestamps";
import { api } from "@convex/_generated/api";
import { EntityId, ResetAfterInterval } from "@convex/entities";
import { FlashCard, ReviewStatus } from "@convex/flashCards";
import { EventType } from "@convex/events";
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
import FlashCardReviewButtons from "./flash_card_review_buttons";

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
    [currentTimestamp],
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
  }, [_currentEvent, currentEvent.timestamp, timeRange]);

  const remoteFlashCards = useQuery(api.flashCards.listCards);
  const [flashCards, setFlashCards] = useState<Array<FlashCard>>([]);

  // When we load cards from the server, add in new ones to the end of our current list.
  useEffect(() => {
    setFlashCards((prevFlashCards) => {
      const currentFlashCardIds = new Set(
        prevFlashCards.map((card) => card._id),
      );
      const newCards: Array<FlashCard> = [];

      for (const card of remoteFlashCards ?? []) {
        if (!currentFlashCardIds.has(card._id)) {
          newCards.push(card);
        }
      }
      if (newCards.length > 0) {
        return [...prevFlashCards, ...newCards];
      }
      return prevFlashCards;
    });
  }, [remoteFlashCards]);

  const saveFlashCards = useMutation(api.flashCards.startSaveReviewStatus);
  const loadFlashCards = useMutation(api.flashCards.startSyncCards);
  const upsertEvent = useMutation(api.events.upsertCurrentEvent);

  const handleLoad = useCallback(async () => {
    await loadFlashCards({});
  }, [loadFlashCards]);

  const handleSave = useCallback(async () => {
    const flashCardsToSave = flashCards
      .filter((card) => card.reviewStatus !== null)
      .map((card) => ({
        id: card._id,
        reviewStatus: card.reviewStatus!,
      }));
    const flashCardsToKeep = flashCards.filter(
      (card) => card.reviewStatus === null,
    );
    // Proactively remove the cards from our local copy,
    // since the server update will not know to remove them.
    setFlashCards(flashCardsToKeep);
    await saveFlashCards({ cards: flashCardsToSave });
    await upsertEvent(currentEvent);
  }, [flashCards, currentEvent, saveFlashCards, upsertEvent]);

  const currentCard = getFirstUnreviewedCard(flashCards ?? []);
  const handleSetCurrentCardReviewStatus = useCallback(
    (status: ReviewStatus) => {
      if (!currentCard) {
        throw new Error("No current card");
      }
      setFlashCards((prevCards) => {
        return prevCards.map((card) => {
          if (card._id === currentCard._id) {
            return {
              ...card,
              reviewStatus: status,
            };
          }
          return card;
        });
      });
      setCurrentEvent((prevEvent) => {
        const oldStatus = currentCard.reviewStatus;
        let numReviewedDelta = 0;
        let numCorrectDelta = 0;
        if (oldStatus === undefined) {
          // This is a weird race condition - where we didn't update a card, so don't update the status.
          return prevEvent;
        } else if (oldStatus === null) {
          numReviewedDelta = 1;
          if (status !== ReviewStatus.WRONG) {
            numCorrectDelta = 1;
          }
        } else {
          // TODO: This is a re-review case - we also need to advance the index in this case.
          const newIsCorrect = status !== ReviewStatus.WRONG;
          const oldIsCorrect = oldStatus !== ReviewStatus.WRONG;
          if (newIsCorrect && !oldIsCorrect) {
            numCorrectDelta = 1;
          } else if (!newIsCorrect && oldIsCorrect) {
            numCorrectDelta = -1;
          }
        }

        if (!getIsTimestampInTimeRange(prevEvent.timestamp, timeRange)) {
          return {
            entityId,
            // TODO: Make sure to update to the current timestamp if needed
            timestamp: 0,
            timeRange,
            details: {
              type: EventType.FLASH_CARDS,
              payload: {
                numReviewed: numReviewedDelta,
                numCorrect: Math.max(0, numCorrectDelta),
              },
            },
          };
        }
        return {
          entityId,
          timestamp: prevEvent.timestamp,
          timeRange,
          details: {
            type: EventType.FLASH_CARDS,
            payload: {
              numReviewed:
                prevEvent.details.payload.numReviewed + numReviewedDelta,
              numCorrect: Math.max(
                0,
                prevEvent.details.payload.numCorrect + numCorrectDelta,
              ),
            },
          },
        };
      });
    },
    [entityId, currentCard, timeRange],
  );

  // Setup the menu options
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
      <View style={{ padding: 20 }}>
        <FlashCardStatsHeader
          flashCards={flashCards ?? []}
          currentEvent={currentEvent}
        />
      </View>
      {currentCard && (
        <View style={{ paddingTop: 200, gap: 20 }}>
          <FlashCardView card={currentCard} />
          <FlashCardReviewButtons
            setCurrentCardReviewStatus={handleSetCurrentCardReviewStatus}
          />
        </View>
      )}
    </View>
  );
}

function getFirstUnreviewedCard(
  flashCards: Array<FlashCard>,
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
  const { numReviewed, numCorrect } = currentEvent.details.payload;
  const numToReview = flashCards.filter(
    (card) => card.reviewStatus === null,
  ).length;
  const correctPercentage = new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numReviewed === 0 ? 0 : numCorrect / numReviewed);

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text>{`${numToReview} to Review`}</Text>
      <Text>{`${numReviewed} reviewed - ${correctPercentage}`}</Text>
    </View>
  );
}
