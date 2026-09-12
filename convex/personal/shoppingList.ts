import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { requireUserId } from "../users";
import { getSeasonForDate } from "./seasons";

export interface ShoppingListItemWithDetails {
  _id: Id<"shoppingList">;
  _creationTime: number;
  productId?: Id<"personalProducts">;
  name: string;
  category?: string;
  targetQuantity: number;
  unit: string;
  isCompleted: boolean;
  completedAt?: number;
  notes?: string;
  isOpportunity: boolean; // ¿Está en buen momento de compra según temporada / precio?
  latestPrice?: number;
  bestStore?: string;
}

export const list = query({
  args: {},
  handler: async (ctx): Promise<ShoppingListItemWithDetails[]> => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("shoppingList")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const productIds = Array.from(
      new Set(
        items
          .map((i) => i.productId)
          .filter((id): id is Id<"personalProducts"> => id !== undefined),
      ),
    );

    const productDocs = await Promise.all(
      productIds.map((id) => ctx.db.get(id)),
    );
    const productMap = new Map<
      Id<"personalProducts">,
      Doc<"personalProducts">
    >();
    for (const p of productDocs) {
      if (p) productMap.set(p._id, p);
    }

    const currentSeason = getSeasonForDate(Date.now());
    const result: ShoppingListItemWithDetails[] = [];

    for (const item of items) {
      let isOpportunity = false;
      let latestPrice: number | undefined;
      let bestStore: string | undefined;

      const product = item.productId
        ? productMap.get(item.productId)
        : undefined;
      const name = product ? product.name : (item.customName ?? "Artículo");
      const unit = product ? product.unit : (item.unit ?? "unid");
      const category = product ? product.category : "General";

      if (item.productId) {
        const pid = item.productId;
        const records = await ctx.db
          .query("personalPriceRecords")
          .withIndex("by_product_and_purchasedAt", (q) =>
            q.eq("productId", pid),
          )
          .order("asc")
          .collect();

        const activeRecords = records.filter(
          (r) => r.userId === userId && r.archivedAt === undefined,
        );

        if (activeRecords.length > 0) {
          latestPrice = activeRecords[activeRecords.length - 1].priceCents;

          // Encontrar la tienda con el precio más bajo registrado
          let minCents = Number.POSITIVE_INFINITY;
          for (const r of activeRecords) {
            if (r.storeName && r.priceCents < minCents) {
              minCents = r.priceCents;
              bestStore = r.storeName;
            }
          }

          if (activeRecords.length >= 2) {
            const prices = activeRecords.map((r) => r.priceCents);
            const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
            const seasonRecords = activeRecords.filter(
              (r) => r.season === currentSeason,
            );
            const seasonAvg =
              seasonRecords.length > 0
                ? seasonRecords.reduce((s, r) => s + r.priceCents, 0) /
                  seasonRecords.length
                : null;

            const diffAvg = ((latestPrice - avg) / avg) * 100;
            const diffSeason = seasonAvg
              ? ((latestPrice - seasonAvg) / seasonAvg) * 100
              : null;

            if (diffAvg <= -6 || (diffSeason !== null && diffSeason <= -8)) {
              isOpportunity = true;
            }
          }
        }
      }

      result.push({
        _id: item._id,
        _creationTime: item._creationTime,
        productId: item.productId,
        name,
        category,
        targetQuantity: item.targetQuantity ?? 1,
        unit,
        isCompleted: item.isCompleted,
        completedAt: item.completedAt,
        notes: item.notes,
        isOpportunity,
        latestPrice,
        bestStore,
      });
    }

    // Ordenar: pendientes primero (con oportunidades arriba), completados al final
    return result.sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      if (a.isOpportunity !== b.isOpportunity) {
        return a.isOpportunity ? -1 : 1;
      }
      return b._creationTime - a._creationTime;
    });
  },
});

export const add = mutation({
  args: {
    productId: v.optional(v.id("personalProducts")),
    customName: v.optional(v.string()),
    targetQuantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    if (!args.productId && !args.customName?.trim()) {
      throw new Error("Debes indicar un producto o nombre de artículo");
    }

    return await ctx.db.insert("shoppingList", {
      userId,
      productId: args.productId,
      customName: args.customName?.trim() || undefined,
      targetQuantity:
        args.targetQuantity && args.targetQuantity > 0
          ? args.targetQuantity
          : 1,
      unit: args.unit?.trim() || undefined,
      isCompleted: false,
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("shoppingList") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.id);
    if (item === null || item.userId !== userId) {
      throw new Error("Artículo de lista no encontrado");
    }

    const nextCompleted = !item.isCompleted;
    await ctx.db.patch(args.id, {
      isCompleted: nextCompleted,
      completedAt: nextCompleted ? Date.now() : undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("shoppingList") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.id);
    if (item === null || item.userId !== userId) {
      throw new Error("Artículo de lista no encontrado");
    }

    await ctx.db.delete(args.id);
  },
});

export const clearCompleted = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const completedItems = await ctx.db
      .query("shoppingList")
      .withIndex("by_user_and_completed", (q) =>
        q.eq("userId", userId).eq("isCompleted", true),
      )
      .collect();

    for (const item of completedItems) {
      await ctx.db.delete(item._id);
    }

    return { deletedCount: completedItems.length };
  },
});
