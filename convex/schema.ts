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
    // Precio de venta al cliente.
    priceCents: v.optional(v.number()),
    // Último costo de compra (se actualiza al registrar compras). Separado
    // del precio de venta para poder calcular margen.
    lastCostCents: v.optional(v.number()),
    // Valor total del stock actual, en centavos (pool de valor). Fuente de
    // verdad del kardex: el costo promedio ponderado se deriva como
    // valueCents / stock en vez de almacenarse, para no acumular error de
    // redondeo al recalcular un promedio sobre otro promedio.
    valueCents: v.optional(v.number()),
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

  // Módulo compras: registro documental de a quién se compró, qué y a cuánto.
  // Las líneas de compra son la fuente de verdad del historial de precios.
  suppliers: defineTable({
    userId: v.id("users"),
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  purchases: defineTable({
    userId: v.id("users"),
    supplierId: v.id("suppliers"),
    // Snapshot del nombre: el historial no cambia si se renombra el proveedor.
    supplierName: v.string(),
    invoiceNumber: v.optional(v.string()),
    purchasedAt: v.number(),
    // Suma de las líneas, denormalizada para listar sin leerlas.
    totalCents: v.number(),
    paymentType: v.union(v.literal("cash"), v.literal("credit")),
    // Contado: cuenta desde la que se pagó (opcional, puede ser efectivo).
    accountId: v.optional(v.id("accounts")),
    // Crédito: cuenta por pagar generada por esta compra.
    payableId: v.optional(v.id("payables")),
    // Anulación: revierte stock y pago; la fila se conserva para auditoría.
    canceledAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_purchasedAt", ["userId", "purchasedAt"])
    .index("by_supplier", ["supplierId"]),

  purchaseLines: defineTable({
    userId: v.id("users"),
    purchaseId: v.id("purchases"),
    itemId: v.id("items"),
    // Snapshots: la línea describe lo comprado aunque el item cambie después.
    itemSku: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    unitPriceCents: v.number(),
    // Denormalizado de purchases.purchasedAt para el historial de precios.
    purchasedAt: v.number(),
  })
    .index("by_purchase", ["purchaseId"])
    .index("by_item_and_purchasedAt", ["itemId", "purchasedAt"]),

  // Kardex: ledger inmutable de cada movimiento de stock valorado. Nunca se
  // edita ni se borra una fila — una corrección se registra como un nuevo
  // movimiento de tipo "adjustment", igual que un asiento contable.
  stockMovements: defineTable({
    userId: v.id("users"),
    itemId: v.id("items"),
    type: v.union(
      v.literal("opening"), // stock inicial declarado al crear el repuesto
      v.literal("purchase"), // entrada por compra
      v.literal("purchase_reversal"), // anulación de una compra
      v.literal("adjustment"), // corrección manual de stock
    ),
    // Positivo = entrada, negativo = salida.
    quantityDelta: v.number(),
    // Cambio en el valor total del stock (centavos), coherente con quantityDelta.
    valueDeltaCents: v.number(),
    // Saldos después de aplicar este movimiento (lectura directa, sin sumar
    // el historial completo cada vez).
    balanceQuantity: v.number(),
    balanceValueCents: v.number(),
    reference: v.optional(v.string()),
    purchaseId: v.optional(v.id("purchases")),
    occurredAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_item_and_occurredAt", ["itemId", "occurredAt"]),
});
