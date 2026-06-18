import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { TONE_CLASSES, type Tone } from "~/components/ui/tones";
import { formatMoney } from "~/lib/money";
import { exportPdf } from "~/lib/pdf";
import { api } from "../../../convex/_generated/api";
import { AccountsSection } from "./AccountsSection";
import { ChartsSection } from "./ChartsSection";
import { HistorySection } from "./HistorySection";
import { PayablesSection } from "./PayablesSection";
import { ReceivablesSection } from "./ReceivablesSection";

export function Dashboard() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const accounts = useQuery(api.accounts.list);
  const receivables = useQuery(api.receivables.list);
  const payables = useQuery(api.payables.list);
  const transactions = useQuery(api.transactions.list);

  const [isExporting, setIsExporting] = useState(false);

  const totalAccounts = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0);
  const totalReceivable = (receivables ?? []).reduce(
    (sum, r) => sum + r.amount,
    0,
  );
  const totalPayable = (payables ?? []).reduce((sum, p) => sum + p.amount, 0);
  const netBalance = totalAccounts + totalReceivable - totalPayable;

  const monthlyData = buildMonthlyData(transactions ?? []);

  const handleExport = async (period: "weekly" | "monthly") => {
    if (!accounts || !receivables || !payables || !transactions) return;
    setIsExporting(true);
    try {
      await exportPdf({
        accounts,
        receivables,
        payables,
        transactions,
        period,
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <p className="font-display text-xl font-semibold tracking-tight">
            Cuentas Claras
          </p>
          <div className="flex items-center gap-3">
            {viewer?.image ? (
              <img
                src={viewer.image}
                alt=""
                width={32}
                height={32}
                referrerPolicy="no-referrer"
                className="size-8 rounded-full border border-line"
              />
            ) : null}
            <span className="hidden text-sm text-ink-soft sm:inline">
              {viewer?.name ?? viewer?.email ?? ""}
            </span>
            <ExportMenu onExport={handleExport} isExporting={isExporting} />
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section
          aria-label="Resumen general"
          className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6 py-10 sm:py-14"
        >
          <div className="rise-in">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
              Balance neto
            </p>
            <p
              className={`mt-2 font-display text-[clamp(2.5rem,1.5rem+3.5vw,4.5rem)] font-semibold leading-none tabular-nums tracking-tight ${
                netBalance < 0 ? "text-debt" : "text-ink"
              }`}
            >
              {formatMoney(netBalance)}
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              En cuentas, más lo que te deben, menos lo que debes.
            </p>
          </div>
          <dl
            className="rise-in flex flex-wrap gap-3"
            style={{ animationDelay: "80ms" }}
          >
            <SummaryChip
              label="En cuentas"
              amount={totalAccounts}
              tone="positive"
            />
            <SummaryChip
              label="Te deben"
              amount={totalReceivable}
              tone="claim"
            />
            <SummaryChip label="Debes" amount={totalPayable} tone="debt" />
          </dl>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <AccountsSection accounts={accounts} className="lg:col-span-2" />
          <ReceivablesSection receivables={receivables} />
          <PayablesSection payables={payables} accounts={accounts} />

          <ChartsSection
            totalAccounts={totalAccounts}
            totalReceivable={totalReceivable}
            totalPayable={totalPayable}
            monthlyData={monthlyData}
          />

          <div className="lg:col-span-2">
            <HistorySection />
          </div>
        </div>
      </main>
    </div>
  );
}

interface SummaryChipProps {
  label: string;
  amount: number;
  tone: Tone;
}

function SummaryChip({ label, amount, tone }: SummaryChipProps) {
  const toneClasses = TONE_CLASSES[tone];
  return (
    <div className={`rounded-xl px-4 py-3 ${toneClasses.softBg}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-display text-xl font-semibold tabular-nums ${toneClasses.text}`}
      >
        {formatMoney(amount)}
      </dd>
    </div>
  );
}

interface ExportMenuProps {
  onExport: (period: "weekly" | "monthly") => void;
  isExporting: boolean;
}

function ExportMenu({ onExport, isExporting }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isExporting}
        className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
      >
        {isExporting ? "Exportando…" : "PDF ↓"}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-line bg-card shadow-lg">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void onExport("weekly");
              }}
              className="w-full rounded-t-xl px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-line/30"
            >
              Esta semana
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void onExport("monthly");
              }}
              className="w-full rounded-b-xl border-t border-line px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-line/30"
            >
              Este mes
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function buildMonthlyData(
  transactions: { paidAt: number; amount: number }[],
): { month: string; pagado: number }[] {
  const now = new Date();
  const months: { month: string; pagado: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-BO", { month: "short" });
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const pagado = transactions
      .filter((tx) => tx.paidAt >= start && tx.paidAt < end)
      .reduce((sum, tx) => sum + tx.amount, 0);
    months.push({ month: label, pagado });
  }

  return months;
}
