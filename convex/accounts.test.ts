/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Crea un usuario y devuelve una instancia de prueba autenticada como él. */
async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  // Convex Auth deriva el userId del prefijo de `subject` antes de "|".
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

describe("accounts.create", () => {
  test("rechaza saldo negativo", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await expect(
      as.mutation(api.accounts.create, { name: "Ahorros", balance: -100 }),
    ).rejects.toThrow(/no puede ser negativo/);
  });

  test("rechaza saldo con fracción de centavo", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await expect(
      as.mutation(api.accounts.create, { name: "Ahorros", balance: 100.5 }),
    ).rejects.toThrow(/centavos/);
  });

  test("acepta saldo cero", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const id = await as.mutation(api.accounts.create, {
      name: "Caja",
      balance: 0,
    });
    expect(id).toBeDefined();
  });
});

describe("accounts.update", () => {
  test("rechaza dejar el saldo en negativo", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const id = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 50000,
    });

    await expect(
      as.mutation(api.accounts.update, { id, balance: -1 }),
    ).rejects.toThrow(/no puede ser negativo/);
  });

  test("ajustar saldo a mano deja rastro con el delta firmado", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const id = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 50000,
    });

    await as.mutation(api.accounts.update, { id, balance: 30000 });

    const accounts = await as.query(api.accounts.list);
    expect(accounts[0].balance).toBe(30000);

    const txs = await as.query(api.transactions.list);
    expect(txs).toHaveLength(1);
    expect(txs[0]).toMatchObject({
      type: "adjustment",
      amount: -20000, // 30000 - 50000
      accountId: id,
    });
  });
});

describe("accounts.remove (soft delete)", () => {
  test("oculta la cuenta de la lista pero conserva la fila", async () => {
    const t = convexTest(schema, modules);
    const { userId, as } = await withUser(t);

    const id = await as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 50000,
    });

    await as.mutation(api.accounts.remove, { id });

    // Ya no aparece en la lista del usuario.
    expect(await as.query(api.accounts.list)).toHaveLength(0);

    // Pero la fila sigue en la base con archivedAt marcado.
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("accounts")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].archivedAt).toEqual(expect.any(Number));
  });
});

describe("aislamiento por usuario", () => {
  test("un usuario no puede editar la cuenta de otro", async () => {
    const t = convexTest(schema, modules);
    const owner = await withUser(t);
    const intruder = await withUser(t);

    const id = await owner.as.mutation(api.accounts.create, {
      name: "Ahorros",
      balance: 50000,
    });

    await expect(
      intruder.as.mutation(api.accounts.update, { id, balance: 0 }),
    ).rejects.toThrow(/no encontrada/);
  });
});
