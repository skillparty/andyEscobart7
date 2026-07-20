import { query } from "../_generated/server";
import { requireUserId } from "../users";
import { averageCostCents } from "./lib";

const MAX_ITEMS = 500;

/** Inventario valorado por repuesto: stock, costo promedio derivado y valor total. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(MAX_ITEMS);

    return items
      .filter((item) => item.archivedAt === undefined)
      .map((item) => ({
        _id: item._id,
        sku: item.sku,
        name: item.name,
        stock: item.stock,
        valueCents: item.valueCents ?? 0,
        avgCostCents: averageCostCents(item.stock, item.valueCents),
      }))
      .sort((a, b) => b.valueCents - a.valueCents);
  },
});

/** Totales de la valoración: valor de todo el inventario e ítems sin costo conocido. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("items")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .take(MAX_ITEMS);
    const active = items.filter((item) => item.archivedAt === undefined);

    const totalValueCents = active.reduce(
      (sum, item) => sum + (item.valueCents ?? 0),
      0,
    );
    const totalStock = active.reduce((sum, item) => sum + item.stock, 0);
    const itemsWithoutCost = active.filter(
      (item) => item.stock > 0 && (item.valueCents ?? 0) === 0,
    ).length;

    return { totalValueCents, totalStock, itemsWithoutCost };
  },
});
