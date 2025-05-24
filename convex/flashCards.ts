import { v } from "convex/values";
import { defineTable } from "convex/server";
import {
  query,
  mutation,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { getUserIdFromContextAsync, store } from "./users";
import { api, internal } from "./_generated/api";
import { TokenType } from "./tokens";
import { Doc, Id } from "./_generated/dataModel";
import { chunk } from "./utils";

export type FlashCard = Doc<"flashCards">;
export type FlashCardId = Id<"flashCards">;

export enum ReviewStatus {
  EASY = "Easy",
  NORMAL = "Normal",
  DIFFICULT = "Difficult",
  WRONG = "Wrong",
}

export const FLASH_CARDS_SCHEMA = defineTable({
  ownerId: v.string(),
  remoteId: v.string(),
  side1: v.string(),
  side2: v.string(),
  details: v.string(),
  reviewStatus: v.union(
    v.literal(ReviewStatus.EASY),
    v.literal(ReviewStatus.NORMAL),
    v.literal(ReviewStatus.DIFFICULT),
    v.literal(ReviewStatus.WRONG),
    v.null()
  ),
}).index("by_owner", ["ownerId"]);

// Move these to a special table too one day
const baseId = "appX45YUZ4S3xa1Tu";
const tableId = "tblxuY0bU1EJNyDxX";

const AIRTABLE_FIELD_NAMES = [
  "Japanese",
  "English",
  "Hiragana",
  "Notes",
  "State",
  "Step",
  "Stability",
  "Difficulty",
  "Due",
  "Last Reviewed",

  // @deprecated, replace with state
  "Review Status",
] as const;

type FieldNames = (typeof AIRTABLE_FIELD_NAMES)[number];

const getCurrentCardsFromAirtable = async function (token: string) {
  let offset: string | undefined = undefined;
  let done = false;
  let allRecords = [];
  const pageSize = 100;
  while (!done) {
    const params = new URLSearchParams({
      view: "Next",
      pageSize: `${pageSize}`,
      ...(offset != undefined ? { offset: offset as string } : {}),
    });
    for (const field of AIRTABLE_FIELD_NAMES) {
      params.append("fields[]", field);
    }
    const endpointUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
    const response = await fetch(`${endpointUrl}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      if (response.status === 422) {
        const errorData = await response.json();
        console.error("Error:", response.status, errorData);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // See docs: https://airtable.com/developers/web/api/list-records#response
    const data: {
      records: Array<{
        id: string;
        fields: { [k: string]: unknown };
        createdTime: string;
      }>;
      offset?: string;
    } = await response.json();
    for (const record of data.records) {
      allRecords.push({
        ...record,
        fields: new Map(
          AIRTABLE_FIELD_NAMES.filter(
            (fieldName) => record.fields[fieldName] != undefined
          ).map((field) => [field, record.fields[field]])
        ),
      });
    }
    if (data.records.length < pageSize) {
      done = true;
    } else {
      offset = data.offset;
    }
  }
  return allRecords;
};

export const getCurrentCards = internalAction({
  args: { ownerId: v.id("users"), token: v.string() },
  handler: async (ctx, args) => {
    const records = await getCurrentCardsFromAirtable(args.token);
    await ctx.scheduler.runAfter(0, internal.flashCards.syncCurrentCards, {
      ownerId: args.ownerId,
      records: records.map((record) => {
        return {
          id: record.id,
          createdTime: record.createdTime,
          fields: Object.fromEntries(record.fields),
        };
      }),
    });
  },
});

const getStatusNumber = (status: ReviewStatus) => {
  switch (status) {
    case ReviewStatus.EASY:
      return 4;
    case ReviewStatus.NORMAL:
      return 3;
    case ReviewStatus.DIFFICULT:
      return 2;
    case ReviewStatus.WRONG:
      return 1;
    default:
      throw new Error("Unknown status");
  }
};

const getReviewStatus = (status: number) => {
  switch (status) {
    case 4:
      return ReviewStatus.EASY;
    case 3:
      return ReviewStatus.NORMAL;
    case 2:
      return ReviewStatus.DIFFICULT;
    case 1:
      return ReviewStatus.WRONG;
    default:
      throw new Error("Unknown status");
  }
};

const getNewReviewStatsAsync = async ({
  currentAirtableCards,
  cardsToSync,
  fsrsToken,
}: {
  currentAirtableCards: Array<{
    id: string;
    fields: Map<FieldNames, unknown>;
    createdTime: string;
  }>;
  cardsToSync: Array<{
    id: Id<"flashCards">;
    remoteId: string;
    reviewStatus: ReviewStatus;
  }>;
  fsrsToken: string;
}): Promise<{
  newReviewStats: Map<Id<"flashCards">, Map<FieldNames, unknown>>;
  reviewLogsToSave: Array<{
    cardId: Id<"flashCards">;
    rating: ReviewStatus;
    reviewTimestamp: number;
  }>;
}> => {
  const airtableCardById = new Map(
    currentAirtableCards.map((card) => [card.id, card.fields])
  );

  try {
    const lambdaResponse = await fetch(fsrsToken, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        statuses: cardsToSync.map((card) => getStatusNumber(card.reviewStatus)),
        cards: cardsToSync.map((card, index) => {
          const airtableCard = airtableCardById.get(card.remoteId);
          if (!airtableCard) {
            throw new Error(
              `missing card in airtable - ${card.id} - ${card.remoteId}`
            );
          }
          let lastReviewed = airtableCard.get("Last Reviewed") ?? null;
          if (!airtableCard.get("State")) {
            // Hide the last review time if it's from the old method
            lastReviewed = null;
          }
          return {
            card_id: index,
            state: (airtableCard.get("State") as undefined | number) ?? 1,
            step: (airtableCard.get("Step") as undefined | number) ?? 0,
            stability:
              (airtableCard.get("Stability") as undefined | number) ?? null,
            difficulty:
              (airtableCard.get("Difficulty") as undefined | number) ?? null,
            due:
              (airtableCard.get("Due") as undefined | string) ??
              new Date().toISOString(),
            last_review: lastReviewed,
          };
        }),
      }),
    });
    const { cards, reviewLogs } = await lambdaResponse.json();
    const newReviewStats = new Map();
    for (const updatedCard of cards) {
      const card = cardsToSync[updatedCard.card_id];
      newReviewStats.set(
        card.id,
        new Map<FieldNames, unknown>([
          ["State", updatedCard.state],
          ["Step", updatedCard.step],
          ["Stability", updatedCard.stability],
          ["Difficulty", updatedCard.difficulty],
          ["Due", convertToAirtableDate(updatedCard.due)],
          ["Last Reviewed", convertToAirtableDate(updatedCard.last_review)],
        ])
      );
    }
    const reviewLogsToSave = reviewLogs.map(
      (log: { card_id: number; rating: number; review_datetime: string }) => ({
        cardId: cardsToSync[log.card_id]!.id,
        rating: getReviewStatus(log.rating),
        // log.review_datetime is a string in ISO format, convert to unix seconds timestamp.
        reviewTimestamp: Math.round(
          new Date(log.review_datetime).getTime() / 1000
        ),
      })
    );
    return {
      newReviewStats,
      reviewLogsToSave,
    };
  } catch (e) {
    console.error("Error calling FSRS Lambda", e);
    throw e;
  }
};

function convertToAirtableDate(input: string) {
  // Remove microseconds (retain only milliseconds)
  const cleaned = input.replace(/(\.\d{3})\d+/, "$1");
  // Create a Date object
  const date = new Date(cleaned);
  // Convert to ISO string with milliseconds precision
  return date.toISOString();
}

export const saveCardReviewStatusToAirtable = internalAction({
  args: {
    ownerId: v.id("users"),
    token: v.string(),
    fsrsToken: v.string(),
    cardsToSync: v.array(
      v.object({
        id: v.id("flashCards"),
        remoteId: v.string(),
        reviewStatus: v.union(
          v.literal(ReviewStatus.EASY),
          v.literal(ReviewStatus.NORMAL),
          v.literal(ReviewStatus.DIFFICULT),
          v.literal(ReviewStatus.WRONG)
        ),
      })
    ),
  },
  handler: async (ctx, { cardsToSync, ownerId, token, fsrsToken }) => {
    // Get the cards from Airtable.
    let cards = [];
    try {
      cards = await getCurrentCardsFromAirtable(token);
    } catch (e) {
      console.error("Error getting current cards from Airtable");
      throw e;
    }

    const { newReviewStats, reviewLogsToSave } = await getNewReviewStatsAsync({
      currentAirtableCards: cards,
      cardsToSync,
      fsrsToken,
    });

    const cardIdsToClear = new Array<Id<"flashCards">>();
    try {
      for (const batch of chunk(cardsToSync, 10)) {
        const endpointUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
        const body = JSON.stringify({
          records: batch.map((card) => {
            const newValues = newReviewStats.get(card.id)!;
            const fields = Object.fromEntries(newValues);
            return {
              id: card.remoteId,
              fields,
            };
          }),
        });
        const response = await fetch(endpointUrl, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
        });
        if (!response.ok) {
          if (response.status === 422) {
            const errorData = await response.json();
            console.error("Error:", response.status, errorData);
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        for (const card of batch) {
          cardIdsToClear.push(card.id);
        }
      }
    } catch (e) {
      console.error("Error saving updates to Airtable", e);
      throw e;
    }
    if (cardIdsToClear.length > 0) {
      await ctx.scheduler.runAfter(0, internal.flashCards.clearReviewStatus, {
        ownerId,
        cardIdsToClear,
      });
    }
    if (reviewLogsToSave.length > 0) {
      await ctx.scheduler.runAfter(0, internal.reviewLogs.storeReviewLogs, {
        ownerId,
        logs: reviewLogsToSave,
      });
    }
  },
});

export const syncCurrentCards = internalMutation({
  args: {
    ownerId: v.id("users"),
    records: v.array(
      v.object({
        id: v.string(),
        createdTime: v.string(),
        // String -> any
        fields: v.any(),
      })
    ),
  },
  handler: async (ctx, { ownerId, records }) => {
    const cardsInConvex = await ctx.db
      .query("flashCards")
      .filter((q) => q.and(q.eq(q.field("ownerId"), ownerId)))
      .collect();

    const existingCardsByRemoteId = new Map(
      cardsInConvex.map((card) => [card.remoteId, card])
    );
    let newFlashCards = [];
    for (const record of records) {
      const newCard = {
        ownerId,
        remoteId: record.id,
        side1: record.fields["Japanese"],
        side2:
          (record.fields["English"] ?? "") +
          " " +
          (record.fields["Hiragana"] ?? ""),
        details: record.fields["Notes"] ?? "",
        reviewStatus: record.fields["Review Status"] ?? null,
      };
      if (existingCardsByRemoteId.has(record.id)) {
        const existingCard = existingCardsByRemoteId.get(record.id)!;
        if (
          existingCard.side1 === newCard.side1 &&
          existingCard.side2 === newCard.side2 &&
          existingCard.details === newCard.details
        ) {
          continue;
        }
        await ctx.db.patch(existingCard._id, newCard);
        continue;
      }
      newFlashCards.push(newCard);
    }

    for (const newFlashCard of newFlashCards) {
      await ctx.db.insert("flashCards", newFlashCard);
    }
  },
});

export const clearReviewStatus = internalMutation({
  args: {
    ownerId: v.id("users"),
    cardIdsToClear: v.array(v.id("flashCards")),
  },
  handler: async (ctx, { ownerId, cardIdsToClear }) => {
    const cards = await ctx.db
      .query("flashCards")
      .filter((q) =>
        q.and(
          q.eq(q.field("ownerId"), ownerId),
          q.neq(q.field("reviewStatus"), null)
        )
      )
      .collect();

    const cardsAuthorizedToUpdate = new Set(cards.map((card) => card._id));
    for (const cardId of cardIdsToClear) {
      if (cardsAuthorizedToUpdate.has(cardId)) {
        await ctx.db.delete(cardId);
        // We could instead clear the status - but for now the protocol works by simply
        // deleting the record.
        // await ctx.db.patch(cardId, { reviewStatus: null })
      }
    }
  },
});

export const startSyncCards = mutation({
  args: {},
  handler: async (ctx, {}) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const token = await ctx.runQuery(api.tokens.getTokenIfExists, {
      tokenType: TokenType.AIRTABLE,
    });
    if (!token) {
      throw new Error("no token found for sync");
    }
    await ctx.scheduler.runAfter(0, internal.flashCards.getCurrentCards, {
      ownerId,
      token: token.token,
    });
  },
});

export const startSaveReviewStatus = mutation({
  args: {
    cards: v.array(
      v.object({
        id: v.id("flashCards"),
        reviewStatus: v.union(
          v.literal(ReviewStatus.EASY),
          v.literal(ReviewStatus.NORMAL),
          v.literal(ReviewStatus.DIFFICULT),
          v.literal(ReviewStatus.WRONG)
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const token = await ctx.runQuery(api.tokens.getTokenIfExists, {
      tokenType: TokenType.AIRTABLE,
    });
    if (!token) {
      throw new Error("no token found for sync");
    }

    const fsrsToken = await ctx.runQuery(api.tokens.getTokenIfExists, {
      tokenType: TokenType.FSRS_LAMBDA,
    });
    if (!fsrsToken) {
      throw new Error("no token found for sync");
    }

    const cardsWithoutReviewStatus = await ctx.db
      .query("flashCards")
      .filter((q) =>
        q.and(
          q.eq(q.field("ownerId"), ownerId),
          q.eq(q.field("reviewStatus"), null)
        )
      )
      .collect();

    const authorizedCardIdToCard = new Map(
      cardsWithoutReviewStatus.map((card) => [card._id, card])
    );
    const cardsToSync = [];
    for (const card of args.cards) {
      const existingCard = authorizedCardIdToCard.get(card.id);
      if (!existingCard) {
        continue;
      }
      await ctx.db.patch(card.id, { reviewStatus: card.reviewStatus });
      cardsToSync.push({
        id: card.id,
        remoteId: existingCard.remoteId,
        reviewStatus: card.reviewStatus,
      });
    }

    if (cardsToSync.length) {
      await ctx.scheduler.runAfter(
        0,
        internal.flashCards.saveCardReviewStatusToAirtable,
        {
          ownerId,
          token: token.token,
          fsrsToken: fsrsToken.token,
          cardsToSync,
        }
      );
    }
  },
});

export const listCards = query({
  args: {},
  handler: async (ctx, {}) => {
    const ownerId = await getUserIdFromContextAsync(ctx);
    const cards = await ctx.db
      .query("flashCards")
      .filter((q) => q.eq(q.field("ownerId"), ownerId))
      .collect();
    return cards;
  },
});
