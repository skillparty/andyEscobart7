import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUserId } from "../users";
import { linkCompatibility } from "./lib";

export const link = mutation({
  args: { itemId: v.id("items"), carModelId: v.id("carModels") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.userId !== userId) {
      throw new Error("Repuesto no encontrado");
    }
    const model = await ctx.db.get(args.carModelId);
    if (model === null || model.userId !== userId) {
      throw new Error("Modelo de auto no encontrado");
    }
    await linkCompatibility(ctx, userId, args.itemId, args.carModelId);
  },
});

export const unlink = mutation({
  args: { itemId: v.id("items"), carModelId: v.id("carModels") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const existingLink = await ctx.db
      .query("itemCompatibility")
      .withIndex("by_item_and_car_model", (q) =>
        q.eq("itemId", args.itemId).eq("carModelId", args.carModelId),
      )
      .unique();
    if (existingLink === null || existingLink.userId !== userId) {
      throw new Error("Vínculo no encontrado");
    }
    await ctx.db.delete(existingLink._id);
  },
});

export const listModelsForItem = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.userId !== userId) {
      throw new Error("Repuesto no encontrado");
    }
    const links = await ctx.db
      .query("itemCompatibility")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
    const models = await Promise.all(
      links.map((link) => ctx.db.get(link.carModelId)),
    );
    return models.filter(
      (model): model is NonNullable<typeof model> =>
        model !== null && model.archivedAt === undefined,
    );
  },
});

export const listItemsForModel = query({
  args: { carModelId: v.id("carModels") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const model = await ctx.db.get(args.carModelId);
    if (model === null || model.userId !== userId) {
      throw new Error("Modelo de auto no encontrado");
    }
    const links = await ctx.db
      .query("itemCompatibility")
      .withIndex("by_car_model", (q) => q.eq("carModelId", args.carModelId))
      .collect();
    const items = await Promise.all(
      links.map((link) => ctx.db.get(link.itemId)),
    );
    return items.filter(
      (item): item is NonNullable<typeof item> =>
        item !== null && item.archivedAt === undefined,
    );
  },
});
