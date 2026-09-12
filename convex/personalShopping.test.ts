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

describe("smart shopping list and store comparison", () => {
  test("shopping list supports adding, toggling, and clearing", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const productId = await as.mutation(api.personal.products.create, {
      name: "Leche Entera (1 L)",
      category: "Lácteos y Huevos",
      unit: "L",
    });

    const item1 = await as.mutation(api.personal.shoppingList.add, {
      productId,
      targetQuantity: 2,
    });

    const item2 = await as.mutation(api.personal.shoppingList.add, {
      customName: "Servilletas de papel",
      targetQuantity: 1,
    });

    const list1 = await as.query(api.personal.shoppingList.list, {});
    expect(list1).toHaveLength(2);
    expect(list1[0].isCompleted).toBe(false);

    // Toggle item1 to completed
    await as.mutation(api.personal.shoppingList.toggle, { id: item1 });
    const list2 = await as.query(api.personal.shoppingList.list, {});
    const completed = list2.find((i) => i._id === item1);
    expect(completed?.isCompleted).toBe(true);

    // Clear completed
    const cleared = await as.mutation(
      api.personal.shoppingList.clearCompleted,
      {},
    );
    expect(cleared.deletedCount).toBe(1);

    const list3 = await as.query(api.personal.shoppingList.list, {});
    expect(list3).toHaveLength(1);
    expect(list3[0]._id).toBe(item2);
  });

  test("store comparison detects cheapest store and statistics", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const productId = await as.mutation(api.personal.products.create, {
      name: "Tomate perita (1 kg)",
      category: "Frutas y Verduras",
      unit: "kg",
    });

    // Registro 1: Mercado Central a Bs 6.00 (600 centavos)
    await as.mutation(api.personal.prices.create, {
      productId,
      priceCents: 600,
      quantity: 1,
      purchasedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      storeName: "Mercado Central",
    });

    // Registro 2: Supermercado Hipermaxi a Bs 9.50 (950 centavos)
    await as.mutation(api.personal.prices.create, {
      productId,
      priceCents: 950,
      quantity: 1,
      purchasedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      storeName: "Hipermaxi",
    });

    const stores = await as.query(api.personal.prices.getStoreComparison, {
      productId,
    });
    expect(stores).toHaveLength(2);
    expect(stores[0].storeName).toBe("Mercado Central");
    expect(stores[0].minPrice).toBe(600);
    expect(stores[0].isBestPrice).toBe(true);

    expect(stores[1].storeName).toBe("Hipermaxi");
    expect(stores[1].minPrice).toBe(950);
    expect(stores[1].isBestPrice).toBe(false);
  });
});
