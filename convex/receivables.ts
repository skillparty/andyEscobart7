import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertPositiveCents } from "./money";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const receivables = await ctx.db
      .query("receivables")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return receivables.filter(
      (receivable) => receivable.archivedAt === undefined,
    );
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
    assertPositiveCents(args.amount);
    return await ctx.db.insert("receivables", {
      userId,
      debtorName,
      amount: args.amount,
      note: args.note?.trim() || undefined,
    });
  },
});

export const collect = mutation({
  args: {
    id: v.id("receivables"),
    accountId: v.optional(v.id("accounts")),
    // Monto a cobrar en centavos. Si se omite, se cobra el saldo completo.
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const receivable = await ctx.db.get(args.id);
    if (receivable === null || receivable.userId !== userId) {
      throw new Error("Cuenta por cobrar no encontrada");
    }

    const collectedAmount = args.amount ?? receivable.amount;
    assertPositiveCents(collectedAmount, "El monto a cobrar");
    if (collectedAmount > receivable.amount) {
      throw new Error("El monto supera lo que te deben");
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
        balance: account.balance + collectedAmount,
      });
    }

    await ctx.db.insert("transactions", {
      userId,
      type: "collection",
      counterpartyName: receivable.debtorName,
      reason: receivable.note ?? "Cobro",
      amount: collectedAmount,
      accountId: args.accountId,
      accountName,
      bankSlug,
      paidAt: Date.now(),
    });

    const remaining = receivable.amount - collectedAmount;
    if (remaining > 0) {
      await ctx.db.patch(args.id, { amount: remaining });
    } else {
      await ctx.db.delete(args.id);
    }
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
    // Soft delete: se conserva para auditoría y se oculta de las listas.
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
