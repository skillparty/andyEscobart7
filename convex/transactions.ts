import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_time", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/**
 * Revierte un pago registrado: deshace su efecto financiero.
 * - Devuelve el monto al saldo de la cuenta usada (si sigue existiendo).
 * - Reabre la deuda: la suma a una "por pagar" idéntica si aún existe,
 *   o la recrea.
 * - Elimina la transacción del historial.
 */
export const reverse = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tx = await ctx.db.get(args.id);
    if (tx === null || tx.userId !== userId) {
      throw new Error("Transacción no encontrada");
    }
    if (tx.type !== "payment") {
      throw new Error("Solo se pueden revertir pagos");
    }

    if (tx.accountId !== undefined) {
      const account = await ctx.db.get(tx.accountId);
      if (account !== null && account.userId === userId) {
        await ctx.db.patch(tx.accountId, {
          balance: account.balance + tx.amount,
        });
      }
    }

    const existing = await ctx.db
      .query("payables")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const match = existing.find(
      (p) => p.creditorName === tx.counterpartyName && p.reason === tx.reason,
    );

    if (match !== undefined) {
      await ctx.db.patch(match._id, { amount: match.amount + tx.amount });
    } else {
      await ctx.db.insert("payables", {
        userId,
        creditorName: tx.counterpartyName,
        reason: tx.reason,
        amount: tx.amount,
      });
    }

    await ctx.db.delete(args.id);
  },
});

export const listByRange = query({
  args: {
    fromTs: v.number(),
    toTs: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("transactions")
      .withIndex("by_user_time", (q) =>
        q
          .eq("userId", userId)
          .gte("paidAt", args.fromTs)
          .lte("paidAt", args.toTs),
      )
      .order("desc")
      .collect();
  },
});
