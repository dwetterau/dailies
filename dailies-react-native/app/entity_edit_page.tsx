import { api } from "@convex/_generated/api";
import {
  EntityCategory,
  EntityType,
  ResetAfterInterval,
} from "@convex/entities";
import { Picker } from "@react-native-picker/picker";
import { useMutation } from "convex/react";
import { useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  PlatformColor,
} from "react-native";
import { useToast } from "react-native-toast-notifications";

function getFieldOptionsForType(type: EntityType): string[] {
  switch (type) {
    case EntityType.WORKOUT:
      return ["weight", "numReps", "numSets", "distance", "durationSeconds"];
    case EntityType.FLASH_CARDS:
    case EntityType.GENERIC_COMPLETION:
      return [];
    default:
      throw new Error(`Unknown entity type: ${type}`);
  }
}

export default function EntityEditScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const toast = useToast();

  const saveNewEntity = useMutation(api.entities.create);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<EntityCategory>(
    EntityCategory.EXERCISE,
  );
  const [type, setType] = useState<EntityType>(EntityType.GENERIC_COMPLETION);
  const [resetInterval, setResetInterval] = useState(ResetAfterInterval.DAILY);
  const [isRequired, setIsRequired] = useState(false);
  const [requiredCompletionsString, setRequiredCompletionsString] =
    useState("");
  const [includedEventFields, setIncludedEventFields] = useState<string[]>([]);

  const requiresCompletions = type !== EntityType.WORKOUT;
  const requiresEventFields = type === EntityType.WORKOUT;

  const toggleField = useCallback((field: string) => {
    setIncludedEventFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }, []);

  const isInvalid = useCallback(() => {
    if (!name.trim()) {
      return true;
    }
    if (requiresCompletions && !numRequiredCompletionsString) {
      return true;
    }
    if (requiresEventFields && includedEventFields.length === 0) {
      return true;
    }
    if (type === EntityType.WORKOUT && category !== EntityCategory.EXERCISE) {
      return true;
    }
    if (
      type === EntityType.FLASH_CARDS &&
      category !== EntityCategory.LEARNING
    ) {
      return true;
    }
    return false;
  }, [
    category,
    includedEventFields.length,
    name,
    requiresCompletions,
    requiresEventFields,
    type,
  ]);

  const handleSave = useCallback(async () => {
    if (isInvalid()) return;

    const payload: Parameters<typeof saveNewEntity>[0] = {
      name,
      category,
      type,
      isRequired,
      resetAfterInterval: resetInterval,
    };

    if (requiresCompletions) {
      payload.numRequiredCompletions = parseInt(requiredCompletionsString);
    }

    if (requiresEventFields) {
      payload.includedEventFields = includedEventFields;
    }

    try {
      saveNewEntity(payload);
      toast.show("New entity saved", {
        type: "success",
        placement: "top",
        duration: 2000,
        animationType: "slide-in",
      });
      // After saving, navigate back to the previous page.
      router.back();
    } catch (err) {
      console.error("Failed to save entity:", err);
    }
  }, [
    category,
    includedEventFields,
    isInvalid,
    isRequired,
    name,
    requiredCompletionsString,
    requiresCompletions,
    requiresEventFields,
    resetInterval,
    router,
    saveNewEntity,
    toast,
    type,
  ]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.saveButton}>
          <Button title="Save" onPress={handleSave} disabled={isInvalid()} />
        </View>
      ),
    });
  }, [handleSave, isInvalid, navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.sectionTitle}>Name</Text>
      <TextInput
        placeholder="Entity..."
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <Text style={styles.sectionTitle}>Options</Text>

      <PickerMenu
        label="Category"
        value={category}
        options={[
          EntityCategory.EXERCISE,
          EntityCategory.LEARNING,
          EntityCategory.CARE,
          EntityCategory.THINKING,
          EntityCategory.TIDYING,
        ]}
        onChange={setCategory}
      />
      <PickerMenu
        label="Type"
        value={type}
        options={[
          EntityType.WORKOUT,
          EntityType.GENERIC_COMPLETION,
          EntityType.FLASH_CARDS,
        ]}
        onChange={setType}
      />
      <PickerMenu
        label="Reset Interval"
        value={resetInterval}
        options={[ResetAfterInterval.DAILY, ResetAfterInterval.WEEKLY]}
        onChange={setResetInterval}
      />
      <PickerMenu<"Required" | "Optional">
        label="Is Required?"
        value={isRequired ? "Required" : "Optional"}
        options={["Required", "Optional"]}
        onChange={(v) => setIsRequired(v === "Required")}
      />

      {requiresCompletions && (
        <View style={styles.row}>
          <Text style={styles.label}>Completions per Interval</Text>
          <TextInput
            keyboardType="number-pad"
            value={requiredCompletionsString}
            onChangeText={setRequiredCompletionsString}
            style={styles.input}
          />
        </View>
      )}

      {requiresEventFields && (
        <>
          <Text style={styles.sectionTitle}>Event Fields</Text>
          {getFieldOptionsForType(type).map((field) => (
            <TouchableOpacity
              key={field}
              onPress={() => toggleField(field)}
              style={styles.listItem}
            >
              <Text>{field}</Text>
              {includedEventFields.includes(field) && (
                <Text style={{ color: "blue" }}>✔</Text>
              )}
            </TouchableOpacity>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function PickerMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<T>;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.formRow}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          style={styles.picker}
        >
          {options.map((x) => (
            <Picker.Item key={x} label={x} value={x} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  sectionTitle: {
    fontWeight: "600",
    fontSize: 18,
    marginTop: 20,
    marginBottom: 6,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 8,
  },
  label: {
    fontSize: 16,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: "#ccc",
    flex: 1,
    marginLeft: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
  pickerWrapper: {
    flex: 1,
    marginLeft: 16,
  },
  picker: {
    height: 40,
    width: "100%",
  },
  formRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  saveButton: {
    marginTop: 30,
  },
});
