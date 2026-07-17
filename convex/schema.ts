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
    // Soft delete: si está definido, la fila se conserva para auditoría pero
    // se oculta de las listas.
    archivedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  receivables: defineTable({
    userId: v.id("users"),
    debtorName: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),

  payables: defineTable({
    userId: v.id("users"),
    creditorName: v.string(),
    reason: v.string(),
    amount: v.number(),
    archivedAt: v.optional(v.number()),
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

  // Módulo inventario: repuestos (items), modelos de auto, y la relación
  // muchos-a-muchos entre ambos (un filtro sirve para varios modelos, un
  // modelo usa varios filtros).
  items: defineTable({
    userId: v.id("users"),
    // Código de parte / número de serie del proveedor.
    sku: v.string(),
    name: v.string(),
    stock: v.number(),
    priceCents: v.optional(v.number()),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_sku", ["userId", "sku"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    })
    .searchIndex("search_sku", {
      searchField: "sku",
      filterFields: ["userId"],
    }),

  carModels: defineTable({
    userId: v.id("users"),
    // Nombre normalizado, ej. "Toyota Hilux 2018-2022".
    name: v.string(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["userId"],
    }),

  itemCompatibility: defineTable({
    userId: v.id("users"),
    itemId: v.id("items"),
    carModelId: v.id("carModels"),
  })
    .index("by_item", ["itemId"])
    .index("by_car_model", ["carModelId"])
    .index("by_item_and_car_model", ["itemId", "carModelId"]),
});
