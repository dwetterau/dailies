import { Entity, EntityCategory, EntityId } from "@convex/entities";

export function getDisplayNameForCategory(category: EntityCategory): string {
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

export function getColorForCategory(category: EntityCategory): string {
  // TODO: Consider getting the RGB values from here instead: https://developer.apple.com/design/human-interface-guidelines/color#iOS-iPadOS-system-colors
  switch (category) {
    case EntityCategory.EXERCISE:
      return "#af52de";
    case EntityCategory.LEARNING:
      return "#34c759";
    case EntityCategory.CARE:
      return "#007aff";
    case EntityCategory.THINKING:
      return "#ff3b30";
    case EntityCategory.TIDYING:
      return "#fc9500";
    default:
      throw new Error("Unknown category");
  }
}

export function getCategoryCompletionRatio(
  allEntities: Array<Entity>,
  entityIdToCompletionRatio: Record<EntityId, number>,
  category: EntityCategory
): number {
  let hasOptionalEntity = false;
  let isAnyDone = false;
  let isRequiredEntityNotDone = false;
  let requiredEntityCount = 0;
  let numOptionalCompletions = 0;
  let maxOptionalCompletionPercentage = 0.0;
  let totalRequiredCompletionPercentage = 0.0;

  allEntities
    .filter((entity) => entity.category === category)
    .forEach((entity) => {
      const completionRatio = entityIdToCompletionRatio[entity._id] ?? 0;
      if (entity.isRequired) {
        requiredEntityCount += 1;
        totalRequiredCompletionPercentage += completionRatio;
      } else {
        hasOptionalEntity = true;
        maxOptionalCompletionPercentage = Math.max(
          maxOptionalCompletionPercentage,
          completionRatio
        );
      }
      if (completionRatio === 1) {
        isAnyDone = true;
        if (!entity.isRequired) {
          numOptionalCompletions += 1;
        }
      } else {
        if (entity.isRequired) {
          isRequiredEntityNotDone = true;
        }
      }
    });
  if (isAnyDone && !isRequiredEntityNotDone) {
    return 1;
  }
  if (requiredEntityCount > 0) {
    // If a category has both optional and required completions,
    // we want to show the optional completions in the bar, but they can never fill it up.
    // This early case is to make sure we show some progress even if an optional event is only partially done.
    let optionalNumerator =
      maxOptionalCompletionPercentage < 1 && maxOptionalCompletionPercentage > 0
        ? maxOptionalCompletionPercentage
        : numOptionalCompletions;
    let optionalDenominator =
      maxOptionalCompletionPercentage < 1 && maxOptionalCompletionPercentage > 0
        ? 1
        : numOptionalCompletions;

    return (
      (totalRequiredCompletionPercentage + optionalNumerator) /
      (requiredEntityCount + optionalDenominator)
    );
  } else {
    if (!hasOptionalEntity) {
      // There are no entities?
      return 0;
    }
    return maxOptionalCompletionPercentage;
  }
}
