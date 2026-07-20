import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { mutation, query } from "../_generated/server";
import { normalizeText } from "../inventario/lib";
import { assertPositiveCents } from "../money";
import { requireUserId } from "../users";

const MAX_LINES_PER_PURCHASE = 100;
const RECENT_PURCHASES_LIMIT = 100;
const PRICE_HISTORY_LIMIT = 60;

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
      .query("purchases")
      .withIndex("by_user_and_purchasedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(RECENT_PURCHASES_LIMIT);
  },
});

export const get = query({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const purchase = await ctx.db.get(args.id);
    if (purchase === null || purchase.userId !== userId) {
      throw new Error("Compra no encontrada");
    }
    const lines = await ctx.db
      .query("purchaseLines")
      .withIndex("by_purchase", (q) => q.eq("purchaseId", args.id))
      .take(MAX_LINES_PER_PURCHASE);
    return { ...purchase, lines };
  },
});

/**
 * Historial de precios de compra de un repuesto, más reciente primero.
 * Cada línea de compra es un punto de precio con fecha.
 */
export const priceHistory = query({
  args: { itemId: v.id("items") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(args.itemId);
    if (item === null || item.userId !== userId) {
      throw new Error("Repuesto no encontrado");
    }
    const lines = await ctx.db
      .query("purchaseLines")
      .withIndex("by_item_and_purchasedAt", (q) => q.eq("itemId", args.itemId))
      .order("desc")
      .take(PRICE_HISTORY_LIMIT);
    return lines.map((line) => ({
      purchasedAt: line.purchasedAt,
      unitPriceCents: line.unitPriceCents,
      quantity: line.quantity,
    }));
  },
});

export const create = mutation({
  args: {
    supplierId: v.id("suppliers"),
    invoiceNumber: v.optional(v.string()),
    // Fecha de la compra; por defecto ahora. Permite registrar compras pasadas.
    purchasedAt: v.optional(v.number()),
    paymentType: v.union(v.literal("cash"), v.literal("credit")),
    // Contado: cuenta desde la que salió el dinero (opcional = efectivo suelto).
    accountId: v.optional(v.id("accounts")),
    lines: v.array(lineValidator),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);

    const supplier = await ctx.db.get(args.supplierId);
    if (
      supplier === null ||
      supplier.userId !== userId ||
      supplier.archivedAt !== undefined
    ) {
      throw new Error("Proveedor no encontrado");
    }

    if (args.lines.length === 0) {
      throw new Error("La compra debe tener al menos un producto");
    }
    if (args.lines.length > MAX_LINES_PER_PURCHASE) {
      throw new Error(
        `La compra no puede tener más de ${MAX_LINES_PER_PURCHASE} líneas`,
      );
    }
    if (args.paymentType === "credit" && args.accountId !== undefined) {
      throw new Error("Una compra al crédito no descuenta de una cuenta");
    }

    const purchasedAt = args.purchasedAt ?? Date.now();
    if (!Number.isInteger(purchasedAt) || purchasedAt <= 0) {
      throw new Error("La fecha de compra no es válida");
    }

    // Validar líneas y resolver items antes de escribir nada.
    let totalCents = 0;
    const resolvedLines: {
      itemId: (typeof args.lines)[number]["itemId"];
      itemSku: string;
      itemName: string;
      quantity: number;
      unitPriceCents: number;
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
      totalCents += line.quantity * line.unitPriceCents;
      resolvedLines.push({
        itemId: line.itemId,
        itemSku: item.sku,
        itemName: item.name,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
      });
    }
    assertPositiveCents(totalCents, "El total de la compra");

    const invoiceNumber = args.invoiceNumber
      ? normalizeText(args.invoiceNumber)
      : undefined;
    const reference = invoiceNumber
      ? `Compra factura ${invoiceNumber}`
      : "Compra de mercadería";

    // Pago al contado desde una cuenta: descuenta saldo y deja transacción.
    let accountName: string | undefined;
    let bankSlug: string | undefined;
    if (args.paymentType === "cash" && args.accountId !== undefined) {
      const account = await ctx.db.get(args.accountId);
      if (account === null || account.userId !== userId) {
        throw new Error("Cuenta bancaria no encontrada");
      }
      if (account.balance < totalCents) {
        throw new Error("Saldo insuficiente en la cuenta seleccionada");
      }
      accountName = account.name;
      bankSlug = account.bankSlug;
      await ctx.db.patch(args.accountId, {
        balance: account.balance - totalCents,
      });
      await ctx.db.insert("transactions", {
        userId,
        type: "payment",
        counterpartyName: supplier.name,
        reason: reference,
        amount: totalCents,
        accountId: args.accountId,
        accountName,
        bankSlug,
        paidAt: purchasedAt,
      });
    }

    // Compra al crédito: genera la cuenta por pagar al proveedor.
    let payableId: Id<"payables"> | undefined;
    if (args.paymentType === "credit") {
      payableId = await ctx.db.insert("payables", {
        userId,
        creditorName: supplier.name,
        reason: reference,
        amount: totalCents,
      });
    }

    const purchaseId = await ctx.db.insert("purchases", {
      userId,
      supplierId: args.supplierId,
      supplierName: supplier.name,
      invoiceNumber,
      purchasedAt,
      totalCents,
      paymentType: args.paymentType,
      accountId: args.paymentType === "cash" ? args.accountId : undefined,
      payableId,
    });

    // Líneas + efectos en inventario: entra stock y se actualiza último costo.
    for (const line of resolvedLines) {
      await ctx.db.insert("purchaseLines", {
        userId,
        purchaseId,
        itemId: line.itemId,
        itemSku: line.itemSku,
        itemName: line.itemName,
        quantity: line.quantity,
        unitPriceCents: line.unitPriceCents,
        purchasedAt,
      });
      const item = await ctx.db.get(line.itemId);
      if (item !== null) {
        await ctx.db.patch(line.itemId, {
          stock: item.stock + line.quantity,
          lastCostCents: line.unitPriceCents,
        });
      }
    }

    return purchaseId;
  },
});

/**
 * Anula una compra: revierte el stock, el pago o la deuda, y marca la fila
 * como anulada. La compra nunca se borra — queda para auditoría.
 */
export const cancel = mutation({
  args: { id: v.id("purchases") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const purchase = await ctx.db.get(args.id);
    if (purchase === null || purchase.userId !== userId) {
      throw new Error("Compra no encontrada");
    }
    if (purchase.canceledAt !== undefined) {
      throw new Error("La compra ya está anulada");
    }

    const lines = await ctx.db
      .query("purchaseLines")
      .withIndex("by_purchase", (q) => q.eq("purchaseId", args.id))
      .take(MAX_LINES_PER_PURCHASE);

    // Verificar todo antes de revertir nada (la mutación es transaccional,
    // pero validar primero da mensajes de error limpios).
    for (const line of lines) {
      const item = await ctx.db.get(line.itemId);
      if (item !== null && item.stock < line.quantity) {
        throw new Error(
          `No se puede anular: el stock actual de ${line.itemName} es menor al de la compra`,
        );
      }
    }

    if (purchase.paymentType === "credit" && purchase.payableId !== undefined) {
      const payable = await ctx.db.get(purchase.payableId);
      if (payable === null || payable.amount !== purchase.totalCents) {
        throw new Error(
          "No se puede anular: la deuda de esta compra ya tiene pagos aplicados",
        );
      }
      await ctx.db.delete(purchase.payableId);
    }

    if (purchase.paymentType === "cash" && purchase.accountId !== undefined) {
      const account = await ctx.db.get(purchase.accountId);
      if (account === null) {
        throw new Error("No se puede anular: la cuenta de pago ya no existe");
      }
      await ctx.db.patch(purchase.accountId, {
        balance: account.balance + purchase.totalCents,
      });
      await ctx.db.insert("transactions", {
        userId,
        type: "adjustment",
        counterpartyName: purchase.supplierName,
        reason: `Anulación de ${purchase.invoiceNumber ? `compra factura ${purchase.invoiceNumber}` : "compra de mercadería"}`,
        amount: purchase.totalCents,
        accountId: purchase.accountId,
        accountName: account.name,
        bankSlug: account.bankSlug,
        paidAt: Date.now(),
      });
    }

    for (const line of lines) {
      const item = await ctx.db.get(line.itemId);
      if (item !== null) {
        await ctx.db.patch(line.itemId, {
          stock: item.stock - line.quantity,
        });
      }
    }

    await ctx.db.patch(args.id, { canceledAt: Date.now() });
  },
});
