import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

/** Normaliza espacios y recorta un texto libre de usuario. */
export function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

const MODEL_LIST_DELIMITERS = /[,;/\n]+|\s+y\s+|\s*&\s*/gi;

/**
 * Divide una celda de Excel tipo "Toyota Hilux, Toyota Fortuner / Corolla"
 * en nombres de modelo individuales, normalizados y sin duplicados
 * (comparación insensible a mayúsculas, se conserva la primera variante).
 */
export function splitModelNames(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of raw.split(MODEL_LIST_DELIMITERS)) {
    const name = normalizeText(part);
    if (name.length === 0) {
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(name);
  }
  return result;
}

/** Busca un modelo de auto por nombre (case-sensitive tras normalizar); lo crea o reactiva si hace falta. */
export async function findOrCreateCarModel(
  ctx: MutationCtx,
  userId: Id<"users">,
  rawName: string,
): Promise<{ id: Id<"carModels">; created: boolean }> {
  const name = normalizeText(rawName);
  const existing = await ctx.db
    .query("carModels")
    .withIndex("by_user_and_name", (q) =>
      q.eq("userId", userId).eq("name", name),
    )
    .unique();
  if (existing !== null) {
    if (existing.archivedAt !== undefined) {
      await ctx.db.patch(existing._id, { archivedAt: undefined });
    }
    return { id: existing._id, created: false };
  }
  const id = await ctx.db.insert("carModels", { userId, name });
  return { id, created: true };
}

/** Crea el vínculo item↔modelo si no existe ya (idempotente). */
export async function linkCompatibility(
  ctx: MutationCtx,
  userId: Id<"users">,
  itemId: Id<"items">,
  carModelId: Id<"carModels">,
): Promise<{ created: boolean }> {
  const existing = await ctx.db
    .query("itemCompatibility")
    .withIndex("by_item_and_car_model", (q) =>
      q.eq("itemId", itemId).eq("carModelId", carModelId),
    )
    .unique();
  if (existing !== null) {
    return { created: false };
  }
  await ctx.db.insert("itemCompatibility", { userId, itemId, carModelId });
  return { created: true };
}
