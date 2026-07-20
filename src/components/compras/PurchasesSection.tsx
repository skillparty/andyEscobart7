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

export function PurchasesSection() {
  const purchases = useQuery(api.compras.purchases.list);

  return (
    <section
      aria-label="Historial de compras"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Compras
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Historial
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          {purchases === undefined
            ? "Cargando…"
            : purchases.length === 1
              ? "1 compra"
              : `${purchases.length} compras`}
        </p>
      </header>

      <div className="pt-2">
        {purchases === undefined ? (
          <EmptyState message="Cargando…" />
        ) : purchases.length === 0 ? (
          <EmptyState message="Todavía no registraste compras." />
        ) : (
          <ul className="divide-y divide-line/70">
            {purchases.map((purchase) => (
              <PurchaseRow key={purchase._id} purchase={purchase} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function PurchaseRow({ purchase }: { purchase: Doc<"purchases"> }) {
  const [isOpen, setIsOpen] = useState(false);
  const isCanceled = purchase.canceledAt !== undefined;

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
            {purchase.supplierName}
          </span>
          <span className="block text-xs text-ink-soft">
            {DATE_FMT.format(new Date(purchase.purchasedAt))}
            {purchase.invoiceNumber ? ` · ${purchase.invoiceNumber}` : ""}
            {" · "}
            {purchase.paymentType === "cash" ? "Contado" : "Crédito"}
            {isCanceled ? " · Anulada" : ""}
          </span>
        </span>
        <span
          className={`shrink-0 text-sm font-semibold tabular-nums ${isCanceled ? "text-ink-soft line-through" : ""}`}
        >
          {formatMoney(purchase.totalCents)}
        </span>
        <span aria-hidden="true" className="shrink-0 text-xs text-ink-soft">
          {isOpen ? "▲" : "▼"}
        </span>
      </button>
      {isOpen ? (
        <PurchaseDetail purchaseId={purchase._id} isCanceled={isCanceled} />
      ) : null}
    </li>
  );
}

function PurchaseDetail({
  purchaseId,
  isCanceled,
}: {
  purchaseId: Id<"purchases">;
  isCanceled: boolean;
}) {
  const detail = useQuery(api.compras.purchases.get, { id: purchaseId });
  const cancelPurchase = useMutation(api.compras.purchases.cancel);
  const [error, setError] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const handleCancel = async () => {
    setIsCanceling(true);
    setError(null);
    try {
      await cancelPurchase({ id: purchaseId });
      setConfirming(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo anular la compra. Intenta de nuevo.",
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
        {detail.lines.map((line) => (
          <li key={line._id} className="flex items-baseline text-sm">
            <span className="min-w-0 truncate text-ink-soft">
              {line.quantity} × {line.itemName}
              <span className="text-xs"> ({line.itemSku})</span>
            </span>
            <span className="ledger-dots" />
            <span className="shrink-0 tabular-nums">
              {formatMoney(line.quantity * line.unitPriceCents)}
            </span>
          </li>
        ))}
      </ul>
      {!isCanceled ? (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line/60 pt-3">
          {error ? <p className="text-xs text-debt">{error}</p> : <span />}
          {confirming ? (
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-ink-soft">
                ¿Anular? Revierte stock y pago.
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
              Anular compra
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
