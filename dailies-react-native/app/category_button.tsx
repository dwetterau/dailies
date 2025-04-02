import { EntityCategory } from "@convex/entities";
import BigButton from "./big_button";
import { Doc } from "@convex/_generated/dataModel";

function getDisplayNameForCategory(category: EntityCategory): string {
  switch (category) {
    case EntityCategory.EXERCISE:
      return "Exercise";
    case EntityCategory.LEARNING:
      return "Learning";
    case EntityCategory.CARE:
      return "Care";
    case EntityCategory.THINKING:
      return "Thinking";
    case EntityCategory.TIDYING:
      return "Tidying";
    default:
      throw new Error("Unknown category");
  }
}

function getColorForCategory(category: EntityCategory): string {
  // TODO: Consider getting the RGB values from here instead: https://developer.apple.com/design/human-interface-guidelines/color#iOS-iPadOS-system-colors
  switch (category) {
    case EntityCategory.EXERCISE:
      return "purple";
    case EntityCategory.LEARNING:
      return "green";
    case EntityCategory.CARE:
      return "blue";
    case EntityCategory.THINKING:
      return "red";
    case EntityCategory.TIDYING:
      return "orange";
    default:
      throw new Error("Unknown category");
  }
}

export default function CategoryButton({
  category,
  entities,
}: {
  category: EntityCategory;
  entities: Array<Doc<"entities">>;
}) {
  return (
    <BigButton
      buttonText={getDisplayNameForCategory(category)}
      buttonCompleteColor={getColorForCategory(category)}
      completionRatio={0.8}
    />
  );
}
