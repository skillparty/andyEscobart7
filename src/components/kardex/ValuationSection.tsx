import { useQuery } from "convex/react";
import { useState } from "react";
import { EmptyState } from "~/components/ui/LedgerCard";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MovementLedger } from "./MovementLedger";

export function ValuationSection() {
  const summary = useQuery(api.kardex.valuation.summary);
  const valuation = useQuery(api.kardex.valuation.list);

  return (
    <div className="grid gap-5">
      <section
        aria-label="Resumen de inventario valorado"
        className="rise-in rounded-3xl border border-line bg-card p-7 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-10"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
          Kardex
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p className="font-display text-[clamp(2.25rem,1.5rem+3vw,4rem)] font-semibold leading-none tabular-nums tracking-tight">
            {summary === undefined ? "…" : formatMoney(summary.totalValueCents)}
          </p>
          <p className="pb-1.5 text-sm text-ink-soft">
            valor total del inventario
          </p>
        </div>
        {summary !== undefined && summary.itemsWithoutCost > 0 ? (
          <p className="mt-3 text-xs text-ink-soft">
            {summary.itemsWithoutCost === 1
              ? "1 repuesto tiene stock sin costo de compra registrado."
              : `${summary.itemsWithoutCost} repuestos tienen stock sin costo de compra registrado.`}{" "}
            Registra una compra para valorarlos.
          </p>
        ) : null}
      </section>

      <section
        aria-label="Inventario valorado por repuesto"
        className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
      >
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Kardex
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
            Por repuesto
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            Costo promedio ponderado (CPP): se recalcula con cada compra.
          </p>
        </header>

        <div className="pt-2">
          {valuation === undefined ? (
            <EmptyState message="Cargando…" />
          ) : valuation.length === 0 ? (
            <EmptyState message="Todavía no registraste repuestos." />
          ) : (
            <ul className="divide-y divide-line/70">
              {valuation.map((item) => (
                <ValuationRow key={item._id} item={item} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

interface ValuationItem {
  _id: Id<"items">;
  sku: string;
  name: string;
  stock: number;
  valueCents: number;
  avgCostCents: number;
}

function ValuationRow({ item }: { item: ValuationItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {item.name}
          </span>
          <span className="block truncate text-xs text-ink-soft">
            {item.sku} · stock {item.stock}
            {item.avgCostCents > 0
              ? ` · CPP ${formatMoney(item.avgCostCents)}`
              : " · sin costo registrado"}
          </span>
        </span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {formatMoney(item.valueCents)}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs text-ink-soft">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>
      {isOpen ? <MovementLedger itemId={item._id} /> : null}
    </li>
  );
}
