import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // Cuentas bancarias del usuario: nombre y saldo actual.
  accounts: defineTable({
    userId: v.id("users"),
    name: v.string(),
    balance: v.number(),
  }).index("by_user", ["userId"]),

  // Cuentas por cobrar: quién me debe y cuánto.
  receivables: defineTable({
    userId: v.id("users"),
    debtorName: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  // Cuentas por pagar: a quién debo, razón y monto.
  payables: defineTable({
    userId: v.id("users"),
    creditorName: v.string(),
    reason: v.string(),
    amount: v.number(),
  }).index("by_user", ["userId"]),
});
