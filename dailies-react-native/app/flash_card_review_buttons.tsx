import { ReviewStatus } from "@convex/flashCards";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PlatformColor,
} from "react-native";

interface Props {
  setCurrentCardReviewStatus: (status: ReviewStatus) => void;
}

export default function FlashCardReviewButtons({
  setCurrentCardReviewStatus,
}: Props) {
  return (
    <>
      <View style={{ height: 10 }} />
      <View style={styles.container}>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.blue, styles.leftButton]}
            onPress={() => setCurrentCardReviewStatus(ReviewStatus.EASY)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Easy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.green, styles.rightButton]}
            onPress={() => setCurrentCardReviewStatus(ReviewStatus.NORMAL)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Normal</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.button, styles.purple, styles.leftButton]}
            onPress={() => setCurrentCardReviewStatus(ReviewStatus.DIFFICULT)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Difficult</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.red, styles.rightButton]}
            onPress={() => setCurrentCardReviewStatus(ReviewStatus.WRONG)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Wrong</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const HORIZONTAL_PADDING = 20;

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    minHeight: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  leftButton: {
    marginLeft: HORIZONTAL_PADDING,
  },
  rightButton: {
    marginRight: HORIZONTAL_PADDING,
  },
  buttonText: {
    color: "white",
    fontSize: 18, // title2 equivalent
    fontWeight: "600",
  },
  blue: {
    backgroundColor: PlatformColor("systemBlue"),
  },
  green: {
    backgroundColor: PlatformColor("systemGreen"),
  },
  purple: {
    backgroundColor: PlatformColor("systemPurple"),
  },
  red: {
    backgroundColor: PlatformColor("systemRed"),
  },
});
