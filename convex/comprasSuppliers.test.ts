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

describe("compras/suppliers", () => {
  test("crea y lista proveedores del usuario", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await as.mutation(api.compras.suppliers.create, {
      name: "Importadora Rodríguez",
      phone: "70012345",
    });

    const suppliers = await as.query(api.compras.suppliers.list);
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0]).toMatchObject({
      name: "Importadora Rodríguez",
      phone: "70012345",
    });
  });

  test("rechaza nombre vacío y duplicado", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    await expect(
      as.mutation(api.compras.suppliers.create, { name: "   " }),
    ).rejects.toThrow(/obligatorio/i);

    await as.mutation(api.compras.suppliers.create, { name: "Toyosa" });
    await expect(
      as.mutation(api.compras.suppliers.create, { name: "Toyosa" }),
    ).rejects.toThrow(/ya existe/i);
  });

  test("no lista proveedores de otro usuario", async () => {
    const t = convexTest(schema, modules);
    const userA = await withUser(t);
    const userB = await withUser(t);

    await userA.as.mutation(api.compras.suppliers.create, { name: "Toyosa" });

    const suppliers = await userB.as.query(api.compras.suppliers.list);
    expect(suppliers).toHaveLength(0);
  });

  test("remove archiva y create con mismo nombre reactiva", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const id = await as.mutation(api.compras.suppliers.create, {
      name: "Toyosa",
    });
    await as.mutation(api.compras.suppliers.remove, { id });
    expect(await as.query(api.compras.suppliers.list)).toHaveLength(0);

    const reactivatedId = await as.mutation(api.compras.suppliers.create, {
      name: "Toyosa",
    });
    expect(reactivatedId).toBe(id);
    expect(await as.query(api.compras.suppliers.list)).toHaveLength(1);
  });

  test("update renombra y valida colisión", async () => {
    const t = convexTest(schema, modules);
    const { as } = await withUser(t);

    const id = await as.mutation(api.compras.suppliers.create, {
      name: "Toyosa",
    });
    await as.mutation(api.compras.suppliers.create, { name: "Imcruz" });

    await expect(
      as.mutation(api.compras.suppliers.update, { id, name: "Imcruz" }),
    ).rejects.toThrow(/ya existe/i);

    await as.mutation(api.compras.suppliers.update, {
      id,
      name: "Toyosa Bolivia",
    });
    const suppliers = await as.query(api.compras.suppliers.list);
    const names = suppliers.map((s) => s.name);
    expect(names).toContain("Toyosa Bolivia");
    expect(names).not.toContain("Toyosa");
  });
});
