import { getColorForCategory } from "@/model/entities/category_helpers";
import { Entity, EntityType, ResetAfterInterval } from "@convex/entities";
import BigButton from "./big_button";
import { useCallback, useMemo } from "react";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { EventType } from "@convex/events";
import {
  getCurrentTimestamp,
  getTimeRangeForResetInterval,
  useCurrentTimeRanges,
} from "@/model/time/timestamps";
import { Alert } from "react-native";
import { useRouter } from "expo-router";

export default function EntityButton({
  entity,
  completionRatio,
}: {
  entity: Entity;
  completionRatio: number;
}) {
  const router = useRouter();
  const { timeRanges, currentTimestamp } = useCurrentTimeRanges();
  const timeRange = getTimeRangeForResetInterval(
    timeRanges,
    entity.resetAfterInterval,
  );

  const currentEvent = useQuery(api.events.getCurrentEvent, {
    entityId: entity._id,
    timeRange,
  });
  const upsertEvent = useMutation(api.events.upsertCurrentEvent);

  const handlePress = useCallback(() => {
    if (entity.type === EntityType.GENERIC_COMPLETION) {
      let numCompletions = 0;
      if (
        currentEvent &&
        currentEvent.details.type === EventType.GENERIC_COMPLETION
      ) {
        numCompletions = currentEvent.details.payload.numCompletions;
      }
      upsertEvent({
        entityId: entity._id,
        timeRange,
        timestamp: currentTimestamp,
        details: {
          type: EventType.GENERIC_COMPLETION,
          payload: {
            numCompletions: numCompletions + 1,
            numRequiredCompletions: entity.numRequiredCompletions ?? 1,
          },
        },
      });
    } else if (entity.type === EntityType.FLASH_CARDS) {
      router.push({
        pathname: "/flash_card_page",
        params: { entityId: entity._id },
      });
    } else if (entity.type === EntityType.WORKOUT) {
      router.push({
        pathname: "/workout_edit_page",
        params: {
          entityId: entity._id,
        },
      });
    } else {
      console.log("unsupported entity type :(", entity.type);
    }
  }, [currentEvent, currentTimestamp, entity, router, timeRange, upsertEvent]);

  const handleTriplePress = useCallback(() => {
    if (
      !currentEvent ||
      currentEvent.details.type !== EventType.GENERIC_COMPLETION
    ) {
      return;
    }
    const timestamp = getCurrentTimestamp();
    Alert.alert(
      "Reset completions?",
      "Are you sure you want to reset today's completions?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          onPress: () => {
            upsertEvent({
              entityId: entity._id,
              timeRange,
              timestamp,
              details: {
                type: EventType.GENERIC_COMPLETION,
                payload: {
                  numCompletions: 0,
                  numRequiredCompletions: entity.numRequiredCompletions ?? 1,
                },
              },
            });
          },
          style: "destructive", // makes the button red on iOS
        },
      ],
      { cancelable: true },
    );
  }, [
    currentEvent,
    entity._id,
    entity.numRequiredCompletions,
    timeRange,
    upsertEvent,
  ]);

  return (
    <BigButton
      buttonText={entity.name}
      buttonCompleteColor={getColorForCategory(entity.category)}
      completionRatio={completionRatio}
      onPress={handlePress}
      onTriplePress={handleTriplePress}
    />
  );
}
