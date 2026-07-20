import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { applyStockMovement, averageCostCents } from "../kardex/lib";
import { assertBalanceCents } from "../money";
import { requireUserId } from "../users";
import { normalizeText } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return items.filter((item) => item.archivedAt === undefined);
  },
});

export const create = mutation({
  args: {
    sku: v.string(),
    name: v.string(),
    stock: v.number(),
    priceCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sku = normalizeText(args.sku);
    const name = normalizeText(args.name);
    if (sku.length === 0) {
      throw new Error("El código o número de serie es obligatorio");
    }
    if (name.length === 0) {
      throw new Error("El nombre del repuesto es obligatorio");
    }
    if (!Number.isInteger(args.stock) || args.stock < 0) {
      throw new Error("El stock debe ser un entero mayor o igual a cero");
    }
    if (args.priceCents !== undefined) {
      assertBalanceCents(args.priceCents, "El precio");
    }

    const existing = await ctx.db
      .query("items")
      .withIndex("by_user_and_sku", (q) =>
        q.eq("userId", userId).eq("sku", sku),
      )
      .unique();
    if (existing !== null && existing.archivedAt === undefined) {
      throw new Error("Ya existe un repuesto con ese código o número de serie");
    }

    const itemId = await ctx.db.insert("items", {
      userId,
      sku,
      name,
      stock: 0,
      priceCents: args.priceCents,
    });

    if (args.stock > 0) {
      await applyStockMovement(ctx, {
        userId,
        itemId,
        type: "opening",
        quantityDelta: args.stock,
        // Costo desconocido al crear el repuesto: la valoración se vuelve
        // confiable recién con la primera compra registrada.
        valueDeltaCents: 0,
        reference: "Stock inicial",
        occurredAt: Date.now(),
      });
    }

    return itemId;
  },
});

export const update = mutation({
  args: {
    id: v.id("items"),
    name: v.optional(v.string()),
    stock: v.optional(v.number()),
    priceCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.id);
    if (item === null || item.userId !== userId) {
      throw new Error("Repuesto no encontrado");
    }

    const patch: Partial<{ name: string; priceCents: number }> = {};
    if (args.name !== undefined) {
      const name = normalizeText(args.name);
      if (name.length === 0) {
        throw new Error("El nombre del repuesto es obligatorio");
      }
      patch.name = name;
    }
    if (args.stock !== undefined) {
      if (!Number.isInteger(args.stock) || args.stock < 0) {
        throw new Error("El stock debe ser un entero mayor o igual a cero");
      }
    }
    if (args.priceCents !== undefined) {
      assertBalanceCents(args.priceCents, "El precio");
      patch.priceCents = args.priceCents;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.id, patch);
    }

    // Cambio de stock manual: se registra como movimiento de kardex (tipo
    // "adjustment"), no como un patch directo, para que el ledger sea la
    // fuente de verdad de todo cambio de cantidad.
    if (args.stock !== undefined && args.stock !== item.stock) {
      const delta = args.stock - item.stock;
      const isEmptying = args.stock === 0;
      const unitCostCents =
        averageCostCents(item.stock, item.valueCents) ||
        (item.lastCostCents ?? 0);
      const valueDeltaCents = isEmptying
        ? -(item.valueCents ?? 0)
        : delta * unitCostCents;
      await applyStockMovement(ctx, {
        userId,
        itemId: args.id,
        type: "adjustment",
        quantityDelta: delta,
        valueDeltaCents,
        reference: "Ajuste manual de stock",
        occurredAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.id);
    if (item === null || item.userId !== userId) {
      throw new Error("Repuesto no encontrado");
    }
    // Soft delete: se conserva para no romper el historial de compatibilidad.
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
