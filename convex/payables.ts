import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertPositiveCents } from "./money";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const payables = await ctx.db
      .query("payables")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return payables.filter((payable) => payable.archivedAt === undefined);
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
    assertPositiveCents(args.amount);
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
    // Monto a pagar en centavos. Si se omite, se paga el saldo completo.
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const payable = await ctx.db.get(args.id);
    if (payable === null || payable.userId !== userId) {
      throw new Error("Cuenta por pagar no encontrada");
    }

    const paidAmount = args.amount ?? payable.amount;
    assertPositiveCents(paidAmount, "El monto a pagar");
    if (paidAmount > payable.amount) {
      throw new Error("El monto supera lo que debes");
    }

    let accountName: string | undefined;
    let bankSlug: string | undefined;

    if (args.accountId !== undefined) {
      const account = await ctx.db.get(args.accountId);
      if (account === null || account.userId !== userId) {
        throw new Error("Cuenta bancaria no encontrada");
      }
      if (account.balance < paidAmount) {
        throw new Error("Saldo insuficiente en la cuenta seleccionada");
      }
      accountName = account.name;
      bankSlug = account.bankSlug;
      await ctx.db.patch(args.accountId, {
        balance: account.balance - paidAmount,
      });
    }

    await ctx.db.insert("transactions", {
      userId,
      type: "payment",
      counterpartyName: payable.creditorName,
      reason: payable.reason,
      amount: paidAmount,
      accountId: args.accountId,
      accountName,
      bankSlug,
      paidAt: Date.now(),
    });

    const remaining = payable.amount - paidAmount;
    if (remaining > 0) {
      await ctx.db.patch(args.id, { amount: remaining });
    } else {
      await ctx.db.delete(args.id);
    }
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
    // Soft delete: se conserva para auditoría y se oculta de las listas.
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
