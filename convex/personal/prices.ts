import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { assertPositiveCents } from "../money";
import { requireUserId } from "../users";
import { getSeasonForDate, type Season } from "./seasons";

export const create = mutation({
  args: {
    productId: v.id("personalProducts"),
    priceCents: v.number(),
    quantity: v.optional(v.number()),
    purchasedAt: v.number(),
    storeName: v.optional(v.string()),
    accountId: v.optional(v.id("accounts")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const product = await ctx.db.get(args.productId);
    if (product === null || product.userId !== userId) {
      throw new Error("Producto no encontrado");
    }

    assertPositiveCents(args.priceCents, "El precio");
    const quantity =
      args.quantity !== undefined && args.quantity > 0 ? args.quantity : 1;
    const totalCents = Math.round(args.priceCents * quantity);
    const season = getSeasonForDate(args.purchasedAt);

    let transactionId: Id<"transactions"> | undefined;

    // Si se vinculó una cuenta, descontar el saldo y registrar la transacción
    if (args.accountId !== undefined) {
      const account = await ctx.db.get(args.accountId);
      if (account === null || account.userId !== userId) {
        throw new Error("Cuenta bancaria no encontrada");
      }

      await ctx.db.patch(args.accountId, {
        balance: account.balance - totalCents,
      });

      const storeSuffix = args.storeName?.trim()
        ? ` (${args.storeName.trim()})`
        : "";
      transactionId = await ctx.db.insert("transactions", {
        userId,
        type: "payment",
        counterpartyName: product.name,
        reason: `Compra personal: ${quantity} ${product.unit}${storeSuffix}`,
        amount: totalCents,
        accountId: args.accountId,
        accountName: account.name,
        bankSlug: account.bankSlug,
        paidAt: args.purchasedAt,
      });
    }

    return await ctx.db.insert("personalPriceRecords", {
      userId,
      productId: args.productId,
      priceCents: args.priceCents,
      quantity,
      totalCents,
      purchasedAt: args.purchasedAt,
      storeName: args.storeName?.trim() || undefined,
      season,
      accountId: args.accountId,
      transactionId,
      note: args.note?.trim() || undefined,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("personalPriceRecords") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const record = await ctx.db.get(args.id);
    if (record === null || record.userId !== userId) {
      throw new Error("Registro de precio no encontrado");
    }

    // Si generó transacción bancaria, revertir el saldo y eliminar la transacción
    if (record.transactionId !== undefined && record.accountId !== undefined) {
      const account = await ctx.db.get(record.accountId);
      const tx = await ctx.db.get(record.transactionId);
      if (account !== null && tx !== null) {
        await ctx.db.patch(account._id, {
          balance: account.balance + tx.amount,
        });
        await ctx.db.delete(tx._id);
      }
    }

    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const limit = args.limit ?? 30;

    const records = await ctx.db
      .query("personalPriceRecords")
      .withIndex("by_user_and_purchasedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit * 2);

    const activeRecords = records
      .filter((r) => r.archivedAt === undefined)
      .slice(0, limit);

    const productIds = Array.from(
      new Set(activeRecords.map((r) => r.productId)),
    );
    const productDocs = await Promise.all(
      productIds.map((id) => ctx.db.get(id)),
    );
    const productMap = new Map<
      Id<"personalProducts">,
      Doc<"personalProducts">
    >();
    for (const doc of productDocs) {
      if (doc) productMap.set(doc._id, doc);
    }

    return activeRecords.map((r) => ({
      ...r,
      product: productMap.get(r.productId) ?? null,
    }));
  },
});

export const listByProduct = query({
  args: { productId: v.id("personalProducts") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const records = await ctx.db
      .query("personalPriceRecords")
      .withIndex("by_product_and_purchasedAt", (q) =>
        q.eq("productId", args.productId),
      )
      .order("asc")
      .collect();

    return records.filter(
      (r) => r.userId === userId && r.archivedAt === undefined,
    );
  },
});

export interface ProductAnalysis {
  productId: Id<"personalProducts">;
  productName: string;
  category: string;
  unit: string;
  recordsCount: number;
  latestPrice: number | null;
  latestDate: number | null;
  previousPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  currentSeason: Season;
  currentSeasonAvg: number | null;
  trendVsPrevPercent: number | null;
  trendVsAvgPercent: number | null;
  trendVsSeasonPercent: number | null;
  recommendation: {
    status: "good_time" | "stable" | "expensive" | "insufficient_data";
    badge: string;
    advice: string;
    tone: "positive" | "neutral" | "debt" | "soft";
  };
}

export const getAnalysis = query({
  args: { productId: v.optional(v.id("personalProducts")) },
  handler: async (ctx, args): Promise<ProductAnalysis[]> => {
    const userId = await requireUserId(ctx);
    const now = Date.now();
    const currentSeason = getSeasonForDate(now);

    let products: Doc<"personalProducts">[] = [];
    if (args.productId !== undefined) {
      const p = await ctx.db.get(args.productId);
      if (p && p.userId === userId && p.archivedAt === undefined) {
        products = [p];
      }
    } else {
      const all = await ctx.db
        .query("personalProducts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      products = all.filter((p) => p.archivedAt === undefined);
    }

    const analyses: ProductAnalysis[] = [];

    for (const product of products) {
      const records = await ctx.db
        .query("personalPriceRecords")
        .withIndex("by_product_and_purchasedAt", (q) =>
          q.eq("productId", product._id),
        )
        .order("asc")
        .collect();

      const activeRecords = records.filter(
        (r) => r.userId === userId && r.archivedAt === undefined,
      );

      if (activeRecords.length === 0) {
        analyses.push({
          productId: product._id,
          productName: product.name,
          category: product.category,
          unit: product.unit,
          recordsCount: 0,
          latestPrice: null,
          latestDate: null,
          previousPrice: null,
          minPrice: null,
          maxPrice: null,
          avgPrice: null,
          currentSeason,
          currentSeasonAvg: null,
          trendVsPrevPercent: null,
          trendVsAvgPercent: null,
          trendVsSeasonPercent: null,
          recommendation: {
            status: "insufficient_data",
            badge: "Sin datos",
            advice: "Aún no registras compras con precio para este producto.",
            tone: "soft",
          },
        });
        continue;
      }

      // Precios ordenados por fecha ascendente
      const prices = activeRecords.map((r) => r.priceCents);
      const latestRecord = activeRecords[activeRecords.length - 1];
      const previousRecord =
        activeRecords.length > 1
          ? activeRecords[activeRecords.length - 2]
          : null;

      const latestPrice = latestRecord.priceCents;
      const previousPrice = previousRecord ? previousRecord.priceCents : null;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(
        prices.reduce((sum, p) => sum + p, 0) / prices.length,
      );

      // Precios de la estación actual
      const seasonRecords = activeRecords.filter(
        (r) => r.season === currentSeason,
      );
      const currentSeasonAvg =
        seasonRecords.length > 0
          ? Math.round(
              seasonRecords.reduce((sum, r) => sum + r.priceCents, 0) /
                seasonRecords.length,
            )
          : null;

      const trendVsPrevPercent =
        previousPrice !== null
          ? Math.round(((latestPrice - previousPrice) / previousPrice) * 100)
          : null;

      const trendVsAvgPercent = Math.round(
        ((latestPrice - avgPrice) / avgPrice) * 100,
      );

      const trendVsSeasonPercent =
        currentSeasonAvg !== null
          ? Math.round(
              ((latestPrice - currentSeasonAvg) / currentSeasonAvg) * 100,
            )
          : null;

      // Determinación de la recomendación inteligente de compra
      let status: "good_time" | "stable" | "expensive" | "insufficient_data" =
        "stable";
      let badge = "Precio normal";
      let advice = "El precio se encuentra dentro del promedio habitual.";
      let tone: "positive" | "neutral" | "debt" | "soft" = "neutral";

      if (activeRecords.length < 2) {
        status = "insufficient_data";
        badge = "Datos iniciales";
        advice =
          "Se requiere al menos otro registro en diferente fecha para comparar variaciones y temporadas.";
        tone = "soft";
      } else if (
        trendVsAvgPercent <= -6 ||
        (trendVsSeasonPercent !== null && trendVsSeasonPercent <= -8)
      ) {
        status = "good_time";
        badge = "¡Buen momento para comprar!";
        const percentSavings = Math.abs(
          trendVsSeasonPercent ?? trendVsAvgPercent,
        );
        advice = `El precio está ~${percentSavings}% más bajo que el promedio. Conviene abastecerse antes de que suba.`;
        tone = "positive";
      } else if (
        trendVsAvgPercent >= 8 ||
        (trendVsSeasonPercent !== null && trendVsSeasonPercent >= 10)
      ) {
        status = "expensive";
        badge = "Precio alto / Esperar";
        const percentIncrease = trendVsSeasonPercent ?? trendVsAvgPercent;
        advice = `El precio ha subido ~${percentIncrease}% por encima de lo habitual. Sugerencia: comprar solo lo necesario o esperar a la temporada de baja.`;
        tone = "debt";
      } else {
        status = "stable";
        badge = "Precio estable";
        advice = `El precio se mantiene estable en el rango promedio de temporada (${currentSeason}).`;
        tone = "neutral";
      }

      analyses.push({
        productId: product._id,
        productName: product.name,
        category: product.category,
        unit: product.unit,
        recordsCount: activeRecords.length,
        latestPrice,
        latestDate: latestRecord.purchasedAt,
        previousPrice,
        minPrice,
        maxPrice,
        avgPrice,
        currentSeason,
        currentSeasonAvg,
        trendVsPrevPercent,
        trendVsAvgPercent,
        trendVsSeasonPercent,
        recommendation: {
          status,
          badge,
          advice,
          tone,
        },
      });
    }

    return analyses.sort((a, b) => {
      // Priorizar los productos que son buen momento para comprar, luego los de precio alto
      const priorityOrder = {
        good_time: 0,
        expensive: 1,
        stable: 2,
        insufficient_data: 3,
      };
      return (
        priorityOrder[a.recommendation.status] -
        priorityOrder[b.recommendation.status]
      );
    });
  },
});

export interface StoreComparison {
  storeName: string;
  minPrice: number;
  avgPrice: number;
  latestPrice: number;
  recordsCount: number;
  isBestPrice: boolean;
}

export const getStoreComparison = query({
  args: { productId: v.id("personalProducts") },
  handler: async (ctx, args): Promise<StoreComparison[]> => {
    const userId = await requireUserId(ctx);
    const records = await ctx.db
      .query("personalPriceRecords")
      .withIndex("by_product_and_purchasedAt", (q) =>
        q.eq("productId", args.productId),
      )
      .order("asc")
      .collect();

    const activeRecords = records.filter(
      (r) =>
        r.userId === userId &&
        r.archivedAt === undefined &&
        r.storeName !== undefined &&
        r.storeName.trim() !== "",
    );

    if (activeRecords.length === 0) {
      return [];
    }

    const storesMap = new Map<string, typeof activeRecords>();
    for (const r of activeRecords) {
      const name = r.storeName ? r.storeName.trim() : "Sin tienda";
      const list = storesMap.get(name) ?? [];
      list.push(r);
      storesMap.set(name, list);
    }

    let absoluteMin = Number.POSITIVE_INFINITY;
    for (const r of activeRecords) {
      if (r.priceCents < absoluteMin) absoluteMin = r.priceCents;
    }

    const result: StoreComparison[] = [];
    for (const [storeName, list] of storesMap.entries()) {
      const prices = list.map((r) => r.priceCents);
      const minPrice = Math.min(...prices);
      const avgPrice = Math.round(
        prices.reduce((s, p) => s + p, 0) / prices.length,
      );
      const latestPrice = list[list.length - 1].priceCents;

      result.push({
        storeName,
        minPrice,
        avgPrice,
        latestPrice,
        recordsCount: list.length,
        isBestPrice: minPrice === absoluteMin,
      });
    }

    return result.sort((a, b) => a.minPrice - b.minPrice);
  },
});
