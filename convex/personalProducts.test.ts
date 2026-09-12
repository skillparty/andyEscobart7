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

describe("personal products and prices", () => {
  test("seedPreloaded inserts standard catalog and is idempotent", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const first = await as.mutation(api.personal.products.seedPreloaded, {});
    expect(first.insertedCount).toBeGreaterThan(5);

    const list1 = await as.query(api.personal.products.list, {});
    expect(list1.length).toBe(first.insertedCount);

    const second = await as.mutation(api.personal.products.seedPreloaded, {});
    expect(second.insertedCount).toBe(0);
  });

  test("can create custom product, update and delete", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const id = await as.mutation(api.personal.products.create, {
      name: "Queso Criollo (1 kg)",
      category: "Lácteos y Huevos",
      unit: "kg",
    });

    const list = await as.query(api.personal.products.list, {});
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Queso Criollo (1 kg)");

    await as.mutation(api.personal.products.update, {
      id,
      name: "Queso Chaqueño (1 kg)",
    });

    const updatedList = await as.query(api.personal.products.list, {});
    expect(updatedList[0].name).toBe("Queso Chaqueño (1 kg)");

    await as.mutation(api.personal.products.remove, { id });
    const emptyList = await as.query(api.personal.products.list, {});
    expect(emptyList).toHaveLength(0);
  });

  test("recording prices tracks season, accounts, and generates intelligent recommendations", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    // Crear cuenta con saldo inicial de Bs 100.00 (10,000 centavos)
    const accountId = await as.mutation(api.accounts.create, {
      name: "Billetera Efectivo",
      balance: 10000,
    });

    // Crear producto
    const productId = await as.mutation(api.personal.products.create, {
      name: "Aceite Fino (1 L)",
      category: "Alimentos y Despensa",
      unit: "L",
    });

    // Registrar primera compra a Bs 15.00 (1500 centavos) hace 5 días
    const day1 = Date.now() - 5 * 24 * 60 * 60 * 1000;
    const priceId1 = await as.mutation(api.personal.prices.create, {
      productId,
      priceCents: 1500,
      quantity: 1,
      purchasedAt: day1,
      storeName: "Mercado Central",
      accountId,
    });

    // Verificar que la cuenta se descontó (10000 - 1500 = 8500)
    const accounts = await as.query(api.accounts.list, {});
    expect(accounts[0].balance).toBe(8500);

    // Verificar que se creó la transacción en historial
    const txs = await as.query(api.transactions.list, {});
    expect(txs).toHaveLength(1);
    expect(txs[0].amount).toBe(1500);

    // Con solo 1 registro, el análisis debe indicar datos insuficientes
    const analysis1 = await as.query(api.personal.prices.getAnalysis, {
      productId,
    });
    expect(analysis1[0].recommendation.status).toBe("insufficient_data");

    // Registrar segunda compra más barata a Bs 11.00 (1100 centavos) hoy (promedio era 1500, nuevo precio 1100 -> ~27% más barato)
    const today = Date.now();
    await as.mutation(api.personal.prices.create, {
      productId,
      priceCents: 1100,
      quantity: 1,
      purchasedAt: today,
      storeName: "Feria de Ramos",
    });

    const analysis2 = await as.query(api.personal.prices.getAnalysis, {
      productId,
    });
    expect(analysis2[0].recommendation.status).toBe("good_time");
    expect(analysis2[0].recommendation.badge).toContain("Buen momento");

    // Revertir primer registro de precio: debe restaurar saldo a la cuenta y borrar tx
    await as.mutation(api.personal.prices.remove, { id: priceId1 });
    const accountsRestored = await as.query(api.accounts.list, {});
    expect(accountsRestored[0].balance).toBe(10000);
    const txsRestored = await as.query(api.transactions.list, {});
    expect(txsRestored).toHaveLength(0);
  });
});
