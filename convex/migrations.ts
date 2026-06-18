import { internalMutation } from "./_generated/server";

/**
 * Migración única: convierte montos almacenados como dólares flotantes a
 * centavos enteros (Bs). Ejecutar una sola vez tras desplegar el cambio:
 *
 *   bunx convex run migrations:dollarsToCents
 *
 * Es idempotente solo si NO se ejecuta dos veces: correrla de nuevo
 * multiplicaría los montos por 100 otra vez. Ejecutar exactamente una vez.
 */
export const dollarsToCents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const toCents = (n: number) => Math.round(n * 100);
    let migrated = 0;

    const accounts = await ctx.db.query("accounts").collect();
    for (const a of accounts) {
      await ctx.db.patch(a._id, { balance: toCents(a.balance) });
      migrated++;
    }

    const receivables = await ctx.db.query("receivables").collect();
    for (const r of receivables) {
      await ctx.db.patch(r._id, { amount: toCents(r.amount) });
      migrated++;
    }

    const payables = await ctx.db.query("payables").collect();
    for (const p of payables) {
      await ctx.db.patch(p._id, { amount: toCents(p.amount) });
      migrated++;
    }

    const transactions = await ctx.db.query("transactions").collect();
    for (const t of transactions) {
      await ctx.db.patch(t._id, { amount: toCents(t.amount) });
      migrated++;
    }

    return { migrated };
  },
});
