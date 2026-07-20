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

/** Proveedor + item base para armar compras en los tests. */
async function seedBasics(as: Awaited<ReturnType<typeof withUser>>["as"]) {
  const supplierId: Id<"suppliers"> = await as.mutation(
    api.compras.suppliers.create,
    { name: "Importadora Rodríguez" },
  );
  const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
    sku: "FA-100",
    name: "Filtro de aceite",
    stock: 10,
  });
  return { supplierId, itemId };
}

describe("compras/purchases", () => {
  test("compra al contado sin cuenta: suma stock y registra líneas", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);

    const purchaseId = await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 5, unitPriceCents: 3500 }],
    });

    const purchase = await as.query(api.compras.purchases.get, {
      id: purchaseId,
    });
    expect(purchase.totalCents).toBe(17500);
    expect(purchase.supplierName).toBe("Importadora Rodríguez");
    expect(purchase.lines).toHaveLength(1);
    expect(purchase.lines[0]).toMatchObject({
      itemSku: "FA-100",
      quantity: 5,
      unitPriceCents: 3500,
    });

    const items = await as.query(api.inventario.items.list);
    expect(items[0].stock).toBe(15);
    expect(items[0].lastCostCents).toBe(3500);
  });

  test("compra al crédito genera cuenta por pagar al proveedor", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      invoiceNumber: "F-0042",
      paymentType: "credit",
      lines: [{ itemId, quantity: 2, unitPriceCents: 10000 }],
    });

    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(1);
    expect(payables[0]).toMatchObject({
      creditorName: "Importadora Rodríguez",
      amount: 20000,
    });
    expect(payables[0].reason).toMatch(/F-0042/);
  });

  test("compra al contado desde cuenta descuenta saldo y deja transacción", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);
    const accountId: Id<"accounts"> = await as.mutation(api.accounts.create, {
      name: "Banco Unión",
      balance: 50000,
    });

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      accountId,
      lines: [{ itemId, quantity: 1, unitPriceCents: 30000 }],
    });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(20000);

    const transactions = await as.query(api.transactions.list);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      type: "payment",
      counterpartyName: "Importadora Rodríguez",
      amount: 30000,
    });
  });

  test("rechaza saldo insuficiente sin efectos parciales", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);
    const accountId: Id<"accounts"> = await as.mutation(api.accounts.create, {
      name: "Banco Unión",
      balance: 1000,
    });

    await expect(
      as.mutation(api.compras.purchases.create, {
        supplierId,
        paymentType: "cash",
        accountId,
        lines: [{ itemId, quantity: 1, unitPriceCents: 30000 }],
      }),
    ).rejects.toThrow(/saldo insuficiente/i);

    const items = await as.query(api.inventario.items.list);
    expect(items[0].stock).toBe(10);
    expect(await as.query(api.compras.purchases.list)).toHaveLength(0);
  });

  test("valida líneas: vacías, cantidad y precio", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);

    await expect(
      as.mutation(api.compras.purchases.create, {
        supplierId,
        paymentType: "cash",
        lines: [],
      }),
    ).rejects.toThrow(/al menos un producto/i);

    await expect(
      as.mutation(api.compras.purchases.create, {
        supplierId,
        paymentType: "cash",
        lines: [{ itemId, quantity: 0, unitPriceCents: 100 }],
      }),
    ).rejects.toThrow(/cantidad/i);

    await expect(
      as.mutation(api.compras.purchases.create, {
        supplierId,
        paymentType: "cash",
        lines: [{ itemId, quantity: 1, unitPriceCents: 0 }],
      }),
    ).rejects.toThrow(/precio unitario/i);
  });

  test("rechaza crédito con cuenta y proveedor ajeno", async () => {
    const t = convexTest(schema, modules);
    const userA = await withUser(t);
    const userB = await withUser(t);
    const { supplierId, itemId } = await seedBasics(userA.as);
    const accountId: Id<"accounts"> = await userA.as.mutation(
      api.accounts.create,
      { name: "Banco Unión", balance: 50000 },
    );

    await expect(
      userA.as.mutation(api.compras.purchases.create, {
        supplierId,
        paymentType: "credit",
        accountId,
        lines: [{ itemId, quantity: 1, unitPriceCents: 100 }],
      }),
    ).rejects.toThrow(/crédito no descuenta/i);

    await expect(
      userB.as.mutation(api.compras.purchases.create, {
        supplierId,
        paymentType: "cash",
        lines: [{ itemId, quantity: 1, unitPriceCents: 100 }],
      }),
    ).rejects.toThrow(/proveedor no encontrado/i);
  });

  test("priceHistory devuelve puntos de precio por item, reciente primero", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      purchasedAt: 1000,
      lines: [{ itemId, quantity: 1, unitPriceCents: 3000 }],
    });
    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      purchasedAt: 2000,
      lines: [{ itemId, quantity: 1, unitPriceCents: 3600 }],
    });

    const history = await as.query(api.compras.purchases.priceHistory, {
      itemId,
    });
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      purchasedAt: 2000,
      unitPriceCents: 3600,
    });
    expect(history[1]).toMatchObject({
      purchasedAt: 1000,
      unitPriceCents: 3000,
    });
  });

  test("cancel revierte stock y elimina la deuda de una compra al crédito", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);

    const purchaseId = await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "credit",
      lines: [{ itemId, quantity: 5, unitPriceCents: 3500 }],
    });

    await as.mutation(api.compras.purchases.cancel, { id: purchaseId });

    const items = await as.query(api.inventario.items.list);
    expect(items[0].stock).toBe(10);
    expect(await as.query(api.payables.list)).toHaveLength(0);

    const purchase = await as.query(api.compras.purchases.get, {
      id: purchaseId,
    });
    expect(purchase.canceledAt).toBeDefined();

    await expect(
      as.mutation(api.compras.purchases.cancel, { id: purchaseId }),
    ).rejects.toThrow(/ya está anulada/i);
  });

  test("cancel devuelve el dinero a la cuenta en compra al contado", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);
    const accountId: Id<"accounts"> = await as.mutation(api.accounts.create, {
      name: "Banco Unión",
      balance: 50000,
    });

    const purchaseId = await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      accountId,
      lines: [{ itemId, quantity: 1, unitPriceCents: 30000 }],
    });
    await as.mutation(api.compras.purchases.cancel, { id: purchaseId });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(50000);

    const transactions = await as.query(api.transactions.list);
    const adjustment = transactions.find((tx) => tx.type === "adjustment");
    expect(adjustment).toBeDefined();
    expect(adjustment?.amount).toBe(30000);
  });

  test("cancel rechaza si el stock ya se vendió o la deuda tiene pagos", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const { supplierId, itemId } = await seedBasics(as);

    const purchaseId = await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "credit",
      lines: [{ itemId, quantity: 5, unitPriceCents: 3500 }],
    });

    // Se vendió parte del stock comprado: 15 → 2.
    await as.mutation(api.inventario.items.update, { id: itemId, stock: 2 });
    await expect(
      as.mutation(api.compras.purchases.cancel, { id: purchaseId }),
    ).rejects.toThrow(/stock actual/i);

    // Reponer stock pero pagar parte de la deuda: tampoco se puede anular.
    await as.mutation(api.inventario.items.update, { id: itemId, stock: 15 });
    const payables = await as.query(api.payables.list);
    await as.mutation(api.payables.pay, {
      id: payables[0]._id,
      amount: 500,
    });
    await expect(
      as.mutation(api.compras.purchases.cancel, { id: purchaseId }),
    ).rejects.toThrow(/pagos aplicados/i);
  });
});
