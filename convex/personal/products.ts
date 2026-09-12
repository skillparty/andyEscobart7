import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUserId } from "../users";
import { PRELOADED_PRODUCTS } from "./seasons";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const products = await ctx.db
      .query("personalProducts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return products
      .filter((p) => p.archivedAt === undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const seedPreloaded = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("personalProducts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const existingNames = new Set(
      existing
        .filter((p) => p.archivedAt === undefined)
        .map((p) => p.name.trim().toLowerCase()),
    );

    let insertedCount = 0;
    for (const item of PRELOADED_PRODUCTS) {
      if (!existingNames.has(item.name.trim().toLowerCase())) {
        await ctx.db.insert("personalProducts", {
          userId,
          name: item.name,
          category: item.category,
          unit: item.unit,
          isPreloaded: true,
        });
        insertedCount++;
      }
    }

    return { insertedCount };
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    unit: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim();
    if (name.length === 0) {
      throw new Error("El nombre del producto es obligatorio");
    }

    return await ctx.db.insert("personalProducts", {
      userId,
      name,
      category: args.category.trim() || "General",
      unit: args.unit.trim() || "unidad",
      isPreloaded: false,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("personalProducts"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const product = await ctx.db.get(args.id);
    if (product === null || product.userId !== userId) {
      throw new Error("Producto no encontrado");
    }

    await ctx.db.patch(args.id, {
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.category !== undefined
        ? { category: args.category.trim() }
        : {}),
      ...(args.unit !== undefined ? { unit: args.unit.trim() } : {}),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("personalProducts") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const product = await ctx.db.get(args.id);
    if (product === null || product.userId !== userId) {
      throw new Error("Producto no encontrado");
    }

    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
