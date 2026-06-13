import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("payables")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    creditorName: v.string(),
    reason: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const creditorName = args.creditorName.trim();
    const reason = args.reason.trim();
    if (creditorName.length === 0) {
      throw new Error("El nombre del acreedor es obligatorio");
    }
    if (reason.length === 0) {
      throw new Error("La razón o descripción es obligatoria");
    }
    if (args.amount <= 0) {
      throw new Error("El monto debe ser mayor que cero");
    }
    return await ctx.db.insert("payables", {
      userId,
      creditorName,
      reason,
      amount: args.amount,
    });
  },
});

export const pay = mutation({
  args: {
    id: v.id("payables"),
    accountId: v.optional(v.id("accounts")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const payable = await ctx.db.get(args.id);
    if (payable === null || payable.userId !== userId) {
      throw new Error("Cuenta por pagar no encontrada");
    }

    let accountName: string | undefined;
    let bankSlug: string | undefined;

    if (args.accountId !== undefined) {
      const account = await ctx.db.get(args.accountId);
      if (account === null || account.userId !== userId) {
        throw new Error("Cuenta bancaria no encontrada");
      }
      accountName = account.name;
      bankSlug = account.bankSlug;
      await ctx.db.patch(args.accountId, {
        balance: account.balance - payable.amount,
      });
    }

    await ctx.db.insert("transactions", {
      userId,
      type: "payment",
      counterpartyName: payable.creditorName,
      reason: payable.reason,
      amount: payable.amount,
      accountId: args.accountId,
      accountName,
      bankSlug,
      paidAt: Date.now(),
    });

    await ctx.db.delete(args.id);
  },
});

export const remove = mutation({
  args: { id: v.id("payables") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const payable = await ctx.db.get(args.id);
    if (payable === null || payable.userId !== userId) {
      throw new Error("Cuenta por pagar no encontrada");
    }
    await ctx.db.delete(args.id);
  },
});
