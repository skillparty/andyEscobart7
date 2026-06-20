import { useMutation, usePaginatedQuery } from "convex/react";
import { RowButton } from "~/components/ui/buttons";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

const PAGE_SIZE = 15;

const CARD_CLASS =
  "rise-in rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_oklch(0%_0_0/0.07)] sm:p-7";

function HistoryHeader({ count }: { count?: number }) {
  return (
    <header>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        <span aria-hidden="true" className="size-2 rounded-full bg-ink/40" />
        Registro
      </p>
      <h2 className="mt-1.5 flex items-baseline gap-2 font-display text-2xl font-semibold tracking-tight">
        Historial
        {count !== undefined && count > 0 ? (
          <span className="text-xs font-normal text-ink-soft">
            {count === 1 ? "1 movimiento" : `${count} movimientos`}
          </span>
        ) : null}
      </h2>
    </header>
  );
}

export function HistorySection() {
  const {
    results: transactions,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.transactions.page,
    {},
    { initialNumItems: PAGE_SIZE },
  );
  const reverse = useMutation(api.transactions.reverse);

  if (status === "LoadingFirstPage") {
    return (
      <section aria-label="Historial de pagos" className={CARD_CLASS}>
        <HistoryHeader />
        <p className="mt-4 text-sm text-ink-soft">Cargando…</p>
      </section>
    );
  }

  const groups = groupByDay(transactions);

  return (
    <section aria-label="Historial de pagos" className={CARD_CLASS}>
      <HistoryHeader count={transactions.length} />

      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          Aún no has registrado movimientos.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
                {group.label}
              </p>
              <ul className="divide-y divide-line/70">
                {group.items.map((tx) => (
                  <HistoryRow
                    key={tx._id}
                    tx={tx}
                    onReverse={() => void reverse({ id: tx._id })}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {status === "CanLoadMore" ? (
        <button
          type="button"
          onClick={() => loadMore(PAGE_SIZE)}
          className="mt-5 w-full rounded-lg border border-line px-3 py-2 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Cargar más
        </button>
      ) : null}
      {status === "LoadingMore" ? (
        <p className="mt-4 text-center text-sm text-ink-soft">Cargando…</p>
      ) : null}
    </section>
  );
}

function HistoryRow({
  tx,
  onReverse,
}: {
  tx: Doc<"transactions">;
  onReverse: () => void;
}) {
  const meta = txMeta(tx);
  const date = new Date(tx.paidAt);

  return (
    <li className="group flex items-center gap-3 py-3">
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-full text-base font-semibold ${meta.disc}`}
      >
        {meta.glyph}
      </span>
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
        <span className={`block font-medium tabular-nums ${meta.amount}`}>
          {meta.sign}
          {formatMoney(Math.abs(tx.amount))}
        </span>
        <time
          dateTime={date.toISOString()}
          className="block text-[11px] text-ink-soft"
        >
          {date.toLocaleTimeString("es-BO", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </span>
      <span className="shrink-0 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        {tx.type === "adjustment" ? null : (
          <RowButton
            type="button"
            label={`Revertir ${tx.type === "collection" ? "cobro" : "pago"}: ${tx.counterpartyName}`}
            onClick={onReverse}
          >
            ↺
          </RowButton>
        )}
      </span>
    </li>
  );
}

interface TxMeta {
  glyph: string;
  disc: string;
  amount: string;
  sign: string;
}

/** Estilo e indicador según el tipo de movimiento. */
function txMeta(tx: Doc<"transactions">): TxMeta {
  const isCollection = tx.type === "collection";
  const isAdjustment = tx.type === "adjustment";
  // El ajuste guarda el delta con signo; pago/cobro guardan positivo.
  const isCredit = isCollection || (isAdjustment && tx.amount >= 0);

  if (isAdjustment) {
    return {
      glyph: "±",
      disc: "bg-line/60 text-ink-soft",
      amount: "text-ink-soft",
      sign: isCredit ? "+" : "−",
    };
  }
  if (isCredit) {
    return {
      glyph: "↓",
      disc: "bg-positive-soft text-positive",
      amount: "text-positive",
      sign: "+",
    };
  }
  return {
    glyph: "↑",
    disc: "bg-debt-soft text-debt",
    amount: "text-debt",
    sign: "−",
  };
}

interface DayGroup {
  label: string;
  items: Doc<"transactions">[];
}

/** Agrupa transacciones (ya ordenadas desc por fecha) por día calendario. */
function groupByDay(transactions: Doc<"transactions">[]): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const tx of transactions) {
    const label = dayLabel(tx.paidAt);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(tx);
    } else {
      groups.push({ label, items: [tx] });
    }
  }
  return groups;
}

function startOfDay(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

const DAY_MS = 86_400_000;

function dayLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = (startOfDay(now) - startOfDay(date)) / DAY_MS;
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return date.toLocaleDateString("es-BO", {
    day: "numeric",
    month: "long",
    ...(date.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}
