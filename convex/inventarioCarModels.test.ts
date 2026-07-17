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

describe("inventario/carModels", () => {
  test("crea y lista modelos del usuario", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await as.mutation(api.inventario.carModels.create, {
      name: "Toyota Hilux 2018-2022",
    });

    const models = await as.query(api.inventario.carModels.list);
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe("Toyota Hilux 2018-2022");
  });

  test("rechaza nombre duplicado para el mismo usuario", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    await as.mutation(api.inventario.carModels.create, { name: "Hilux" });

    await expect(
      as.mutation(api.inventario.carModels.create, { name: "Hilux" }),
    ).rejects.toThrow(/ya existe/i);
  });

  test("rechaza nombre vacío", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    await expect(
      as.mutation(api.inventario.carModels.create, { name: "   " }),
    ).rejects.toThrow(/obligatorio/i);
  });

  test("remove oculta el modelo de la lista", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const id = await as.mutation(api.inventario.carModels.create, {
      name: "Hilux",
    });
    await as.mutation(api.inventario.carModels.remove, { id });
    expect(await as.query(api.inventario.carModels.list)).toHaveLength(0);
  });
});
