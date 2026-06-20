import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertCents } from "./money";
import { requireUserId } from "./users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    balance: v.number(),
    bankSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (name.length === 0) {
      throw new Error("El nombre de la cuenta es obligatorio");
    }
    assertCents(args.balance, "El saldo");
    return await ctx.db.insert("accounts", {
      userId,
      name,
      balance: args.balance,
      bankSlug: args.bankSlug,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.optional(v.string()),
    balance: v.optional(v.number()),
    bankSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(args.id);
    if (account === null || account.userId !== userId) {
      throw new Error("Cuenta no encontrada");
    }

    const newName = args.name !== undefined ? args.name.trim() : account.name;

    if (args.balance !== undefined) {
      assertCents(args.balance, "El saldo");
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined ? { name: newName } : {}),
      ...(args.balance !== undefined ? { balance: args.balance } : {}),
      ...(args.bankSlug !== undefined ? { bankSlug: args.bankSlug } : {}),
    });

    // Editar el saldo a mano deja rastro en el historial para que el balance
    // siempre cuadre con las transacciones. El monto guarda el delta con signo.
    if (args.balance !== undefined && args.balance !== account.balance) {
      await ctx.db.insert("transactions", {
        userId,
        type: "adjustment",
        counterpartyName: newName,
        reason: "Ajuste manual de saldo",
        amount: args.balance - account.balance,
        accountId: args.id,
        accountName: newName,
        bankSlug: account.bankSlug,
        paidAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const account = await ctx.db.get(args.id);
    if (account === null || account.userId !== userId) {
      throw new Error("Cuenta no encontrada");
    }
    await ctx.db.delete(args.id);
  },
});
