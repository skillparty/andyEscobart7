import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireUserId } from "../users";

const MOVEMENTS_LIMIT = 100;

/** Ledger cronológico de movimientos de stock de un repuesto, reciente primero. */
export const listByItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.userId !== userId) {
      throw new Error("Repuesto no encontrado");
    }

    return await ctx.db
      .query("stockMovements")
      .withIndex("by_item_and_occurredAt", (q) => q.eq("itemId", args.itemId))
      .order("desc")
      .take(MOVEMENTS_LIMIT);
  },
});
