import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { EmptyState } from "~/components/ui/LedgerCard";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

const DATE_FMT = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function SalesSection() {
  const sales = useQuery(api.ventas.sales.list);

  return (
    <section
      aria-label="Historial de ventas"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Ventas
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Historial
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          {sales === undefined
            ? "Cargando…"
            : sales.length === 1
              ? "1 venta"
              : `${sales.length} ventas`}
        </p>
      </header>

      <div className="pt-2">
        {sales === undefined ? (
          <EmptyState message="Cargando…" />
        ) : sales.length === 0 ? (
          <EmptyState message="Todavía no registraste ventas." />
        ) : (
          <ul className="divide-y divide-line/70">
            {sales.map((sale) => (
              <SaleRow key={sale._id} sale={sale} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SaleRow({ sale }: { sale: Doc<"sales"> }) {
  const [isOpen, setIsOpen] = useState(false);
  const isCanceled = sale.canceledAt !== undefined;

  return (
    <li className="py-3">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-sm font-medium ${isCanceled ? "text-ink-soft line-through" : ""}`}
          >
            {sale.customerName}
          </span>
          <span className="block text-xs text-ink-soft">
            {DATE_FMT.format(new Date(sale.soldAt))}
            {" · "}
            {sale.paymentType === "cash" ? "Contado" : "Crédito"}
            {isCanceled ? " · Anulada" : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`block text-sm font-semibold tabular-nums ${isCanceled ? "text-ink-soft line-through" : ""}`}
          >
            {formatMoney(sale.totalCents)}
          </span>
          {!isCanceled ? (
            <span
              className={`block text-xs tabular-nums ${
                sale.marginCents < 0 ? "text-debt" : "text-positive"
              }`}
            >
              margen {formatMoney(sale.marginCents)}
            </span>
          ) : null}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs text-ink-soft">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>
      {isOpen ? <SaleDetail saleId={sale._id} isCanceled={isCanceled} /> : null}
    </li>
  );
}

function SaleDetail({
  saleId,
  isCanceled,
}: {
  saleId: Id<"sales">;
  isCanceled: boolean;
}) {
  const detail = useQuery(api.ventas.sales.get, { id: saleId });
  const cancelSale = useMutation(api.ventas.sales.cancel);
  const [error, setError] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCancel = async () => {
    setIsCanceling(true);
    setError(null);
    try {
      await cancelSale({ id: saleId });
      setConfirming(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo anular la venta. Intenta de nuevo.",
      );
    } finally {
      setIsCanceling(false);
    }
  };

  if (detail === undefined) {
    return <p className="mt-2 text-xs text-ink-soft">Cargando detalle…</p>;
  }

  return (
    <div className="mt-3 rounded-lg bg-line/20 p-3">
      <ul className="grid gap-1.5">
        {detail.lines.map((line) => {
          const lineMargin =
            line.quantity * line.unitPriceCents -
            line.quantity * line.unitCostCents;
          return (
            <li key={line._id} className="flex items-baseline text-sm">
              <span className="min-w-0 truncate text-ink-soft">
                {line.quantity} × {line.itemName}
                <span className="text-xs"> ({line.itemSku})</span>
              </span>
              <span className="ledger-dots" />
              <span className="shrink-0 text-right tabular-nums">
                <span className="block">
                  {formatMoney(line.quantity * line.unitPriceCents)}
                </span>
                <span
                  className={`block text-xs ${lineMargin < 0 ? "text-debt" : "text-positive"}`}
                >
                  margen {formatMoney(lineMargin)}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 border-t border-line/60 pt-2 text-xs text-ink-soft">
        Costo total (COGS): {formatMoney(detail.totalCostCents)} · Margen total:{" "}
        <span
          className={detail.marginCents < 0 ? "text-debt" : "text-positive"}
        >
          {formatMoney(detail.marginCents)}
        </span>
      </p>
      {!isCanceled ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
          {error ? <p className="text-xs text-debt">{error}</p> : <span />}
          {confirming ? (
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-ink-soft">
                ¿Anular? Revierte stock y cobro.
              </span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={isCanceling}
                className="rounded-lg bg-debt px-3 py-1.5 text-xs font-semibold text-paper transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                {isCanceling ? "Anulando…" : "Sí, anular"}
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="text-xs font-semibold text-debt transition-opacity hover:opacity-75"
            >
              Anular venta
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
