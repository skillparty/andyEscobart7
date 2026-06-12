import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("receivables")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    debtorName: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const debtorName = args.debtorName.trim();
    if (debtorName.length === 0) {
      throw new Error("El nombre del deudor es obligatorio");
    }
    if (args.amount <= 0) {
      throw new Error("El monto debe ser mayor que cero");
    }
    return await ctx.db.insert("receivables", {
      userId,
      debtorName,
      amount: args.amount,
      note: args.note?.trim() || undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("receivables") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const receivable = await ctx.db.get(args.id);
    if (receivable === null || receivable.userId !== userId) {
      throw new Error("Cuenta por cobrar no encontrada");
    }
    await ctx.db.delete(args.id);
  },
});
