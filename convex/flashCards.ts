import { v } from "convex/values";
import { defineTable } from "convex/server";
import {
  query,
  mutation,
  internalAction,
  internalMutation,
} from "./_generated/server";
import { getUserIdFromContextAsync } from "./users";
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
    v.null(),
  ),
}).index("by_owner", ["ownerId"]);

// Move these to a special table too one day
const baseId = "appX45YUZ4S3xa1Tu";
const tableId = "tblxuY0bU1EJNyDxX";

export const getCurrentCards = internalAction({
  args: { ownerId: v.id("users"), token: v.string() },
  handler: async (ctx, args) => {
    let offset: string | undefined = undefined;
    let done = false;
    let allRecords = [];
    const pageSize = 100;
    while (!done) {
      const params = new URLSearchParams({
        view: "Next",
        pageSize: `${pageSize}`,
        ...(offset != undefined ? { offset: offset as string } : {}),
      }).toString();
      const endpointUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
      const response = await fetch(`${endpointUrl}?${params}`, {
        headers: {
          Authorization: `Bearer ${args.token}`,
        },
      });
      if (!response.ok) {
        console.log(response);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // See docs: https://airtable.com/developers/web/api/list-records#response
      const data: {
        records: Array<{
          id: string;
          fields: {};
          createdTime: string;
        }>;
        offset?: string;
      } = await response.json();
      for (const record of data.records) {
        allRecords.push(record);
      }
      if (data.records.length < pageSize) {
        done = true;
      } else {
        offset = data.offset;
      }
    }
    await ctx.scheduler.runAfter(0, internal.flashCards.syncCurrentCards, {
      ownerId: args.ownerId,
      records: allRecords,
    });
  },
});

export const saveCardReviewStatusToAirtable = internalAction({
  args: {
    ownerId: v.id("users"),
    token: v.string(),
    cardsToSync: v.array(
      v.object({
        id: v.id("flashCards"),
        remoteId: v.string(),
        reviewStatus: v.union(
          v.literal(ReviewStatus.EASY),
          v.literal(ReviewStatus.NORMAL),
          v.literal(ReviewStatus.DIFFICULT),
          v.literal(ReviewStatus.WRONG),
        ),
      }),
    ),
  },
  handler: async (ctx, { cardsToSync, ownerId, token }) => {
    const cardIdsToClear = new Array<Id<"flashCards">>();
    try {
      for (const batch of chunk(cardsToSync, 10)) {
        const endpointUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`;
        const response = await fetch(endpointUrl, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            records: batch.map((card) => ({
              id: card.remoteId,
              fields: {
                "Review Status": card.reviewStatus,
              },
            })),
          }),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        for (const card of batch) {
          cardIdsToClear.push(card.id);
        }
      }
    } catch (e) {
      console.error("Error saving updates to Airtable", e);
    }
    if (cardIdsToClear.length > 0) {
      await ctx.scheduler.runAfter(0, internal.flashCards.clearReviewStatus, {
        ownerId,
        cardIdsToClear,
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
          q.neq(q.field("reviewStatus"), null),
        ),
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
