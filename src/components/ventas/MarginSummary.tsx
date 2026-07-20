import { useQuery } from "convex/react";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";

export function MarginSummary() {
  const summary = useQuery(api.ventas.sales.marginSummary);

  const marginPct =
    summary !== undefined && summary.totalRevenueCents > 0
      ? Math.round((summary.totalMarginCents / summary.totalRevenueCents) * 100)
      : null;

  return (
    <section
      aria-label="Resumen de margen"
      className="rise-in rounded-3xl border border-line bg-card p-7 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-10"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
        Ventas
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
        <p
          className={`font-display text-[clamp(2.25rem,1.5rem+3vw,4rem)] font-semibold leading-none tabular-nums tracking-tight ${
            summary !== undefined && summary.totalMarginCents < 0
              ? "text-debt"
              : "text-ink"
          }`}
        >
          {summary === undefined ? "…" : formatMoney(summary.totalMarginCents)}
        </p>
        <p className="pb-1.5 text-sm text-ink-soft">
          margen total{marginPct !== null ? ` (${marginPct}%)` : ""}
        </p>
      </div>
      {summary !== undefined ? (
        <dl className="mt-5 flex flex-wrap gap-x-7 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-xs text-ink-soft">Ingresos</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(summary.totalRevenueCents)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-xs text-ink-soft">Costo (COGS)</dt>
            <dd className="font-semibold tabular-nums">
              {formatMoney(summary.totalCostCents)}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="text-xs text-ink-soft">Ventas</dt>
            <dd className="font-semibold tabular-nums">{summary.saleCount}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
