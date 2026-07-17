import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireUserId } from "../users";

const MAX_RESULTS = 20;

/** Repuestos que calzan con `term` (por nombre o por código/serie), con sus modelos de auto compatibles. */
export const searchItems = query({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const term = args.term.trim();
    if (term.length === 0) {
      return [];
    }

    const [byName, bySku] = await Promise.all([
      ctx.db
        .query("items")
        .withSearchIndex("search_name", (q) =>
          q.search("name", term).eq("userId", userId),
        )
        .take(MAX_RESULTS),
      ctx.db
        .query("items")
        .withSearchIndex("search_sku", (q) =>
          q.search("sku", term).eq("userId", userId),
        )
        .take(MAX_RESULTS),
    ]);

    const seen = new Set<string>();
    const items: Doc<"items">[] = [];
    for (const item of [...byName, ...bySku]) {
      if (item.archivedAt !== undefined || seen.has(item._id)) {
        continue;
      }
      seen.add(item._id);
      items.push(item);
    }

    return await Promise.all(
      items.slice(0, MAX_RESULTS).map(async (item) => {
        const links = await ctx.db
          .query("itemCompatibility")
          .withIndex("by_item", (q) => q.eq("itemId", item._id))
          .collect();
        const models = await Promise.all(
          links.map((link) => ctx.db.get(link.carModelId)),
        );
        return {
          item,
          models: models.filter(
            (model): model is Doc<"carModels"> =>
              model !== null && model.archivedAt === undefined,
          ),
        };
      }),
    );
  },
});

/** Modelos de auto que calzan con `term`, con los repuestos compatibles de cada uno. */
export const searchCarModels = query({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const term = args.term.trim();
    if (term.length === 0) {
      return [];
    }

    const matches = await ctx.db
      .query("carModels")
      .withSearchIndex("search_name", (q) =>
        q.search("name", term).eq("userId", userId),
      )
      .take(MAX_RESULTS);
    const models = matches.filter((model) => model.archivedAt === undefined);

    return await Promise.all(
      models.map(async (model) => {
        const links = await ctx.db
          .query("itemCompatibility")
          .withIndex("by_car_model", (q) => q.eq("carModelId", model._id))
          .collect();
        const items = await Promise.all(
          links.map((link) => ctx.db.get(link.itemId)),
        );
        return {
          model,
          items: items.filter(
            (item): item is Doc<"items"> =>
              item !== null && item.archivedAt === undefined,
          ),
        };
      }),
    );
  },
});
