import { useMutation, useQuery } from "convex/react";
import { BankLogo } from "~/components/ui/BankLogo";
import { RowButton } from "~/components/ui/buttons";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";

export function HistorySection() {
  const transactions = useQuery(api.transactions.list);
  const reverse = useMutation(api.transactions.reverse);

  if (transactions === undefined) {
    return (
      <section
        aria-label="Historial de pagos"
        className="rounded-2xl border border-line bg-card p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Historial
        </p>
        <p className="mt-1 text-lg font-semibold">Pagos realizados</p>
        <p className="mt-4 text-sm text-ink-soft">Cargando…</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Historial de pagos"
      className="rounded-2xl border border-line bg-card p-6"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
        Historial
      </p>
      <p className="mt-1 text-lg font-semibold">Pagos realizados</p>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Aún no has registrado pagos.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {transactions.map((tx) => {
            const date = new Date(tx.paidAt);
            const isCollection = tx.type === "collection";
            const isAdjustment = tx.type === "adjustment";
            // El ajuste guarda el delta con signo; pago/cobro guardan positivo.
            const isCredit = isCollection || (isAdjustment && tx.amount >= 0);
            const amountClass = isAdjustment
              ? "text-ink-soft"
              : isCredit
                ? "text-positive"
                : "text-debt";
            return (
              <li key={tx._id} className="group flex items-center gap-3 py-3">
                {tx.bankSlug ? (
                  <BankLogo slug={tx.bankSlug} size={28} className="shrink-0" />
                ) : (
                  <span className="size-7 shrink-0 rounded-full bg-line/60" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {tx.counterpartyName}
                  </span>
                  <span className="block truncate text-xs text-ink-soft">
                    {tx.reason}
                    {tx.accountName ? ` · ${tx.accountName}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span
                    className={`block font-medium tabular-nums ${amountClass}`}
                  >
                    {isCredit ? "+" : "−"}
                    {formatMoney(Math.abs(tx.amount))}
                  </span>
                  <time
                    dateTime={date.toISOString()}
                    className="block text-[11px] text-ink-soft"
                  >
                    {date.toLocaleDateString("es-BO", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </span>
                <span className="shrink-0 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                  {isAdjustment ? null : (
                    <RowButton
                      type="button"
                      label={`Revertir ${isCollection ? "cobro" : "pago"}: ${tx.counterpartyName}`}
                      onClick={() => void reverse({ id: tx._id })}
                    >
                      ↺
                    </RowButton>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
