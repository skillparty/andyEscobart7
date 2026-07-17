import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation } from "../_generated/server";
import { assertBalanceCents } from "../money";
import { requireUserId } from "../users";
import {
  findOrCreateCarModel,
  linkCompatibility,
  normalizeText,
  splitModelNames,
} from "./lib";

// Tope por llamada para quedar dentro de los límites de una transacción de
// Convex. El frontend debe partir el Excel en lotes de este tamaño.
export const MAX_ROWS_PER_IMPORT = 300;

export type ImportRow = {
  sku: string;
  name: string;
  stock?: number;
  priceCents?: number;
  // Celda cruda de "modelos compatibles", ej. "Hilux, Fortuner / Corolla".
  modelsRaw?: string;
};

export type ImportSummary = {
  itemsCreated: number;
  itemsUpdated: number;
  modelsCreated: number;
  compatibilityLinksCreated: number;
  // Filas inválidas que se saltaron, con el motivo (nunca se aborta el lote completo por una fila mala).
  errors: Array<{ row: number; message: string }>;
};

const rowValidator = v.object({
  sku: v.string(),
  name: v.string(),
  stock: v.optional(v.number()),
  priceCents: v.optional(v.number()),
  modelsRaw: v.optional(v.string()),
});

export const importRows = mutation({
  args: { rows: v.array(rowValidator) },
  handler: async (ctx, args): Promise<ImportSummary> => {
    const userId = await requireUserId(ctx);
    if (args.rows.length > MAX_ROWS_PER_IMPORT) {
      throw new Error(
        `Máximo ${MAX_ROWS_PER_IMPORT} filas por importación; divide el archivo en lotes más pequeños`,
      );
    }

    const summary: ImportSummary = {
      itemsCreated: 0,
      itemsUpdated: 0,
      modelsCreated: 0,
      compatibilityLinksCreated: 0,
      errors: [],
    };

    for (const [index, row] of args.rows.entries()) {
      const rowNumber = index + 1;
      const sku = normalizeText(row.sku);
      const name = normalizeText(row.name);
      if (sku.length === 0) {
        summary.errors.push({ row: rowNumber, message: "código/serie vacío" });
        continue;
      }
      if (name.length === 0) {
        summary.errors.push({ row: rowNumber, message: "nombre vacío" });
        continue;
      }
      const stock = row.stock ?? 0;
      if (!Number.isInteger(stock) || stock < 0) {
        summary.errors.push({
          row: rowNumber,
          message: "stock inválido (debe ser entero ≥ 0)",
        });
        continue;
      }
      if (row.priceCents !== undefined) {
        try {
          assertBalanceCents(row.priceCents, "El precio");
        } catch (error: unknown) {
          const message =
            error instanceof Error ? error.message : String(error);
          summary.errors.push({ row: rowNumber, message });
          continue;
        }
      }

      const existingItem = await ctx.db
        .query("items")
        .withIndex("by_user_and_sku", (q) =>
          q.eq("userId", userId).eq("sku", sku),
        )
        .unique();

      let itemId: Id<"items">;
      if (existingItem === null) {
        itemId = await ctx.db.insert("items", {
          userId,
          sku,
          name,
          stock,
          priceCents: row.priceCents,
        });
        summary.itemsCreated += 1;
      } else {
        await ctx.db.patch(existingItem._id, {
          name,
          stock,
          priceCents: row.priceCents ?? existingItem.priceCents,
          archivedAt: undefined,
        });
        itemId = existingItem._id;
        summary.itemsUpdated += 1;
      }

      const modelNames = splitModelNames(row.modelsRaw ?? "");
      for (const modelName of modelNames) {
        const model = await findOrCreateCarModel(ctx, userId, modelName);
        if (model.created) {
          summary.modelsCreated += 1;
        }
        const link = await linkCompatibility(ctx, userId, itemId, model.id);
        if (link.created) {
          summary.compatibilityLinksCreated += 1;
        }
      }
    }

    return summary;
  },
});
