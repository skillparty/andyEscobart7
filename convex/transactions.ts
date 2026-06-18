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
 * Revierte una transacción (pago o cobro): deshace su efecto financiero.
 * - Pago: devuelve el monto al saldo de la cuenta y reabre la deuda por pagar.
 * - Cobro: descuenta el monto del saldo de la cuenta y reabre la deuda por
 *   cobrar.
 * En ambos casos la deuda se fusiona con una idéntica si aún existe; si no,
 * se recrea. Finalmente elimina la transacción del historial.
 */
export const reverse = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const tx = await ctx.db.get(args.id);
    if (tx === null || tx.userId !== userId) {
      throw new Error("Transacción no encontrada");
    }
    if (tx.type === "adjustment") {
      throw new Error(
        "Un ajuste de saldo no se revierte; edita el saldo de nuevo",
      );
    }

    const isPayment = tx.type === "payment";

    // Pago salió de la cuenta -> al revertir entra; cobro entró -> al revertir sale.
    if (tx.accountId !== undefined) {
      const account = await ctx.db.get(tx.accountId);
      if (account !== null && account.userId === userId) {
        const restored = isPayment
          ? account.balance + tx.amount
          : account.balance - tx.amount;
        await ctx.db.patch(tx.accountId, { balance: restored });
      }
    }

    if (isPayment) {
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
    } else {
      const existing = await ctx.db
        .query("receivables")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const match = existing.find(
        (r) =>
          r.debtorName === tx.counterpartyName &&
          (r.note ?? "Cobro") === tx.reason,
      );
      if (match !== undefined) {
        await ctx.db.patch(match._id, { amount: match.amount + tx.amount });
      } else {
        await ctx.db.insert("receivables", {
          userId,
          debtorName: tx.counterpartyName,
          amount: tx.amount,
          note: tx.reason === "Cobro" ? undefined : tx.reason,
        });
      }
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
