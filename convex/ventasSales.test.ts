/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Crea un usuario y devuelve una instancia de prueba autenticada como él. */
async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

/** Proveedor + item con stock comprado (costo promedio conocido). */
async function seedStockedItem(
  as: Awaited<ReturnType<typeof withUser>>["as"],
  unitCostCents = 3000,
  quantity = 10,
) {
  const supplierId: Id<"suppliers"> = await as.mutation(
    api.compras.suppliers.create,
    { name: "Importadora Rodríguez" },
  );
  const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
    sku: "FA-100",
    name: "Filtro de aceite",
    stock: 0,
  });
  await as.mutation(api.compras.purchases.create, {
    supplierId,
    paymentType: "cash",
    lines: [{ itemId, quantity, unitPriceCents: unitCostCents }],
  });
  return itemId;
}

describe("ventas/sales", () => {
  test("venta al contado sin cuenta: descuenta stock y calcula margen", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);

    const saleId = await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "cash",
      lines: [{ itemId, quantity: 4, unitPriceCents: 5000 }],
    });

    const sale = await as.query(api.ventas.sales.get, { id: saleId });
    expect(sale.totalCents).toBe(20000);
    expect(sale.totalCostCents).toBe(12000);
    expect(sale.marginCents).toBe(8000);
    expect(sale.lines[0]).toMatchObject({
      itemSku: "FA-100",
      quantity: 4,
      unitPriceCents: 5000,
      unitCostCents: 3000,
    });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 6,
      valueCents: 18000,
      avgCostCents: 3000,
    });
  });

  test("venta al crédito genera cuenta por cobrar al cliente", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);

    await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      note: "Pedido mostrador",
      paymentType: "credit",
      lines: [{ itemId, quantity: 2, unitPriceCents: 5000 }],
    });

    const receivables = await as.query(api.receivables.list);
    expect(receivables).toHaveLength(1);
    expect(receivables[0]).toMatchObject({
      debtorName: "María Pérez",
      amount: 10000,
    });
  });

  test("venta al contado desde cuenta abona saldo y deja transacción", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);
    const accountId: Id<"accounts"> = await as.mutation(api.accounts.create, {
      name: "Banco Unión",
      balance: 10000,
    });

    await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "cash",
      accountId,
      lines: [{ itemId, quantity: 2, unitPriceCents: 5000 }],
    });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(20000);

    const transactions = await as.query(api.transactions.list);
    expect(transactions.some((tx) => tx.type === "collection")).toBe(true);
  });

  test("rechaza vender más stock del disponible, incluso sumando líneas repetidas", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);

    await expect(
      as.mutation(api.ventas.sales.create, {
        customerName: "María Pérez",
        paymentType: "cash",
        lines: [{ itemId, quantity: 11, unitPriceCents: 5000 }],
      }),
    ).rejects.toThrow(/stock insuficiente/i);

    await expect(
      as.mutation(api.ventas.sales.create, {
        customerName: "María Pérez",
        paymentType: "cash",
        lines: [
          { itemId, quantity: 6, unitPriceCents: 5000 },
          { itemId, quantity: 6, unitPriceCents: 5000 },
        ],
      }),
    ).rejects.toThrow(/stock insuficiente/i);

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0].stock).toBe(10);
  });

  test("valida líneas: vacías, cantidad y precio", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);

    await expect(
      as.mutation(api.ventas.sales.create, {
        customerName: "María Pérez",
        paymentType: "cash",
        lines: [],
      }),
    ).rejects.toThrow(/al menos un producto/i);

    await expect(
      as.mutation(api.ventas.sales.create, {
        customerName: "María Pérez",
        paymentType: "cash",
        lines: [{ itemId, quantity: 0, unitPriceCents: 100 }],
      }),
    ).rejects.toThrow(/cantidad/i);

    await expect(
      as.mutation(api.ventas.sales.create, {
        customerName: "  ",
        paymentType: "cash",
        lines: [{ itemId, quantity: 1, unitPriceCents: 100 }],
      }),
    ).rejects.toThrow(/nombre del cliente/i);
  });

  test("cancel revierte stock exacto y elimina la deuda de una venta al crédito", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);

    const saleId = await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "credit",
      lines: [{ itemId, quantity: 4, unitPriceCents: 5000 }],
    });

    await as.mutation(api.ventas.sales.cancel, { id: saleId });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 10,
      valueCents: 30000,
      avgCostCents: 3000,
    });
    expect(await as.query(api.receivables.list)).toHaveLength(0);

    const sale = await as.query(api.ventas.sales.get, { id: saleId });
    expect(sale.canceledAt).toBeDefined();

    await expect(
      as.mutation(api.ventas.sales.cancel, { id: saleId }),
    ).rejects.toThrow(/ya está anulada/i);
  });

  test("cancel devuelve el dinero abonado en una venta al contado", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);
    const accountId: Id<"accounts"> = await as.mutation(api.accounts.create, {
      name: "Banco Unión",
      balance: 10000,
    });

    const saleId = await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "cash",
      accountId,
      lines: [{ itemId, quantity: 2, unitPriceCents: 5000 }],
    });
    await as.mutation(api.ventas.sales.cancel, { id: saleId });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(10000);

    const transactions = await as.query(api.transactions.list);
    const adjustment = transactions.find((tx) => tx.type === "adjustment");
    expect(adjustment?.amount).toBe(10000);
  });

  test("cancel rechaza si la deuda ya tiene cobros aplicados", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 10);

    const saleId = await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "credit",
      lines: [{ itemId, quantity: 4, unitPriceCents: 5000 }],
    });

    const receivables = await as.query(api.receivables.list);
    await as.mutation(api.receivables.collect, {
      id: receivables[0]._id,
      amount: 5000,
    });

    await expect(
      as.mutation(api.ventas.sales.cancel, { id: saleId }),
    ).rejects.toThrow(/cobros aplicados/i);
  });

  test("marginSummary suma ingreso, costo y margen de ventas no anuladas", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await seedStockedItem(as, 3000, 20);

    await as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "cash",
      lines: [{ itemId, quantity: 4, unitPriceCents: 5000 }],
    });
    const canceledSaleId = await as.mutation(api.ventas.sales.create, {
      customerName: "Juan López",
      paymentType: "cash",
      lines: [{ itemId, quantity: 2, unitPriceCents: 6000 }],
    });
    await as.mutation(api.ventas.sales.cancel, { id: canceledSaleId });

    const summary = await as.query(api.ventas.sales.marginSummary);
    // Solo cuenta la venta activa: ingreso 20000, costo 12000, margen 8000.
    expect(summary).toMatchObject({
      totalRevenueCents: 20000,
      totalCostCents: 12000,
      totalMarginCents: 8000,
      saleCount: 1,
    });
  });

  test("no expone ventas de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const userA = await withUser(t);
    const userB = await withUser(t);
    const itemId = await seedStockedItem(userA.as, 3000, 10);

    const saleId = await userA.as.mutation(api.ventas.sales.create, {
      customerName: "María Pérez",
      paymentType: "cash",
      lines: [{ itemId, quantity: 1, unitPriceCents: 5000 }],
    });

    expect(await userB.as.query(api.ventas.sales.list)).toHaveLength(0);
    await expect(
      userB.as.query(api.ventas.sales.get, { id: saleId }),
    ).rejects.toThrow(/no encontrada/i);
  });
});
