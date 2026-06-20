/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { beforeEach, describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Crea un usuario y devuelve una instancia de prueba autenticada como él. */
async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  // Convex Auth deriva el userId del prefijo de `subject` antes de "|".
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

describe("payables.pay", () => {
  test("sin cuenta: registra transacción y elimina la deuda, sin tocar saldos", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const payableId = await as.mutation(api.payables.create, {
      creditorName: "Ferretería",
      reason: "Materiales",
      amount: 25000, // Bs 250,00 en centavos
    });

    await as.mutation(api.payables.pay, { id: payableId });

    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(0);

    const txs = await as.query(api.transactions.list);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      type: "payment",
      counterpartyName: "Ferretería",
      reason: "Materiales",
      amount: 25000,
    });
    expect(txs[0].accountId).toBeUndefined();
  });

  test("con cuenta: descuenta los centavos exactos del saldo", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 100000, // Bs 1.000,00
      bankSlug: "bnb",
    });
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "Luz",
      reason: "Factura",
      amount: 35050, // Bs 350,50
    });

    await as.mutation(api.payables.pay, { id: payableId, accountId });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(64950); // 100000 - 35050

    const txs = await as.query(api.transactions.list);
    expect(txs[0]).toMatchObject({
      accountId,
      accountName: "Ahorros",
      bankSlug: "bnb",
      amount: 35050,
    });
  });

  test("pago parcial: reduce el saldo de la deuda y la mantiene", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const accountId = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 100000,
    });
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "Banco",
      reason: "Préstamo",
      amount: 80000, // Bs 800,00
    });

    await as.mutation(api.payables.pay, {
      id: payableId,
      accountId,
      amount: 30000, // abono parcial
    });

    const payables = await as.query(api.payables.list);
    expect(payables).toHaveLength(1);
    expect(payables[0].amount).toBe(50000); // 80000 - 30000

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(70000); // 100000 - 30000
  });

  test("pago parcial que liquida el total elimina la deuda", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 20000,
    });

    await as.mutation(api.payables.pay, { id: payableId, amount: 20000 });

    expect(await as.query(api.payables.list)).toHaveLength(0);
    expect(await as.query(api.transactions.list)).toHaveLength(1);
  });

  test("rechaza pagar más de lo que se debe", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 5000,
    });

    await expect(
      as.mutation(api.payables.pay, { id: payableId, amount: 5001 }),
    ).rejects.toThrow(/supera lo que debes/i);
  });

  test("rechaza el pago si el saldo de la cuenta es insuficiente", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const accountId = await as.mutation(api.accounts.create, {
      name: "Pobre",
      balance: 1000, // Bs 10,00
    });
    const payableId = await as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 5000, // Bs 50,00
    });

    await expect(
      as.mutation(api.payables.pay, { id: payableId, accountId }),
    ).rejects.toThrow(/saldo insuficiente/i);

    // El saldo no cambió y la deuda sigue intacta
    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(1000);
    expect(await as.query(api.payables.list)).toHaveLength(1);
  });

  test("rechaza pagar una deuda de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const owner = await withUser(t);
    const intruder = await withUser(t);

    const payableId = await owner.as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 1000,
    });

    await expect(
      intruder.as.mutation(api.payables.pay, {
        id: payableId as Id<"payables">,
      }),
    ).rejects.toThrow(/no encontrada/i);
  });

  test("rechaza pagar con una cuenta ajena", async () => {
    const t = convexTest(schema, modules);
    const owner = await withUser(t);
    const intruder = await withUser(t);

    const foreignAccountId = await intruder.as.mutation(api.accounts.create, {
      name: "Ajena",
      balance: 50000,
    });
    const payableId = await owner.as.mutation(api.payables.create, {
      creditorName: "X",
      reason: "Y",
      amount: 1000,
    });

    await expect(
      owner.as.mutation(api.payables.pay, {
        id: payableId,
        accountId: foreignAccountId as Id<"accounts">,
      }),
    ).rejects.toThrow(/cuenta bancaria no encontrada/i);
  });
});

describe("payables.create validación", () => {
  let t: ReturnType<typeof convexTest>;
  let as: Awaited<ReturnType<typeof withUser>>["as"];

  beforeEach(async () => {
    t = convexTest(schema, modules);
    ({ as } = await withUser(t));
  });

  test("rechaza acreedor vacío", async () => {
    await expect(
      as.mutation(api.payables.create, {
        creditorName: "   ",
        reason: "algo",
        amount: 1000,
      }),
    ).rejects.toThrow(/acreedor/i);
  });

  test("rechaza monto cero o negativo", async () => {
    await expect(
      as.mutation(api.payables.create, {
        creditorName: "X",
        reason: "Y",
        amount: 0,
      }),
    ).rejects.toThrow(/mayor que cero/i);
  });

  test("exige autenticación", async () => {
    await expect(
      t.mutation(api.payables.create, {
        creditorName: "X",
        reason: "Y",
        amount: 1000,
      }),
    ).rejects.toThrow(/no autenticado/i);
  });
});

describe("payables.remove (soft delete)", () => {
  test("oculta la deuda de la lista pero conserva la fila", async () => {
    const t = convexTest(schema, modules);
    const { userId, as } = await withUser(t);

    const id = await as.mutation(api.payables.create, {
      creditorName: "Carlos",
      reason: "Préstamo",
      amount: 45000,
    });

    await as.mutation(api.payables.remove, { id });

    expect(await as.query(api.payables.list)).toHaveLength(0);

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("payables")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].archivedAt).toEqual(expect.any(Number));
  });
});
