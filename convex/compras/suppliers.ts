import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { normalizeText } from "../inventario/lib";
import { requireUserId } from "../users";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const suppliers = await ctx.db
      .query("suppliers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(200);
    return suppliers.filter((s) => s.archivedAt === undefined);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = normalizeText(args.name);
    if (name.length === 0) {
      throw new Error("El nombre del proveedor es obligatorio");
    }

    const existing = await ctx.db
      .query("suppliers")
      .withIndex("by_user_and_name", (q) =>
        q.eq("userId", userId).eq("name", name),
      )
      .unique();
    if (existing !== null && existing.archivedAt === undefined) {
      throw new Error("Ya existe un proveedor con ese nombre");
    }
    // Reactivar si estaba archivado, conservando su historial de compras.
    if (existing !== null) {
      await ctx.db.patch(existing._id, {
        archivedAt: undefined,
        phone: args.phone?.trim() || undefined,
        notes: args.notes?.trim() || undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("suppliers", {
      userId,
      name,
      phone: args.phone?.trim() || undefined,
      notes: args.notes?.trim() || undefined,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("suppliers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const supplier = await ctx.db.get(args.id);
    if (supplier === null || supplier.userId !== userId) {
      throw new Error("Proveedor no encontrado");
    }

    const patch: Partial<{ name: string; phone?: string; notes?: string }> = {};
    if (args.name !== undefined) {
      const name = normalizeText(args.name);
      if (name.length === 0) {
        throw new Error("El nombre del proveedor es obligatorio");
      }
      if (name !== supplier.name) {
        const clash = await ctx.db
          .query("suppliers")
          .withIndex("by_user_and_name", (q) =>
            q.eq("userId", userId).eq("name", name),
          )
          .unique();
        if (clash !== null && clash.archivedAt === undefined) {
          throw new Error("Ya existe un proveedor con ese nombre");
        }
      }
      patch.name = name;
    }
    if (args.phone !== undefined) {
      patch.phone = args.phone.trim() || undefined;
    }
    if (args.notes !== undefined) {
      patch.notes = args.notes.trim() || undefined;
    }

    await ctx.db.patch(args.id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const supplier = await ctx.db.get(args.id);
    if (supplier === null || supplier.userId !== userId) {
      throw new Error("Proveedor no encontrado");
    }
    // Soft delete: las compras históricas siguen apuntando al proveedor.
    await ctx.db.patch(args.id, { archivedAt: Date.now() });
  },
});
