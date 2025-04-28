import {
  getCurrentTimestamp,
  getIsTimestampInTimeRange,
  getTimeRangeForResetInterval,
  useCurrentTimeRanges,
} from "@/model/time/timestamps";
import { api } from "@convex/_generated/api";
import { Entity, EntityId } from "@convex/entities";
import { Event, EventType, WorkoutEventDetails } from "@convex/events";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Button,
  Modal,
  PlatformColor,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

const useRecentEvents = (
  entity: Entity,
): { mostRecentEvent: Event | null; currentEvent: Event | null } => {
  const { timeRanges } = useCurrentTimeRanges();
  const events = useQuery(api.events.list, {
    entityId: entity._id,
  });

  let mostRecentEvent: Event | null = null;
  let currentEvent: Event | null = null;
  const timeRange = getTimeRangeForResetInterval(
    timeRanges,
    entity.resetAfterInterval,
  );
  for (const event of events ?? []) {
    if (getIsTimestampInTimeRange(event.timestamp, timeRange)) {
      currentEvent = event;
    } else {
      if (!mostRecentEvent || event.timestamp > mostRecentEvent.timestamp) {
        mostRecentEvent = event;
      }
    }
  }

  return { mostRecentEvent, currentEvent };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
  },
  label: {
    fontSize: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 20,
    marginBottom: 20,
  },
  timeButtonOpen: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    alignItems: "center",
  },
  timeButtonPressed: {
    backgroundColor: "#eee",
  },
  timeButtonText: {
    fontSize: 18,
    color: "#333",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  modalToolbar: {
    padding: 12,
    alignItems: "flex-end",
  },
  pickerItemStyle: {
    fontSize: 24,
    height: 200,
  },
});

function WorkoutEditPage() {
  const { entityId: _entityId } = useLocalSearchParams();
  const entityId = _entityId as EntityId;
  const entity = useQuery(api.entities.get, { id: entityId });
  if (!entity) {
    return (
      <ActivityIndicator size="large" color={PlatformColor("systemGray")} />
    );
  }
  return <WorkoutEditPageInner entity={entity} />;
}

function WorkoutEditPageInner({ entity }: { entity: Entity }) {
  const navigation = useNavigation();

  const { mostRecentEvent, currentEvent } = useRecentEvents(entity);
  if (currentEvent && currentEvent.details.type !== EventType.WORKOUT) {
    throw new Error("Current event is not a workout");
  }

  const [weight, setWeight] = useState<string>("");
  const [numReps, setNumReps] = useState<string>("");
  const [numSets, setNumSets] = useState<string>("");
  const [distance, setDistance] = useState<string>();
  const [hours, setHours] = useState<number | null>(null);
  const [isShowingHoursPicker, setIsShowingHoursPicker] =
    useState<boolean>(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [isShowingMinutesPicker, setIsShowingMinutesPicker] =
    useState<boolean>(false);
  const [seconds, setSeconds] = useState<number | null>(null);
  const [isShowingSecondsPicker, setIsShowingSecondsPicker] =
    useState<boolean>(false);
  const [durationSeconds, setDurationSeconds] = useState<number | null>();

  // Initialize all the fields when the current event updates (for initial load).
  useEffect(() => {
    if (!currentEvent || currentEvent.details.type !== EventType.WORKOUT) {
      return;
    }
    const { payload } = currentEvent.details;
    setWeight(payload.weight?.toString() ?? "");
    setNumReps(payload.numReps?.toString() ?? "");
    setNumSets(payload.numSets?.toString() ?? "");
    setDistance(payload.distance?.toString() ?? "");
    setDurationSeconds(payload.durationSeconds ?? null);

    if (
      payload.durationSeconds !== null &&
      payload.durationSeconds !== undefined
    ) {
      const numHours = Math.floor(payload.durationSeconds / 3600);
      const numMinutes = Math.floor(
        (payload.durationSeconds - numHours * 3600) / 60,
      );
      const numSeconds =
        payload.durationSeconds - numHours * 3600 - numMinutes * 60;
      setHours(numHours);
      setMinutes(numMinutes);
      setSeconds(numSeconds);
    }
  }, [currentEvent]);

  // Update durationSeconds when any input changes.
  useEffect(() => {
    setDurationSeconds(
      (hours ?? 0) * 3600 + (minutes ?? 0) * 60 + (seconds ?? 0),
    );
  }, [hours, minutes, seconds]);

  const isFieldRequired = useCallback(
    (field: keyof WorkoutEventDetails["payload"]): boolean => {
      return entity.includedEventFields?.includes(field) ?? false;
    },
    [entity],
  );

  const isSaveEnabled = useMemo(() => {
    for (const field of [
      "weight",
      "numReps",
      "numSets",
      "durationSeconds",
      "distance",
    ] as const) {
      if (!isFieldRequired(field)) {
        continue;
      }
      if (field === "weight" && !weight) {
        return false;
      }
      if (field === "numReps" && !numReps) {
        return false;
      }
      if (field === "numSets" && !numSets) {
        return false;
      }
      if (field === "distance" && !distance) {
        return false;
      }
      if (field === "durationSeconds" && durationSeconds === null) {
        return false;
      }
    }
    return true;
  }, [distance, durationSeconds, isFieldRequired, numReps, numSets, weight]);

  const saveNewWorkout = useMutation(api.events.create);
  const updateWorkout = useMutation(api.events.update);
  const handleSave = useCallback(() => {
    if (!isSaveEnabled) {
      console.error("Tried to save when it was not enabled");
      return;
    }
    const details: WorkoutEventDetails = {
      type: EventType.WORKOUT,
      payload: {
        weight: weight ? parseFloat(weight) : undefined,
        numReps: numReps ? parseInt(numReps, 10) : undefined,
        numSets: numSets ? parseInt(numSets, 10) : undefined,
        durationSeconds: durationSeconds ?? undefined,
        distance: distance ? parseFloat(distance) : undefined,
      },
    };

    if (!currentEvent) {
      saveNewWorkout({
        entityId: entity._id,
        timestamp: getCurrentTimestamp(),
        details,
      });
    } else {
      updateWorkout({
        id: currentEvent._id,
        details,
      });
    }
  }, [
    isSaveEnabled,
    weight,
    numReps,
    numSets,
    durationSeconds,
    distance,
    currentEvent,
    saveNewWorkout,
    entity._id,
    updateWorkout,
  ]);

  // TODO: if we want to change the date, we can use @react-native-community/datetimepicker

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => {
        return (
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
        );
      },
    });
  }, [handleSave, isSaveEnabled, navigation]);

  return (
    <View style={styles.container}>
      {isFieldRequired("weight") && (
        <View>
          <Text style={styles.label}>Weight</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType={"decimal-pad"}
            placeholder={"Enter weight (lbs)"}
          />
        </View>
      )}
      {isFieldRequired("numReps") && (
        <View>
          <Text style={styles.label}>Repetitions</Text>
          <TextInput
            style={styles.input}
            value={numReps}
            onChangeText={setNumReps}
            keyboardType={"numeric"}
            placeholder={"Number of reps"}
          />
        </View>
      )}
      {isFieldRequired("numSets") && (
        <View>
          <Text style={styles.label}>Sets</Text>
          <TextInput
            style={styles.input}
            value={numSets}
            onChangeText={setNumSets}
            keyboardType={"numeric"}
            placeholder={"Number of sets"}
          />
        </View>
      )}
      {isFieldRequired("distance") && (
        <View>
          <Text style={styles.label}>Distance</Text>
          <TextInput
            style={styles.input}
            value={distance}
            onChangeText={setDistance}
            keyboardType={"decimal-pad"}
            placeholder={"Distance (miles)"}
          />
        </View>
      )}
      {isFieldRequired("durationSeconds") && (
        <View>
          <Text style={styles.label}>Duration</Text>
          <View style={styles.timeContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.timeButtonOpen,
                pressed && styles.timeButtonPressed,
              ]}
              onPress={() => setIsShowingHoursPicker(true)}
            >
              <Text style={styles.timeButtonText}>{hours} hr</Text>
            </Pressable>
            <Modal
              visible={isShowingHoursPicker}
              animationType="slide"
              transparent={true}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalToolbar}>
                    <Button
                      title="Done"
                      onPress={() => setIsShowingHoursPicker(false)}
                    />
                  </View>
                  <Picker
                    selectedValue={hours}
                    itemStyle={styles.pickerItemStyle}
                    onValueChange={setHours}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <Picker.Item
                        label={`${hour} hours`}
                        value={hour}
                        key={`hour-${hour}`}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </Modal>

            <Pressable
              style={({ pressed }) => [
                styles.timeButtonOpen,
                pressed && styles.timeButtonPressed,
              ]}
              onPress={() => setIsShowingMinutesPicker(true)}
            >
              <Text style={styles.timeButtonText}>{minutes} min</Text>
            </Pressable>
            <Modal
              visible={isShowingMinutesPicker}
              animationType="slide"
              transparent={true}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalToolbar}>
                    <Button
                      title="Done"
                      onPress={() => setIsShowingMinutesPicker(false)}
                    />
                  </View>
                  <Picker
                    selectedValue={minutes}
                    itemStyle={styles.pickerItemStyle}
                    onValueChange={setMinutes}
                  >
                    {Array.from({ length: 60 }, (_, minute) => (
                      <Picker.Item
                        label={`${minute} minutes`}
                        value={minute}
                        key={`hour-${minute}`}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </Modal>

            <Pressable
              style={({ pressed }) => [
                styles.timeButtonOpen,
                pressed && styles.timeButtonPressed,
              ]}
              onPress={() => setIsShowingSecondsPicker(true)}
            >
              <Text style={styles.timeButtonText}>{seconds} sec</Text>
            </Pressable>
            <Modal
              visible={isShowingSecondsPicker}
              animationType="slide"
              transparent={true}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                  <View style={styles.modalToolbar}>
                    <Button
                      title="Done"
                      onPress={() => setIsShowingSecondsPicker(false)}
                    />
                  </View>
                  <Picker
                    selectedValue={seconds}
                    itemStyle={styles.pickerItemStyle}
                    onValueChange={setSeconds}
                  >
                    {Array.from({ length: 60 }, (_, second) => (
                      <Picker.Item
                        label={`${second} seconds`}
                        value={second}
                        key={`hour-${second}`}
                      />
                    ))}
                  </Picker>
                </View>
              </View>
            </Modal>
          </View>
        </View>
      )}
    </View>
  );
}

export default WorkoutEditPage;
