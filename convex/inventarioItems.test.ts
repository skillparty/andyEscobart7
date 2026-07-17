/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** Crea un usuario y devuelve una instancia de prueba autenticada como él. */
async function withUser(t: ReturnType<typeof convexTest>) {
  const userId = await t.run(async (ctx) => ctx.db.insert("users", {}));
  const as = t.withIdentity({ subject: `${userId}|session` });
  return { userId, as };
}

describe("inventario/items", () => {
  test("crea y lista repuestos del usuario", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });

    const items = await as.query(api.inventario.items.list);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });
  });

  test("rechaza sku duplicado para el mismo usuario", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });

    await expect(
      as.mutation(api.inventario.items.create, {
        sku: "FA-100",
        name: "Otro nombre",
        stock: 5,
      }),
    ).rejects.toThrow(/ya existe/i);
  });

  test("permite el mismo sku para dos usuarios distintos", async () => {
    const t = convexTest(schema, modules);
    const userA = await withUser(t);
    const userB = await withUser(t);

    await userA.as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });
    await expect(
      userB.as.mutation(api.inventario.items.create, {
        sku: "FA-100",
        name: "Filtro de aceite",
        stock: 3,
      }),
    ).resolves.toBeDefined();
  });

  test("rechaza stock negativo o no entero", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await expect(
      as.mutation(api.inventario.items.create, {
        sku: "FA-100",
        name: "Filtro",
        stock: -1,
      }),
    ).rejects.toThrow(/stock/i);

    await expect(
      as.mutation(api.inventario.items.create, {
        sku: "FA-101",
        name: "Filtro",
        stock: 1.5,
      }),
    ).rejects.toThrow(/stock/i);
  });

  test("update modifica solo los campos enviados", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);
    const id = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });

    await as.mutation(api.inventario.items.update, { id, stock: 20 });

    const items = await as.query(api.inventario.items.list);
    expect(items[0]).toMatchObject({ name: "Filtro de aceite", stock: 20 });
  });

  test("remove oculta el repuesto de la lista (soft delete)", async () => {
    const t = convexTest(schema, modules);
    const { userId, as } = await withUser(t);
    const id = await as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });

    await as.mutation(api.inventario.items.remove, { id });

    expect(await as.query(api.inventario.items.list)).toHaveLength(0);
    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("items")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect(),
    );
    expect(rows[0].archivedAt).toEqual(expect.any(Number));
  });

  test("rechaza operar sobre un repuesto de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const owner = await withUser(t);
    const intruder = await withUser(t);
    const id = await owner.as.mutation(api.inventario.items.create, {
      sku: "FA-100",
      name: "Filtro de aceite",
      stock: 10,
    });

    await expect(
      intruder.as.mutation(api.inventario.items.update, { id, stock: 1 }),
    ).rejects.toThrow(/no encontrado/i);
    await expect(
      intruder.as.mutation(api.inventario.items.remove, { id }),
    ).rejects.toThrow(/no encontrado/i);
  });
});
