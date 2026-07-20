import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { lazy, Suspense, useState } from "react";
import { BrandMark } from "~/components/ui/BrandMark";
import { exportPdf } from "~/lib/pdf";
import { api } from "../../../convex/_generated/api";
import { AccountsSection } from "./AccountsSection";
import { HeroPanel } from "./HeroPanel";
import { HistorySection } from "./HistorySection";
import { PayablesSection } from "./PayablesSection";
import { ReceivablesSection } from "./ReceivablesSection";
import { VoiceAssistant } from "./VoiceAssistant";

// Recharts es pesado (~100kb gz). Se carga aparte del bundle inicial.
const ChartsSection = lazy(() =>
  import("./ChartsSection").then((m) => ({ default: m.ChartsSection })),
);

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
      <header className="sticky top-0 z-30 border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <p className="font-display text-xl font-semibold tracking-tight">
              Cuentas Claras
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/inventario"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Inventario
            </Link>
            <Link
              to="/compras"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Compras
            </Link>
            <Link
              to="/kardex"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Kardex
            </Link>
            <ExportMenu onExport={handleExport} isExporting={isExporting} />
            <UserMenu viewer={viewer} onSignOut={() => void signOut()} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <div className="pt-8 sm:pt-10">
          <HeroPanel
            name={viewer?.name ?? null}
            netBalance={netBalance}
            totalAccounts={totalAccounts}
            totalReceivable={totalReceivable}
            totalPayable={totalPayable}
          />
        </div>

        {/* Bento: columna izquierda (lo que tengo + historial), derecha
            (gráfico + deudas por cobrar/pagar). */}
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="rise-stagger grid gap-5">
            <AccountsSection accounts={accounts} />
            <HistorySection />
          </div>
          <div className="rise-stagger rise-stagger-late grid gap-5">
            <Suspense fallback={<ChartsFallback />}>
              <ChartsSection
                totalAccounts={totalAccounts}
                totalReceivable={totalReceivable}
                totalPayable={totalPayable}
                monthlyData={monthlyData}
              />
            </Suspense>
            <ReceivablesSection receivables={receivables} accounts={accounts} />
            <PayablesSection payables={payables} accounts={accounts} />
          </div>
        </div>
      </main>

      <VoiceAssistant />
    </div>
  );
}

interface ExportMenuProps {
  onExport: (period: "weekly" | "monthly") => void;
  isExporting: boolean;
}

function DownloadIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ExportOption({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-line/30"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink/5 text-ink-soft">
        <DownloadIcon />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-ink-soft">{subtitle}</span>
      </span>
    </button>
  );
}

function ExportMenu({ onExport, isExporting }: ExportMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isExporting}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
      >
        {isExporting ? <Spinner /> : <DownloadIcon />}
        <span className="hidden sm:inline">
          {isExporting ? "Exportando…" : "PDF"}
        </span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-card p-1 shadow-lg">
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Exportar resumen
            </p>
            <ExportOption
              title="Esta semana"
              subtitle="Movimientos de la semana actual"
              onClick={() => {
                setOpen(false);
                void onExport("weekly");
              }}
            />
            <ExportOption
              title="Este mes"
              subtitle="Movimientos del mes en curso"
              onClick={() => {
                setOpen(false);
                void onExport("monthly");
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

interface ViewerInfo {
  name: string | null;
  email: string | null;
  image: string | null;
}

function UserMenu({
  viewer,
  onSignOut,
}: {
  viewer: ViewerInfo | null | undefined;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const label = viewer?.name ?? viewer?.email ?? "Cuenta";
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Menú de cuenta"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-line py-0.5 pl-0.5 pr-2.5 transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {viewer?.image ? (
          <img
            src={viewer.image}
            alt=""
            width={28}
            height={28}
            referrerPolicy="no-referrer"
            className="size-7 rounded-full"
          />
        ) : (
          <span className="grid size-7 place-items-center rounded-full bg-ink text-xs font-semibold text-paper">
            {initial}
          </span>
        )}
        <span className="hidden max-w-32 truncate text-sm font-medium sm:inline">
          {label}
        </span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-card p-1 shadow-lg">
            <div className="px-3 py-2">
              {viewer?.name ? (
                <p className="truncate text-sm font-medium">{viewer.name}</p>
              ) : null}
              {viewer?.email ? (
                <p className="truncate text-xs text-ink-soft">{viewer.email}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
              className="w-full rounded-lg border-t border-line px-3 py-2.5 text-left text-sm font-medium transition-colors hover:bg-line/30"
            >
              Salir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Placeholder con la misma huella que ChartsSection mientras carga el chunk.
function ChartsFallback() {
  return (
    <div className="grid gap-5" aria-hidden="true">
      <div className="h-48 animate-pulse rounded-2xl border border-line bg-card" />
      <div className="h-48 animate-pulse rounded-2xl border border-line bg-card" />
    </div>
  );
}

function buildMonthlyData(
  transactions: { paidAt: number; amount: number; type: string }[],
): { month: string; pagado: number }[] {
  const now = new Date();
  const months: { month: string; pagado: number }[] = [];
  const payments = transactions.filter((tx) => tx.type === "payment");

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("es-BO", { month: "short" });
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const pagado = payments
      .filter((tx) => tx.paidAt >= start && tx.paidAt < end)
      .reduce((sum, tx) => sum + tx.amount, 0);
    months.push({ month: label, pagado });
  }

  return months;
}
