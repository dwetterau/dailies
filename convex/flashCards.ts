import { v } from "convex/values";
import { defineTable} from "convex/server";
import { query, mutation, internalAction, internalMutation } from "./_generated/server";
import { getUserIdFromContextAsync } from "./users";
import { api, internal } from "./_generated/api";
import { getTokenIfExists, TokenType } from "./tokens";


export const FLASH_CARDS_SCHEMA =  defineTable({
  ownerId: v.string(),
  remoteId: v.string(),
  side1: v.string(),
  side2: v.string(),
  details: v.string(),
}).index("by_owner", ["ownerId"])

export const getCurrentCards = internalAction({
    args: { ownerId: v.id("users"), token: v.string() },
    handler: async (ctx, args) => {
        // Move these to a special table too one day
        const baseId = 'appX45YUZ4S3xa1Tu'
        const tableId = 'tblxuY0bU1EJNyDxX'

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
            })
        }

        for (const newFlashCard of newFlashCards) {
            await ctx.db.insert("flashCards", newFlashCard)
        }
    },
})

export const listCards = query({
    args: {},
    handler: async (ctx, {}) => {
        const ownerId = await getUserIdFromContextAsync(ctx)
        return await ctx.db
            .query("flashCards")
            .filter((q) => q.eq(q.field("ownerId"), ownerId))
            .collect();
    },
})