import { v } from "convex/values";
import { defineTable} from "convex/server";
import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { getUserIdFromContextAsync } from "./users";
import { api, internal } from "./_generated/api";
import { getTokenIfExists, TokenType } from "./tokens";
import { Id } from "./_generated/dataModel";
import { chunk } from "../lib/utils";

export enum ReviewStatus {
    EASY = "Easy",
    NORMAL = "Normal",
    DIFFICULT = "Difficult",
    WRONG = "Wrong",
}

export const FLASH_CARDS_SCHEMA =  defineTable({
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
}).index("by_owner", ["ownerId"])

// Move these to a special table too one day
const baseId = 'appX45YUZ4S3xa1Tu'
const tableId = 'tblxuY0bU1EJNyDxX'

export const getCurrentCards = internalAction({
    args: { ownerId: v.id("users"), token: v.string() },
    handler: async (ctx, args) => {
        const params = new URLSearchParams({
            view: 'Next',
            pageSize: "100",
            maxRecords: "100",
        }).toString()
        const endpointUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`
        const response = await fetch(`${endpointUrl}?${params}`, {
            headers: {
                Authorization: `Bearer ${args.token}`,
            },
        }); 
        if (!response.ok) {
            console.log(response);
            throw new Error(`HTTP error! status: ${response.status}`);
        } 
        const data = await response.json();
        await ctx.scheduler.runAfter(0, internal.flashCards.syncCurrentCards, {
            ownerId: args.ownerId, 
            records: data.records,
        })
    },
});

export const saveCardReviewStatusToAirtable = internalAction({
    args: {
        ownerId: v.id("users"), 
        token: v.string(), 
        cardsToSync : v.array(v.object({
            id: v.id("flashCards"),
            remoteId: v.string(),
            reviewStatus: v.union(
                v.literal(ReviewStatus.EASY),
                v.literal(ReviewStatus.NORMAL),
                v.literal(ReviewStatus.DIFFICULT),
                v.literal(ReviewStatus.WRONG),
            ),
        })),
    },
    handler: async (ctx, {cardsToSync, ownerId, token}) => {
        const cardIdsToClear = new Array<Id<'flashCards'>>();
        try {
            for (const batch of chunk(cardsToSync, 10)) {
                const endpointUrl = `https://api.airtable.com/v0/${baseId}/${tableId}`
                const response = await fetch(endpointUrl, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({records: batch.map((card) => ({
                        id: card.remoteId,
                        fields: {
                            "Review Status": card.reviewStatus,
                        }
                    }))}),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                for (const card of batch) {
                    cardIdsToClear.push(card.id);
                }
            }
        } catch(e) {
            console.error("Error saving updates to Airtable", e);
        }
        if (cardIdsToClear.length > 0) {
            await ctx.scheduler.runAfter(0, internal.flashCards.clearReviewStatus, {ownerId, cardIdsToClear})
        }
    },
});

export const syncCurrentCards = internalMutation({
    args: {
        ownerId: v.id('users'),
        records: v.array(v.object({
            id: v.string(),
            createdTime: v.string(),
            // String -> any
            fields: v.any(),
        }))
    },
    handler: async (ctx, {ownerId, records}) => {
        const cardsInConvex = await ctx.db
            .query("flashCards")
            .filter((q) => q.and(
                q.eq(q.field("ownerId"), ownerId),
            ))
            .collect();

        const airtableIdsInConvex = new Set(cardsInConvex.map((card) => card.remoteId));
        let newFlashCards = [];
        for (const record of records) {
            if (airtableIdsInConvex.has(record.id)) {
                // TODO: Sync the changes back? Or overwrite some things?
                continue;
            }
            newFlashCards.push({
                ownerId,
                remoteId: record.id,
                side1: record.fields["Japanese"],
                side2: (record.fields["English"] ?? "") + " " + (record.fields["Hiragana"] ?? ""),
                details: record.fields["Notes"] ?? "",
                reviewStatus: record.fields["Review Status"] ?? null,
            })
        }

        for (const newFlashCard of newFlashCards) {
            await ctx.db.insert("flashCards", newFlashCard)
        }
    },
})

export const clearReviewStatus = internalMutation({
    args: {
        ownerId: v.id('users'),
        cardIdsToClear: v.array(v.id('flashCards')),
    },
    handler: async (ctx, {ownerId, cardIdsToClear}) => {
        const cards = await ctx.db
            .query("flashCards")
            .filter((q) => q.and(
                q.eq(q.field("ownerId"), ownerId),
                q.neq(q.field("reviewStatus"), null),
            ))
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
})

export const startSyncCards = mutation({
    args: {},
    handler: async (ctx, {}) => {
        const ownerId = await getUserIdFromContextAsync(ctx)
        const token = await getTokenIfExists(ctx, { tokenType: TokenType.AIRTABLE })
        if (!token) {
            throw new Error("no token found for sync")
        }
        await ctx.scheduler.runAfter(0, internal.flashCards.getCurrentCards, {ownerId, token: token.token})
    },
})

export const startSaveReviewStatus = mutation({
    args: {},
    handler: async (ctx, {}) => {
        const ownerId = await getUserIdFromContextAsync(ctx)
        const token = await getTokenIfExists(ctx, { tokenType: TokenType.AIRTABLE })
        if (!token) {
            throw new Error("no token found for sync")
        }
        const cardsWithReviewStatus = await ctx.db
            .query("flashCards")
            .filter((q) => q.and(
                q.eq(q.field("ownerId"), ownerId),
                q.neq(q.field("reviewStatus"), null),
            ))
            .collect();

        const cardsToSync = cardsWithReviewStatus
            .map((card) => ({
                id: card._id,
                remoteId: card.remoteId,
                // null values were filtered out by the query
                reviewStatus: card.reviewStatus as ReviewStatus,
            }));
        if (cardsToSync.length) {
            await ctx.scheduler.runAfter(
                0, 
                internal.flashCards.saveCardReviewStatusToAirtable, {
                    ownerId, token: token.token, cardsToSync,
                },
            )
        }
    },
});

export const listCards = query({
    args: {},
    handler: async (ctx, {}) => {
        const ownerId = await getUserIdFromContextAsync(ctx)
        const cards = await ctx.db
            .query("flashCards")
            .filter((q) => q.eq(q.field("ownerId"), ownerId))
            .collect();
        return cards;
    },
})