import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUserId } from "../users";
import { normalizeText } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const models = await ctx.db
      .query("carModels")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return models.filter((model) => model.archivedAt === undefined);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = normalizeText(args.name);
    if (name.length === 0) {
      throw new Error("El nombre del modelo es obligatorio");
    }

    const existing = await ctx.db
      .query("carModels")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", userId).eq("name", name),
      )
      .unique();
    if (existing !== null && existing.archivedAt === undefined) {
      throw new Error("Ya existe un modelo de auto con ese nombre");
    }

    return await ctx.db.insert("carModels", { userId, name });
  },
});

export const update = mutation({
  args: { id: v.id("carModels"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const model = await ctx.db.get(args.id);
    if (model === null || model.userId !== userId) {
      throw new Error("Modelo de auto no encontrado");
    }
    const name = normalizeText(args.name);
    if (name.length === 0) {
      throw new Error("El nombre del modelo es obligatorio");
    }
    await ctx.db.patch(args.id, { name });
  },
});

export const remove = mutation({
  args: { id: v.id("carModels") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const model = await ctx.db.get(args.id);
    if (model === null || model.userId !== userId) {
      throw new Error("Modelo de auto no encontrado");
    }
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
