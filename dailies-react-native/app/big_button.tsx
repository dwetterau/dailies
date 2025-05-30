import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Text, View, StyleSheet } from "react-native";
import {
  TapGestureHandler,
  State,
  HandlerStateChangeEvent,
  TapGestureHandlerEventPayload,
} from "react-native-gesture-handler";

interface BigButtonProps {
  buttonText: string;
  buttonCompleteColor: string; // Hex or RGB color
  completionRatio: number; // Number in [0, 1]
  onPress: () => void;
  onTriplePress?: () => void;
}

const BigButton: React.FC<BigButtonProps> = ({
  buttonText,
  buttonCompleteColor,
  completionRatio,
  onPress,
  onTriplePress,
}) => {
  const tripleTapRef = React.useRef();
  const animatedCompletionRatio = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedCompletionRatio, {
      toValue: completionRatio,
      duration: 500,
      useNativeDriver: false, // Required for width animations
    }).start();
  }, [completionRatio]);

  const handleTriplePress = useCallback(
    (event: HandlerStateChangeEvent<TapGestureHandlerEventPayload>) => {
      if (!onTriplePress) return;
      if (event.nativeEvent.state === State.ACTIVE) {
        onTriplePress();
      }
    },
    [onTriplePress],
  );

  const handleSinglePress = useCallback(
    (event: HandlerStateChangeEvent<TapGestureHandlerEventPayload>) => {
      if (event.nativeEvent.state === State.ACTIVE) {
        onPress();
      }
    },
    [onPress],
  );

  return (
    <View style={styles.container}>
      <TapGestureHandler
        ref={tripleTapRef}
        numberOfTaps={3}
        maxDelayMs={150}
        onHandlerStateChange={handleTriplePress}
      >
        <TapGestureHandler
          numberOfTaps={1}
          waitFor={tripleTapRef}
          onHandlerStateChange={handleSinglePress}
        >
          <View style={styles.shadow}>
            {/* Background Container */}
            <View style={styles.background}>
              {/* Animated Progress Bar */}
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: buttonCompleteColor,
                    width: animatedCompletionRatio.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 300], // Fixed width instead of percentage
                    }),
                  },
                ]}
              />
            </View>

            {/* Button Text */}
            <View style={styles.textContainer}>
              <Text style={styles.text}>{buttonText}</Text>
            </View>
          </View>
        </TapGestureHandler>
      </TapGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 30,
  },
  shadow: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  background: {
    width: 300, // Fixed width to ensure visibility
    height: 60,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "gray",
    flexDirection: "row",
    position: "absolute", // Ensures it stays below text
  },
  progressBar: {
    height: "100%",
    position: "absolute",
    left: 0,
  },
  textContainer: {
    width: 300, // Ensure text container is same width as button
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 25,
    color: "white",
    textAlign: "center",
    fontFamily: "System", // Rounded design equivalent
  },
});

export default BigButton;
