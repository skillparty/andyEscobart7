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

async function seedSupplier(as: Awaited<ReturnType<typeof withUser>>["as"]) {
  const supplierId: Id<"suppliers"> = await as.mutation(
    api.compras.suppliers.create,
    { name: "Importadora Rodríguez" },
  );
  return supplierId;
}

describe("kardex: costo promedio ponderado", () => {
  test("stock inicial en create no tiene valor hasta la primera compra", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation).toHaveLength(1);
    expect(valuation[0]).toMatchObject({
      stock: 10,
      valueCents: 0,
      avgCostCents: 0,
    });

    const movements = await as.query(api.kardex.movements.listByItem, {
      itemId,
    });
    expect(movements).toHaveLength(1);
    expect(movements[0]).toMatchObject({
      type: "opening",
      quantityDelta: 10,
      valueDeltaCents: 0,
      balanceQuantity: 10,
      balanceValueCents: 0,
    });
  });

  test("compra única fija el costo promedio al precio pagado", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 10, unitPriceCents: 3000 }],
    });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 10,
      valueCents: 30000,
      avgCostCents: 3000,
    });
  });

  test("dos compras a distinto precio dan el promedio ponderado correcto", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });

    // 10 unidades a Bs 30 + 10 unidades a Bs 40 → promedio Bs 35.
    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 10, unitPriceCents: 3000 }],
    });
    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 10, unitPriceCents: 4000 }],
    });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 20,
      valueCents: 70000,
      avgCostCents: 3500,
    });
  });

  test("compra desigual pondera por cantidad, no por número de compras", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });

    // 1 unidad a Bs 10 + 9 unidades a Bs 20 → promedio ponderado Bs 19, NO
    // el promedio simple (10+20)/2=15.
    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 1, unitPriceCents: 1000 }],
    });
    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 9, unitPriceCents: 2000 }],
    });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 10,
      valueCents: 19000,
      avgCostCents: 1900,
    });
  });

  test("anular una compra revierte exactamente su aporte al pool de valor", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 10, unitPriceCents: 3000 }],
    });
    const secondPurchaseId = await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 10, unitPriceCents: 4000 }],
    });

    // Antes de anular: 20 u a Bs 3500 promedio (valor 70000).
    let valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({ stock: 20, valueCents: 70000 });

    // Anular la segunda compra debe dejar exactamente la primera: 10 u a
    // Bs 3000 (valor 30000), no un recálculo distinto.
    await as.mutation(api.compras.purchases.cancel, { id: secondPurchaseId });

    valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 10,
      valueCents: 30000,
      avgCostCents: 3000,
    });
  });

  test("ajuste manual de stock hacia arriba valora al costo promedio actual", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 10, unitPriceCents: 3000 }],
    });

    // Se encuentran 5 unidades más en bodega: ajuste manual +5 al costo
    // promedio vigente (Bs 30), no a un precio inventado.
    await as.mutation(api.inventario.items.update, { id: itemId, stock: 15 });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 15,
      valueCents: 45000,
      avgCostCents: 3000,
    });

    const movements = await as.query(api.kardex.movements.listByItem, {
      itemId,
    });
    expect(movements[0]).toMatchObject({
      type: "adjustment",
      quantityDelta: 5,
      valueDeltaCents: 15000,
    });
  });

  test("ajuste manual a cero fuerza el valor a exactamente cero", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemId: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });

    // Precio impar para forzar redondeo: 3 unidades a Bs 10.01 → costo
    // promedio 1000/3 = 333.33 redondeado a 333.
    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId, quantity: 3, unitPriceCents: 1000 }],
    });

    await as.mutation(api.inventario.items.update, { id: itemId, stock: 0 });

    const valuation = await as.query(api.kardex.valuation.list);
    expect(valuation[0]).toMatchObject({
      stock: 0,
      valueCents: 0,
      avgCostCents: 0,
    });
  });

  test("summary suma el valor de todos los repuestos del usuario", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const supplierId = await seedSupplier(as);
    const itemA: Id<"items"> = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 0,
    });
    await as.mutation(api.inventario.items.create, {
      sku: "FB-200",
      name: "Filtro de aire",
      stock: 5,
    });

    await as.mutation(api.compras.purchases.create, {
      supplierId,
      paymentType: "cash",
      lines: [{ itemId: itemA, quantity: 10, unitPriceCents: 3000 }],
    });

    const summary = await as.query(api.kardex.valuation.summary);
    expect(summary.totalValueCents).toBe(30000);
    expect(summary.totalStock).toBe(15);
    // itemB tiene stock sin costo conocido (nunca se compró).
    expect(summary.itemsWithoutCost).toBe(1);
  });

  test("no expone valoración ni movimientos de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const userA = await withUser(t);
    const userB = await withUser(t);
    const itemId: Id<"items"> = await userA.as.mutation(
      api.inventario.items.create,
      { sku: "FA-100", name: "Filtro de aceite", stock: 10 },
    );

    expect(await userB.as.query(api.kardex.valuation.list)).toHaveLength(0);
    await expect(
      userB.as.query(api.kardex.movements.listByItem, { itemId }),
    ).rejects.toThrow(/no encontrado/i);
  });
});
