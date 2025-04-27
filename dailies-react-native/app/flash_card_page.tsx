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
import {
  getFlashCardsFromStorage,
  getGenericObject,
  saveFlashCardsToStorage,
  saveGenericObject,
} from "./storage";

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

  const currentEventFromServer = useQuery(api.events.getCurrentEvent, {
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
    const localCurrentEvent =
      getGenericObject<EventForUpsert>("flashCardEvent");
    if (!localCurrentEvent) {
      return;
    }
    console.log("Loaded current event from storage", localCurrentEvent);
    setCurrentEvent((prevCurrentEvent) => {
      if (
        localCurrentEvent.timestamp > prevCurrentEvent.timestamp &&
        getIsTimestampInTimeRange(
          localCurrentEvent.timestamp,
          prevCurrentEvent.timeRange,
        )
      ) {
        console.log("Local current event is in range, and newer. Using it.");
        return localCurrentEvent;
      }
      // TODO: If we had an old event, that wasn't saved to the server, we might some day want to save it.
      return prevCurrentEvent;
    });
  }, []);

  useEffect(() => {
    if (
      !currentEventFromServer ||
      currentEventFromServer.details.type !== EventType.FLASH_CARDS
    ) {
      return;
    }
    setCurrentEvent((prevCurrentEvent) => {
      if (
        currentEventFromServer.timestamp >= prevCurrentEvent.timestamp &&
        getIsTimestampInTimeRange(
          currentEventFromServer.timestamp,
          prevCurrentEvent.timeRange,
        )
      ) {
        console.log("Server current event is in range, and newer. Using it.");
        return {
          ...currentEventFromServer,
          timeRange,
        } as EventForUpsert;
      }
      return prevCurrentEvent;
    });
  }, [currentEventFromServer, timeRange]);

  useEffect(() => {
    if (currentEvent && currentEvent.timestamp > 0) {
      console.log("Saving current event to storage", currentEvent);
      saveGenericObject("flashCardEvent", currentEvent);
    }
  }, [currentEvent]);

  const remoteFlashCards = useQuery(api.flashCards.listCards);
  const [flashCards, setFlashCards] = useState<Array<FlashCard> | null>(null);

  // When we first load, grab the cards from storage if they exist.
  useEffect(() => {
    const flashCardsFromStorage = getFlashCardsFromStorage();
    if (flashCardsFromStorage.length > 0) {
      console.log(
        "Loaded flash cards from storage",
        flashCardsFromStorage.length,
      );
      // If we already have some flash cards, such as those from the server, we don't want to overwrite them.
      setFlashCards((prevFlashCards) => {
        if (prevFlashCards?.length ?? 0 > 0) {
          console.log("Ignoring flash cards from storage");
          return prevFlashCards;
        }
        console.log("Setting flash cards from storage");
        return flashCardsFromStorage;
      });
    }
    // We only want to run this once when we first load the page.
  }, []);

  // When we load cards from the server, they become the default - but we want to copy over our statuses.
  useEffect(() => {
    console.log("Loaded flash cards from server", remoteFlashCards?.length);
    if (!remoteFlashCards) {
      return;
    }
    setFlashCards((prevFlashCards) => {
      const currentFlashCardIdsToStatus = new Map(
        (prevFlashCards ?? []).map((card) => [card._id, card.reviewStatus]),
      );
      return remoteFlashCards.map((card) => {
        if (currentFlashCardIdsToStatus.has(card._id)) {
          return {
            ...card,
            reviewStatus: currentFlashCardIdsToStatus.get(card._id)!,
          };
        }
        return card;
      });
    });
  }, [remoteFlashCards]);

  // Whenever we change our flashCards, proactively save them to storage.
  useEffect(() => {
    if (!flashCards) {
      return;
    }
    console.log("Saving flash cards to storage", flashCards.length);
    saveFlashCardsToStorage(flashCards);
  }, [flashCards]);

  const saveFlashCards = useMutation(api.flashCards.startSaveReviewStatus);
  const loadFlashCards = useMutation(api.flashCards.startSyncCards);
  const upsertEvent = useMutation(api.events.upsertCurrentEvent);

  const handleLoad = useCallback(async () => {
    await loadFlashCards({});
  }, [loadFlashCards]);

  const handleSave = useCallback(async () => {
    if (!flashCards) {
      console.log("No flash cards to save");
      return;
    }
    const flashCardsToSave = flashCards
      .filter((card) => card.reviewStatus !== null)
      .map((card) => ({
        id: card._id,
        reviewStatus: card.reviewStatus!,
      }));
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
        if (!prevCards) {
          throw new Error("No flash cards");
        }
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
        if (oldStatus === null) {
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
            timestamp: currentTimestamp,
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
    [currentCard, currentTimestamp, entityId, timeRange],
  );

  // Setup the menu options
  const hasFlashCards = !!flashCards;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: 30 }}>
          <TouchableOpacity onPress={handleLoad}>
            <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
              Load
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSave} disabled={!hasFlashCards}>
            <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [handleLoad, handleSave, hasFlashCards, navigation]);

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
  const numUnsaved = flashCards.length - numToReview;

  const correctPercentage = new Intl.NumberFormat(undefined, {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numReviewed === 0 ? 0 : numCorrect / numReviewed);

  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text>{`${numToReview} to Review - ${numUnsaved} unsaved`}</Text>
      <Text>{`${numReviewed} reviewed - ${correctPercentage}`}</Text>
    </View>
  );
}
