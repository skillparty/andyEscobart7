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

describe("inventario/search", () => {
  test("searchItems encuentra por nombre o por código y trae los modelos compatibles", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });
    const modelId = await as.mutation(api.inventario.carModels.create, {
      name: "Toyota Hilux",
    });
    await as.mutation(api.inventario.compatibility.link, {
      itemId,
      carModelId: modelId,
    });

    const byName = await as.query(api.inventario.search.searchItems, {
      term: "aceite",
    });
    expect(byName).toHaveLength(1);
    expect(byName[0].item._id).toBe(itemId);
    expect(byName[0].models).toHaveLength(1);
    expect(byName[0].models[0]._id).toBe(modelId);

    const bySku = await as.query(api.inventario.search.searchItems, {
      term: "FA-100",
    });
    expect(bySku).toHaveLength(1);
    expect(bySku[0].item._id).toBe(itemId);
  });

  test("searchCarModels encuentra por modelo y trae los repuestos compatibles", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const itemId = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });
    const modelId = await as.mutation(api.inventario.carModels.create, {
      name: "Toyota Hilux",
    });
    await as.mutation(api.inventario.compatibility.link, {
      itemId,
      carModelId: modelId,
    });

    const results = await as.query(api.inventario.search.searchCarModels, {
      term: "Hilux",
    });
    expect(results).toHaveLength(1);
    expect(results[0].model._id).toBe(modelId);
    expect(results[0].items).toHaveLength(1);
    expect(results[0].items[0]._id).toBe(itemId);
  });

  test("término vacío devuelve lista vacía sin tocar el índice de búsqueda", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    expect(
      await as.query(api.inventario.search.searchItems, { term: "  " }),
    ).toEqual([]);
    expect(
      await as.query(api.inventario.search.searchCarModels, { term: "" }),
    ).toEqual([]);
  });
});
