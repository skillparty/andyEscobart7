import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export type StockMovementType =
  | "opening"
  | "purchase"
  | "purchase_reversal"
  | "adjustment";

interface ApplyStockMovementArgs {
  userId: Id<"users">;
  itemId: Id<"items">;
  type: StockMovementType;
  // Positivo = entrada, negativo = salida.
  quantityDelta: number;
  // Debe ser exacto para el tipo de movimiento (ver kardex/README en cada
  // llamador): reversar una compra usa el precio original de la línea, no
  // el costo promedio actual; vaciar el stock a cero fuerza el valor a
  // exactamente cero en vez de arrastrar residuos de redondeo.
  valueDeltaCents: number;
  reference?: string;
  purchaseId?: Id<"purchases">;
  occurredAt: number;
}

/**
 * Aplica un movimiento de stock valorado: actualiza el saldo del repuesto
 * (stock + valueCents) e inserta la fila inmutable en el kardex con los
 * saldos resultantes. Nunca se reescribe un movimiento pasado — una
 * corrección siempre es un movimiento nuevo.
 */
export async function applyStockMovement(
  ctx: MutationCtx,
  args: ApplyStockMovementArgs,
): Promise<void> {
  const item = await ctx.db.get(args.itemId);
  if (item === null) {
    throw new Error("Repuesto no encontrado");
  }

  const balanceQuantity = item.stock + args.quantityDelta;
  if (balanceQuantity < 0) {
    throw new Error(`Stock insuficiente para este movimiento en ${item.name}`);
  }
  const balanceValueCents = (item.valueCents ?? 0) + args.valueDeltaCents;
  if (balanceValueCents < 0) {
    throw new Error(
      `El movimiento dejaría un valor de inventario negativo en ${item.name}`,
    );
  }

  await ctx.db.patch(args.itemId, {
    stock: balanceQuantity,
    valueCents: balanceValueCents,
  });

  await ctx.db.insert("stockMovements", {
    userId: args.userId,
    itemId: args.itemId,
    type: args.type,
    quantityDelta: args.quantityDelta,
    valueDeltaCents: args.valueDeltaCents,
    balanceQuantity,
    balanceValueCents,
    reference: args.reference,
    purchaseId: args.purchaseId,
    occurredAt: args.occurredAt,
  });
}

/**
 * Costo promedio ponderado (CPP) actual, derivado del pool de valor.
 * Se deriva en cada lectura en vez de almacenarse para no acumular error
 * de redondeo al recalcular un promedio sobre otro promedio.
 */
export function averageCostCents(
  stock: number,
  valueCents: number | undefined,
): number {
  if (stock <= 0 || valueCents === undefined || valueCents <= 0) {
    return 0;
  }
  return Math.round(valueCents / stock);
}
