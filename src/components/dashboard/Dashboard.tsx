import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { TONE_CLASSES, type Tone } from "~/components/ui/tones";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import { AccountsSection } from "./AccountsSection";
import { PayablesSection } from "./PayablesSection";
import { ReceivablesSection } from "./ReceivablesSection";

export function Dashboard() {
  const { signOut } = useAuthActions();
  const viewer = useQuery(api.users.viewer);
  const accounts = useQuery(api.accounts.list);
  const receivables = useQuery(api.receivables.list);
  const payables = useQuery(api.payables.list);

  const totalAccounts = (accounts ?? []).reduce(
    (sum, account) => sum + account.balance,
    0,
  );
  const totalReceivable = (receivables ?? []).reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const totalPayable = (payables ?? []).reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const netBalance = totalAccounts + totalReceivable - totalPayable;

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
          <PayablesSection payables={payables} />
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
