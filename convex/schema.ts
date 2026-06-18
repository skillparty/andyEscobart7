import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    balance: v.number(),
    bankSlug: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  receivables: defineTable({
    userId: v.id("users"),
    debtorName: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  payables: defineTable({
    userId: v.id("users"),
    creditorName: v.string(),
    reason: v.string(),
    amount: v.number(),
  }).index("by_user", ["userId"]),

  transactions: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("payment"),
      v.literal("collection"),
      v.literal("adjustment"),
    ),
    counterpartyName: v.string(),
    reason: v.string(),
    amount: v.number(),
    accountId: v.optional(v.id("accounts")),
    accountName: v.optional(v.string()),
    bankSlug: v.optional(v.string()),
    paidAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_time", ["userId", "paidAt"]),
});
