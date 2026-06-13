import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
    await ctx.db.patch(args.id, {
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.balance !== undefined ? { balance: args.balance } : {}),
      ...(args.bankSlug !== undefined ? { bankSlug: args.bankSlug } : {}),
    });
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
