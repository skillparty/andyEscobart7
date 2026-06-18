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

describe("transactions.list / page", () => {
  test("list omite transacciones de hace más de 6 meses; page las incluye", async () => {
    const t = convexTest(schema, modules);
    const { userId, as } = await withUser(t);

    // Una transacción vieja (hace ~8 meses) insertada directo
    const eightMonthsAgo = Date.now() - 240 * 24 * 60 * 60 * 1000;
    await t.run(async (ctx) =>
      ctx.db.insert("transactions", {
        userId,
        type: "payment",
        counterpartyName: "Antigua",
        reason: "Vieja",
        amount: 1000,
        paidAt: eightMonthsAgo,
      }),
    );
    // Una reciente
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "Nueva",
      reason: "Reciente",
      amount: 2000,
    });
    await as.mutation(api.payables.pay, { id: payableId });

    const recent = await as.query(api.transactions.list);
    expect(recent).toHaveLength(1);
    expect(recent[0].counterpartyName).toBe("Nueva");

    const firstPage = await as.query(api.transactions.page, {
      paginationOpts: { numItems: 50, cursor: null },
    });
    expect(firstPage.page).toHaveLength(2); // incluye la vieja
  });

  test("page respeta el tamaño y entrega un cursor para continuar", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    for (let i = 0; i < 3; i++) {
      const id = await as.mutation(api.payables.create, {
        creditorName: `C${i}`,
        reason: "R",
        amount: 1000,
      });
      await as.mutation(api.payables.pay, { id });
    }

    const first = await as.query(api.transactions.page, {
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page).toHaveLength(2);
    expect(first.isDone).toBe(false);

    const second = await as.query(api.transactions.page, {
      paginationOpts: { numItems: 2, cursor: first.continueCursor },
    });
    expect(second.page).toHaveLength(1);
    expect(second.isDone).toBe(true);
  });
});

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

  test("editar el saldo a mano registra un ajuste con el delta", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 50000,
    });

    // Subir saldo: delta positivo
    await as.mutation(api.accounts.update, { id: accountId, balance: 80000 });
    // Bajar saldo: delta negativo
    await as.mutation(api.accounts.update, { id: accountId, balance: 60000 });

    const txs = await as.query(api.transactions.list);
    expect(txs).toHaveLength(2);
    const adjustments = txs.filter((tx) => tx.type === "adjustment");
    expect(adjustments).toHaveLength(2);
    expect(adjustments.map((a) => a.amount).sort((x, y) => x - y)).toEqual([
      -20000, // 60000 - 80000
      30000, // 80000 - 50000
    ]);
  });

  test("editar solo el nombre no genera ajuste", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const accountId = await as.mutation(api.accounts.create, {
      name: "Vieja",
      balance: 50000,
    });

    await as.mutation(api.accounts.update, { id: accountId, name: "Nueva" });
    // Mismo saldo: tampoco genera ajuste
    await as.mutation(api.accounts.update, { id: accountId, balance: 50000 });

    expect(await as.query(api.transactions.list)).toHaveLength(0);
  });

  test("un ajuste no se puede revertir", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 50000,
    });
    await as.mutation(api.accounts.update, { id: accountId, balance: 70000 });
    const [tx] = await as.query(api.transactions.list);

    await expect(
      as.mutation(api.transactions.reverse, { id: tx._id }),
    ).rejects.toThrow(/ajuste de saldo no se revierte/i);
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
