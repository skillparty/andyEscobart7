import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { BankLogo } from "~/components/ui/BankLogo";
import { formatMoney } from "~/lib/money";

export function HistorySection() {
  const transactions = useQuery(api.transactions.list);

  if (transactions === undefined) {
    return (
      <section aria-label="Historial de pagos" className="rounded-2xl border border-line bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Historial</p>
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
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">Historial</p>
      <p className="mt-1 text-lg font-semibold">Pagos realizados</p>

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Aún no has registrado pagos.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line/70">
          {transactions.map((tx) => {
            const date = new Date(tx.paidAt);
            return (
              <li key={tx._id} className="flex items-center gap-3 py-3">
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
                  <span className="block font-medium tabular-nums text-debt">
                    −{formatMoney(tx.amount)}
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
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
