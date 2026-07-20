import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { normalizeText } from "../inventario/lib";
import { applyStockMovement, averageCostCents } from "../kardex/lib";
import { assertPositiveCents } from "../money";
import { requireUserId } from "../users";

const MAX_LINES_PER_SALE = 100;
const RECENT_SALES_LIMIT = 100;

const lineValidator = v.object({
  itemId: v.id("items"),
  quantity: v.number(),
  unitPriceCents: v.number(),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("sales")
      .withIndex("by_user_and_soldAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(RECENT_SALES_LIMIT);
  },
});

export const get = query({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sale = await ctx.db.get(args.id);
    if (sale === null || sale.userId !== userId) {
      throw new Error("Venta no encontrada");
    }
    const lines = await ctx.db
      .query("saleLines")
      .withIndex("by_sale", (q) => q.eq("saleId", args.id))
      .take(MAX_LINES_PER_SALE);
    return { ...sale, lines };
  },
});

/**
 * Totales de margen sobre las ventas recientes no anuladas: ingreso, costo
 * (COGS al costo promedio congelado por venta) y margen resultante.
 */
export const marginSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const sales = await ctx.db
      .query("sales")
      .withIndex("by_user_and_soldAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(RECENT_SALES_LIMIT);
    const active = sales.filter((sale) => sale.canceledAt === undefined);

    const totalRevenueCents = active.reduce((sum, s) => sum + s.totalCents, 0);
    const totalCostCents = active.reduce((sum, s) => sum + s.totalCostCents, 0);

    return {
      totalRevenueCents,
      totalCostCents,
      totalMarginCents: totalRevenueCents - totalCostCents,
      saleCount: active.length,
    };
  },
});

export const create = mutation({
  args: {
    customerName: v.string(),
    note: v.optional(v.string()),
    // Fecha de la venta; por defecto ahora. Permite registrar ventas pasadas.
    soldAt: v.optional(v.number()),
    paymentType: v.union(v.literal("cash"), v.literal("credit")),
    // Contado: cuenta donde entra el dinero (opcional = efectivo suelto).
    accountId: v.optional(v.id("accounts")),
    lines: v.array(lineValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const customerName = normalizeText(args.customerName);
    if (customerName.length === 0) {
      throw new Error("El nombre del cliente es obligatorio");
    }

    if (args.lines.length === 0) {
      throw new Error("La venta debe tener al menos un producto");
    }
    if (args.lines.length > MAX_LINES_PER_SALE) {
      throw new Error(
        `La venta no puede tener más de ${MAX_LINES_PER_SALE} líneas`,
      );
    }
    if (args.paymentType === "credit" && args.accountId !== undefined) {
      throw new Error("Una venta al crédito no deposita en una cuenta");
    }

    const soldAt = args.soldAt ?? Date.now();
    if (!Number.isInteger(soldAt) || soldAt <= 0) {
      throw new Error("La fecha de venta no es válida");
    }

    // Validar líneas, congelar el costo promedio de cada una y controlar
    // que la suma de cantidades del mismo repuesto no supere el stock
    // disponible (una sola lectura de item.stock no basta si el repuesto
    // se repite en varias líneas de la misma venta).
    let totalCents = 0;
    let totalCostCents = 0;
    const reserved = new Map<Id<"items">, number>();
    const resolvedLines: {
      itemId: Id<"items">;
      itemSku: string;
      itemName: string;
      quantity: number;
      unitPriceCents: number;
      unitCostCents: number;
    }[] = [];
    for (const line of args.lines) {
      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new Error("La cantidad debe ser un entero mayor que cero");
      }
      assertPositiveCents(line.unitPriceCents, "El precio unitario");
      const item = await ctx.db.get(line.itemId);
      if (item === null || item.userId !== userId) {
        throw new Error("Repuesto no encontrado");
      }

      const alreadyReserved = reserved.get(line.itemId) ?? 0;
      const available = item.stock - alreadyReserved;
      if (available < line.quantity) {
        throw new Error(
          `Stock insuficiente: quedan ${available} unidades de ${item.name}`,
        );
      }
      reserved.set(line.itemId, alreadyReserved + line.quantity);

      const unitCostCents = averageCostCents(item.stock, item.valueCents);
      totalCents += line.quantity * line.unitPriceCents;
      totalCostCents += line.quantity * unitCostCents;
      resolvedLines.push({
        itemId: line.itemId,
        itemSku: item.sku,
        itemName: item.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        unitCostCents,
      });
    }
    assertPositiveCents(totalCents, "El total de la venta");

    const note = args.note ? normalizeText(args.note) : undefined;
    const reference = note ? `Venta: ${note}` : `Venta a ${customerName}`;

    // Cobro al contado a una cuenta: la abona y deja transacción.
    let accountName: string | undefined;
    let bankSlug: string | undefined;
    if (args.paymentType === "cash" && args.accountId !== undefined) {
      const account = await ctx.db.get(args.accountId);
      if (account === null || account.userId !== userId) {
        throw new Error("Cuenta bancaria no encontrada");
      }
      accountName = account.name;
      bankSlug = account.bankSlug;
      await ctx.db.patch(args.accountId, {
        balance: account.balance + totalCents,
      });
      await ctx.db.insert("transactions", {
        userId,
        type: "collection",
        counterpartyName: customerName,
        reason: reference,
        amount: totalCents,
        accountId: args.accountId,
        accountName,
        bankSlug,
        paidAt: soldAt,
      });
    }

    // Venta al crédito: genera la cuenta por cobrar al cliente.
    let receivableId: Id<"receivables"> | undefined;
    if (args.paymentType === "credit") {
      receivableId = await ctx.db.insert("receivables", {
        userId,
        debtorName: customerName,
        amount: totalCents,
        note: reference,
      });
    }

    const saleId = await ctx.db.insert("sales", {
      userId,
      customerName,
      note,
      soldAt,
      totalCents,
      totalCostCents,
      marginCents: totalCents - totalCostCents,
      paymentType: args.paymentType,
      accountId: args.paymentType === "cash" ? args.accountId : undefined,
      receivableId,
    });

    // Líneas + kardex: sale stock valorado al costo promedio congelado.
    for (const line of resolvedLines) {
      await ctx.db.insert("saleLines", {
        userId,
        saleId,
        itemId: line.itemId,
        itemSku: line.itemSku,
        itemName: line.itemName,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        unitCostCents: line.unitCostCents,
        soldAt,
      });
      await applyStockMovement(ctx, {
        userId,
        itemId: line.itemId,
        type: "sale",
        quantityDelta: -line.quantity,
        valueDeltaCents: -(line.quantity * line.unitCostCents),
        reference,
        saleId,
        occurredAt: soldAt,
      });
    }

    return saleId;
  },
});

/**
 * Anula una venta: devuelve el stock (al costo congelado de la línea), y
 * revierte el cobro o la deuda. La venta nunca se borra — queda para
 * auditoría, igual que una compra anulada.
 */
export const cancel = mutation({
  args: { id: v.id("sales") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const sale = await ctx.db.get(args.id);
    if (sale === null || sale.userId !== userId) {
      throw new Error("Venta no encontrada");
    }
    if (sale.canceledAt !== undefined) {
      throw new Error("La venta ya está anulada");
    }

    const lines = await ctx.db
      .query("saleLines")
      .withIndex("by_sale", (q) => q.eq("saleId", args.id))
      .take(MAX_LINES_PER_SALE);

    if (sale.paymentType === "credit" && sale.receivableId !== undefined) {
      const receivable = await ctx.db.get(sale.receivableId);
      if (receivable === null || receivable.amount !== sale.totalCents) {
        throw new Error(
          "No se puede anular: la deuda de esta venta ya tiene cobros aplicados",
        );
      }
      await ctx.db.delete(sale.receivableId);
    }

    if (sale.paymentType === "cash" && sale.accountId !== undefined) {
      const account = await ctx.db.get(sale.accountId);
      if (account === null) {
        throw new Error("No se puede anular: la cuenta de cobro ya no existe");
      }
      if (account.balance < sale.totalCents) {
        throw new Error(
          "No se puede anular: la cuenta no tiene saldo suficiente para revertir el cobro",
        );
      }
      await ctx.db.patch(sale.accountId, {
        balance: account.balance - sale.totalCents,
      });
      await ctx.db.insert("transactions", {
        userId,
        type: "adjustment",
        counterpartyName: sale.customerName,
        reason: `Anulación de venta${sale.note ? `: ${sale.note}` : ""}`,
        amount: sale.totalCents,
        accountId: sale.accountId,
        accountName: account.name,
        bankSlug: account.bankSlug,
        paidAt: Date.now(),
      });
    }

    const cancelReference = sale.note
      ? `Anulación de venta: ${sale.note}`
      : `Anulación de venta a ${sale.customerName}`;
    for (const line of lines) {
      await applyStockMovement(ctx, {
        userId,
        itemId: line.itemId,
        type: "sale_reversal",
        quantityDelta: line.quantity,
        // Revierte exactamente lo que esta venta quitó del pool de valor,
        // al costo congelado en la línea (no al costo promedio actual).
        valueDeltaCents: line.quantity * line.unitCostCents,
        reference: cancelReference,
        saleId: sale._id,
        occurredAt: Date.now(),
      });
    }

    await ctx.db.patch(args.id, { canceledAt: Date.now() });
  },
});
