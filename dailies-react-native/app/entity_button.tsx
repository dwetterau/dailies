import { getColorForCategory } from "@/model/entities/category_helpers";
import { Entity, EntityType } from "@convex/entities";
import BigButton from "./big_button";
import { useCallback, useMemo } from "react";
import { api } from "@convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { EventType } from "@convex/events";
import {
  getCurrentTimestamp,
  useCurrentTimeRanges,
} from "@/model/time/timestamps";
import { getTimeRangeForTimestamp } from "@/model/entities/entity_helpers";
import { Alert } from "react-native";

export default function EntityButton({
  entity,
  completionRatio,
}: {
  entity: Entity;
  completionRatio: number;
}) {
  const { currentTimestamp } = useCurrentTimeRanges();
  const timeRange = useMemo(
    () => getTimeRangeForTimestamp(entity.resetAfterInterval, currentTimestamp),
    [currentTimestamp]
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
      const timestamp = getCurrentTimestamp();
      upsertEvent({
        entityId: entity._id,
        timeRange,
        timestamp,
        details: {
          type: EventType.GENERIC_COMPLETION,
          payload: {
            numCompletions: numCompletions + 1,
            numRequiredCompletions: entity.numRequiredCompletions ?? 1,
          },
        },
      });
    } else {
      console.log("unsupported entity type :(", entity.type);
    }
  }, [entity, timeRange]);

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
      { cancelable: true }
    );
  }, [currentEvent]);

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
