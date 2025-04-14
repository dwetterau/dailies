import { FlashCard } from "@convex/flashCards";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PlatformColor,
} from "react-native";

const FlashCardView = ({ card }: { card: FlashCard }) => {
  const [showSide2, setShowSide2] = useState(false);

  useEffect(() => {
    setShowSide2(false);
  }, [card]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.side1Text}>{card.side1}</Text>

        {!showSide2 ? (
          <TouchableOpacity
            style={styles.button}
            onPress={() => setShowSide2(true)}
          >
            <Text style={styles.buttonText}>Show</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.side2Container}>
            <Text style={styles.side2Text}>{card.side2}</Text>
            {card.details && card.details.length > 0 && (
              <Text style={styles.detailsText}>{card.details}</Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    width: "100%",
  },
  card: {
    width: "100%",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4, // For Android shadow
    alignItems: "center",
  },
  side1Text: {
    fontSize: 40,
    marginBottom: 10,
    textAlign: "center",
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: "center",
  },
  buttonText: {
    color: PlatformColor("systemBlue"),
    fontSize: 16,
    fontWeight: "500",
  },
  side2Container: {
    width: "100%",
    alignItems: "center",
  },
  side2Text: {
    fontSize: 24,
    textAlign: "center",
  },
  detailsText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: "center",
  },
});

export default FlashCardView;
