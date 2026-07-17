/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import { MAX_ROWS_PER_IMPORT } from "./inventario/importRows";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

describe("inventario/importRows", () => {
  test("crea items, modelos y vínculos desde filas de Excel", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const summary = await as.mutation(api.inventario.importRows.importRows, {
      rows: [
        {
          sku: "FA-100",
          name: "Filtro de aceite",
          stock: 10,
          modelsRaw: "Toyota Hilux, Toyota Fortuner",
        },
        {
          sku: "FA-200",
          name: "Filtro de aire",
          stock: 5,
          modelsRaw: "Toyota Hilux",
        },
      ],
    });

    expect(summary).toMatchObject({
      itemsCreated: 2,
      itemsUpdated: 0,
      modelsCreated: 2,
      compatibilityLinksCreated: 3,
      errors: [],
    });

    const items = await as.query(api.inventario.items.list);
    expect(items).toHaveLength(2);
    const models = await as.query(api.inventario.carModels.list);
    expect(models).toHaveLength(2);

    const hilux = models.find((m) => m.name === "Toyota Hilux");
    if (hilux === undefined) {
      throw new Error("modelo Hilux no encontrado en el resultado del import");
    }
    const itemsForHilux = await as.query(
      api.inventario.compatibility.listItemsForModel,
      { carModelId: hilux._id },
    );
    expect(itemsForHilux).toHaveLength(2);
  });

  test("reimportar el mismo sku actualiza en vez de duplicar", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await as.mutation(api.inventario.importRows.importRows, {
      rows: [{ sku: "FA-100", name: "Filtro viejo", stock: 3 }],
    });
    const summary = await as.mutation(api.inventario.importRows.importRows, {
      rows: [{ sku: "FA-100", name: "Filtro de aceite", stock: 10 }],
    });

    expect(summary).toMatchObject({ itemsCreated: 0, itemsUpdated: 1 });
    const items = await as.query(api.inventario.items.list);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ name: "Filtro de aceite", stock: 10 });
  });

  test("fila inválida se salta y se reporta en errors, sin abortar el resto del lote", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const summary = await as.mutation(api.inventario.importRows.importRows, {
      rows: [
        { sku: "", name: "Sin código", stock: 1 },
        { sku: "FA-200", name: "Filtro de aire", stock: 5 },
      ],
    });

    expect(summary.itemsCreated).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toMatchObject({ row: 1 });

    const items = await as.query(api.inventario.items.list);
    expect(items).toHaveLength(1);
  });

  test("rechaza lotes que excedan el máximo de filas", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const rows = Array.from({ length: MAX_ROWS_PER_IMPORT + 1 }, (_, i) => ({
      sku: `FA-${i}`,
      name: "Filtro",
      stock: 1,
    }));

    await expect(
      as.mutation(api.inventario.importRows.importRows, { rows }),
    ).rejects.toThrow(/máximo/i);
  });
});
