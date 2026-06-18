/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

describe("receivables.collect", () => {
  test("cobro con cuenta: suma al saldo y registra la transacción", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 10000,
    });
    const receivableId = await as.mutation(api.receivables.create, {
      debtorName: "María",
      amount: 8500,
      note: "Almuerzo",
    });

    await as.mutation(api.receivables.collect, {
      id: receivableId,
      accountId,
    });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(18500); // 10000 + 8500

    expect(await as.query(api.receivables.list)).toHaveLength(0);

    const [tx] = await as.query(api.transactions.list);
    expect(tx).toMatchObject({
      type: "collection",
      counterpartyName: "María",
      reason: "Almuerzo",
      amount: 8500,
      accountName: "Ahorros",
    });
  });

  test("cobro parcial: reduce la deuda y la mantiene", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const receivableId = await as.mutation(api.receivables.create, {
      debtorName: "Juan",
      amount: 50000,
    });

    await as.mutation(api.receivables.collect, {
      id: receivableId,
      amount: 20000,
    });

    const receivables = await as.query(api.receivables.list);
    expect(receivables).toHaveLength(1);
    expect(receivables[0].amount).toBe(30000);
  });

  test("rechaza cobrar más de lo que te deben", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const receivableId = await as.mutation(api.receivables.create, {
      debtorName: "X",
      amount: 5000,
    });

    await expect(
      as.mutation(api.receivables.collect, {
        id: receivableId,
        amount: 5001,
      }),
    ).rejects.toThrow(/supera lo que te deben/i);
  });

  test("rechaza cobrar una deuda de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const owner = await withUser(t);
    const intruder = await withUser(t);
    const receivableId = await owner.as.mutation(api.receivables.create, {
      debtorName: "X",
      amount: 1000,
    });

    await expect(
      intruder.as.mutation(api.receivables.collect, { id: receivableId }),
    ).rejects.toThrow(/no encontrada/i);
  });
});

describe("transactions.reverse — cobros", () => {
  test("revierte un cobro: descuenta del saldo y reabre la deuda por cobrar", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 10000,
    });
    const receivableId = await as.mutation(api.receivables.create, {
      debtorName: "María",
      amount: 8500,
      note: "Almuerzo",
    });
    await as.mutation(api.receivables.collect, { id: receivableId, accountId });

    const [tx] = await as.query(api.transactions.list);
    await as.mutation(api.transactions.reverse, { id: tx._id });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(10000); // 18500 - 8500

    const receivables = await as.query(api.receivables.list);
    expect(receivables).toHaveLength(1);
    expect(receivables[0]).toMatchObject({
      debtorName: "María",
      amount: 8500,
      note: "Almuerzo",
    });

    expect(await as.query(api.transactions.list)).toHaveLength(0);
  });

  test("revertir un cobro parcial lo fusiona con la deuda existente", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const receivableId = await as.mutation(api.receivables.create, {
      debtorName: "Juan",
      amount: 50000,
    });
    await as.mutation(api.receivables.collect, {
      id: receivableId,
      amount: 20000,
    });

    const [tx] = await as.query(api.transactions.list);
    await as.mutation(api.transactions.reverse, { id: tx._id });

    const receivables = await as.query(api.receivables.list);
    expect(receivables).toHaveLength(1);
    expect(receivables[0].amount).toBe(50000); // 30000 + 20000
  });
});
