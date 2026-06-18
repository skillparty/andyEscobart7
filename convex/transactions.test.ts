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

describe("transactions.reverse", () => {
  test("revierte un pago con cuenta: restaura saldo y reabre la deuda", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 100000,
    });
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "Luz",
      reason: "Factura",
      amount: 30000,
    });
    await as.mutation(api.payables.pay, { id: payableId, accountId });

    // Tras pagar: saldo 70000, sin deudas, 1 transacción
    const [tx] = await as.query(api.transactions.list);
    await as.mutation(api.transactions.reverse, { id: tx._id });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(100000); // restaurado

    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(1);
    expect(payables[0]).toMatchObject({
      creditorName: "Luz",
      reason: "Factura",
      amount: 30000,
    });

    expect(await as.query(api.transactions.list)).toHaveLength(0);
  });

  test("revierte un pago sin cuenta: solo reabre la deuda", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 5000,
    });
    await as.mutation(api.payables.pay, { id: payableId });

    const [tx] = await as.query(api.transactions.list);
    await as.mutation(api.transactions.reverse, { id: tx._id });

    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(1);
    expect(payables[0].amount).toBe(5000);
  });

  test("revertir un abono parcial lo devuelve a la deuda existente", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "Banco",
      reason: "Préstamo",
      amount: 80000,
    });
    await as.mutation(api.payables.pay, { id: payableId, amount: 30000 });

    // Deuda restante 50000, una transacción de 30000
    const [tx] = await as.query(api.transactions.list);
    await as.mutation(api.transactions.reverse, { id: tx._id });

    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(1); // se fusiona, no duplica
    expect(payables[0].amount).toBe(80000); // 50000 + 30000
    expect(await as.query(api.transactions.list)).toHaveLength(0);
  });

  test("rechaza revertir la transacción de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const owner = await withUser(t);
    const intruder = await withUser(t);

    const payableId = await owner.as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 1000,
    });
    await owner.as.mutation(api.payables.pay, { id: payableId });
    const [tx] = await owner.as.query(api.transactions.list);

    await expect(
      intruder.as.mutation(api.transactions.reverse, { id: tx._id }),
    ).rejects.toThrow(/no encontrada/i);
  });
});
