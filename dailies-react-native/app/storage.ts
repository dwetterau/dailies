import { FlashCard } from "@convex/flashCards";
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV();

export function saveFlashCardsToStorage(flashCards: Array<FlashCard>) {
  storage.set("flashCards", JSON.stringify(flashCards));
}

export function getFlashCardsFromStorage(): Array<FlashCard> {
  const rawJSON = storage.getString("flashCards");
  if (rawJSON) {
    try {
      return JSON.parse(rawJSON);
    } catch (error) {
      console.error("Failed to parse flash cards from storage", error);
    }
  }
  return [];
}

export function saveGenericObject<T>(key: string, object: T) {
  storage.set(key, JSON.stringify(object));
}
export function getGenericObject<T>(key: string): T | null {
  const rawJSON = storage.getString(key);
  if (rawJSON) {
    try {
      return JSON.parse(rawJSON);
    } catch (error) {
      console.error(`Failed to parse ${key} from storage`, error);
    }
  }
  return null;
}

export default {
  getFlashCardsFromStorage,
  saveFlashCardsToStorage,
  getGenericObject,
  saveGenericObject,
};
