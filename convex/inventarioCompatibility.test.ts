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

async function setup(t: ReturnType<typeof convexTest>) {
  const { as } = await withUser(t);
  const itemId = await as.mutation(api.inventario.items.create, {
    sku: "FA-100",
    name: "Filtro de aceite",
    stock: 10,
  });
  const modelId = await as.mutation(api.inventario.carModels.create, {
    name: "Toyota Hilux",
  });
  return { as, itemId, modelId };
}

describe("inventario/compatibility", () => {
  test("link crea el vínculo y aparece en ambas direcciones", async () => {
    const t = convexTest(schema, modules);
    const { as, itemId, modelId } = await setup(t);

    await as.mutation(api.inventario.compatibility.link, {
      itemId,
      carModelId: modelId,
    });

    const models = await as.query(
      api.inventario.compatibility.listModelsForItem,
      {
        itemId,
      },
    );
    expect(models).toHaveLength(1);
    expect(models[0]._id).toBe(modelId);

    const items = await as.query(
      api.inventario.compatibility.listItemsForModel,
      {
        carModelId: modelId,
      },
    );
    expect(items).toHaveLength(1);
    expect(items[0]._id).toBe(itemId);
  });

  test("link es idempotente (no duplica el vínculo)", async () => {
    const t = convexTest(schema, modules);
    const { as, itemId, modelId } = await setup(t);

    await as.mutation(api.inventario.compatibility.link, {
      itemId,
      carModelId: modelId,
    });
    await as.mutation(api.inventario.compatibility.link, {
      itemId,
      carModelId: modelId,
    });

    const items = await as.query(
      api.inventario.compatibility.listItemsForModel,
      {
        carModelId: modelId,
      },
    );
    expect(items).toHaveLength(1);
  });

  test("unlink elimina el vínculo", async () => {
    const t = convexTest(schema, modules);
    const { as, itemId, modelId } = await setup(t);
    await as.mutation(api.inventario.compatibility.link, {
      itemId,
      carModelId: modelId,
    });

    await as.mutation(api.inventario.compatibility.unlink, {
      itemId,
      carModelId: modelId,
    });

    expect(
      await as.query(api.inventario.compatibility.listModelsForItem, {
        itemId,
      }),
    ).toHaveLength(0);
  });

  test("rechaza vincular recursos de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const { itemId, modelId } = await setup(t);
    const intruder = await withUser(t);

    await expect(
      intruder.as.mutation(api.inventario.compatibility.link, {
        itemId,
        carModelId: modelId,
      }),
    ).rejects.toThrow(/no encontrado/i);
  });
});
