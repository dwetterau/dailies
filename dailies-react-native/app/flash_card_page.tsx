import { getTimeRangeForTimestamp } from "@/model/entities/entity_helpers";
import {
  getIsTimestampInTimeRange,
  useCurrentTimeRanges,
} from "@/model/time/timestamps";
import { api } from "@convex/_generated/api";
import { EntityId, ResetAfterInterval } from "@convex/entities";
import { FlashCard, FlashCardId, ReviewStatus } from "@convex/flashCards";
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
import { useToast } from "react-native-toast-notifications";

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
  const toast = useToast();

  const { entityId: _entityId } = useLocalSearchParams();
  const entityId = _entityId as EntityId;

  const {
    currentTimestamp,
    timeRanges: { dailyTimeRange: timeRange },
  } = useCurrentTimeRanges();

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
  const [currentCardId, setCurrentCardId] = useState<FlashCardId | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (isLoading) {
      toast.show("Loaded!", {
        type: "success",
        placement: "top",
        duration: 2000,
        animationType: "slide-in",
      });
      setIsLoading(false);
    }
    // We intentionally don't trigger this on isLoading, since we want to show the loading toast when we get the actual
    // server update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteFlashCards, toast]);

  // Whenever we change our flashCards, make sure our prevIndex is initialized, and proactively save them to storage.
  useEffect(() => {
    if (!flashCards) {
      return;
    }
    setCurrentCardId((prevId) => {
      if (prevId !== null && !flashCards.some((card) => card._id === prevId)) {
        console.log("Current card id is gone, resetting to null");
        return null;
      }
      if (prevId === null) {
        // Try to initialize the pointer
        return getFirstUnreviewedCard(flashCards)?._id ?? null;
      }
      return prevId;
    });
    console.log("Saving flash cards to storage", flashCards.length);
    saveFlashCardsToStorage(flashCards);
  }, [flashCards]);

  const saveFlashCards = useMutation(api.flashCards.startSaveReviewStatus);
  const loadFlashCards = useMutation(api.flashCards.startSyncCards);
  const upsertEvent = useMutation(api.events.upsertCurrentEvent);

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    await loadFlashCards({});
    toast.show("Loading...", {
      type: "normal",
      placement: "top",
      duration: 2000,
      animationType: "slide-in",
    });
  }, [loadFlashCards, toast]);

  const [isSaving, setIsSaving] = useState(false);
  const handleSave = useCallback(async () => {
    if (isSaving) {
      console.log("Already saving flash cards");
      return;
    }
    const flashCardsToSave = (flashCards ?? [])
      .filter((card) => card.reviewStatus !== null)
      .map((card) => ({
        id: card._id,
        reviewStatus: card.reviewStatus!,
      }));
    if (!flashCardsToSave.length) {
      console.log("No flash cards to save");
      return;
    }

    setIsSaving(true);
    try {
      await saveFlashCards({ cards: flashCardsToSave });
      await upsertEvent(currentEvent);
    } catch (error) {
      console.error("Error saving flash cards", error);
    }
    toast.show("Saved!", {
      type: "success",
      placement: "top",
      duration: 2000,
      animationType: "slide-in",
    });
    setIsSaving(false);
  }, [currentEvent, flashCards, isSaving, saveFlashCards, upsertEvent, toast]);

  const { currentCard, currentCardIndex } = useMemo(() => {
    for (const [index, card] of (flashCards ?? []).entries()) {
      if (card._id === currentCardId) {
        return { currentCard: card, currentCardIndex: index };
      }
    }
    return { currentCard: null, currentCardIndex: null };
  }, [currentCardId, flashCards]);

  const handleSetCurrentCardReviewStatus = useCallback(
    (status: ReviewStatus) => {
      if (
        !flashCards ||
        !currentCard ||
        !currentCardId ||
        currentCardIndex === null
      ) {
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
          timestamp: currentTimestamp,
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
      if (currentCardIndex < flashCards.length - 1) {
        setCurrentCardId(flashCards[currentCardIndex + 1]._id);
      } else {
        setCurrentCardId(null);
      }
    },
    [
      currentCard,
      currentCardId,
      currentCardIndex,
      currentTimestamp,
      entityId,
      flashCards,
      timeRange,
    ],
  );

  const handleGoToPreviousCard = useCallback(() => {
    if (
      currentCardIndex === null ||
      !flashCards ||
      currentCardIndex <= 0 ||
      currentCardIndex - 1 >= flashCards.length
    ) {
      return;
    }
    setCurrentCardId(flashCards[currentCardIndex - 1]._id);
  }, [currentCardIndex, flashCards]);

  // Setup the menu options
  const hasFlashCards = !!flashCards;
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        const isSaveEnabled = hasFlashCards && !isSaving;

        return (
          <View style={{ flexDirection: "row", gap: 30 }}>
            <TouchableOpacity onPress={handleLoad}>
              <Text
                style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}
              >
                Load
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={!isSaveEnabled}>
              <Text
                style={{
                  color: isSaveEnabled
                    ? PlatformColor("systemBlue")
                    : PlatformColor("systemGray"),
                  fontSize: 16,
                }}
              >
                Save
              </Text>
            </TouchableOpacity>
          </View>
        );
      },
    });
  }, [handleLoad, handleSave, hasFlashCards, isSaving, navigation]);

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
      {currentCardIndex !== null && currentCardIndex > 0 && (
        <View style={{ paddingTop: 40, width: "100%", alignItems: "center" }}>
          <TouchableOpacity onPress={handleGoToPreviousCard}>
            <Text style={{ color: PlatformColor("systemBlue"), fontSize: 16 }}>
              Previous
            </Text>
          </TouchableOpacity>
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
