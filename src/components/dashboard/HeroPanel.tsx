import { TONE_CLASSES, type Tone } from "~/components/ui/tones";
import { formatMoney } from "~/lib/money";

interface HeroPanelProps {
  name: string | null;
  netBalance: number;
  totalAccounts: number;
  totalReceivable: number;
  totalPayable: number;
}

const DATE_FMT = new Intl.DateTimeFormat("es-BO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

interface Segment {
  tone: Tone;
  label: string;
  value: number;
}

export function HeroPanel({
  name,
  netBalance,
  totalAccounts,
  totalReceivable,
  totalPayable,
}: HeroPanelProps) {
  const firstName = name?.trim().split(/\s+/)[0];
  const today = DATE_FMT.format(new Date());

  const segments: Segment[] = [
    { tone: "positive", label: "En cuentas", value: totalAccounts },
    { tone: "claim", label: "Te deben", value: totalReceivable },
    { tone: "debt", label: "Debes", value: totalPayable },
  ];
  // La barra muestra el peso relativo de cada concepto (magnitud absoluta).
  const totalMagnitude = segments.reduce(
    (sum, s) => sum + Math.max(s.value, 0),
    0,
  );

  return (
    <section
      aria-label="Resumen general"
      className="rise-in relative overflow-hidden rounded-3xl border border-line bg-card p-7 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-10"
    >
      {/* Atmósfera: halo cálido detrás del balance */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-positive-soft opacity-60 blur-3xl"
      />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-ink-soft">
          {firstName ? `Buenas, ${firstName}` : "Buenas"}
          <span className="mx-2 text-line">·</span>
          {today}
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
          <p
            className={`font-display text-[clamp(2.75rem,1.5rem+5vw,5.5rem)] font-semibold leading-none tabular-nums tracking-tight ${
              netBalance < 0 ? "text-debt" : "text-ink"
            }`}
          >
            {formatMoney(netBalance)}
          </p>
          <p className="pb-2 text-sm text-ink-soft">balance neto</p>
        </div>

        <p className="mt-3 max-w-md text-sm text-ink-soft">
          En cuentas, más lo que te deben, menos lo que debes.
        </p>

        {/* Barra de proporción */}
        <div className="mt-8 max-w-xl">
          <div className="flex h-3 overflow-hidden rounded-full bg-line/50">
            {totalMagnitude > 0 &&
              segments.map((s) => {
                const pct = (Math.max(s.value, 0) / totalMagnitude) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={s.label}
                    className={TONE_CLASSES[s.tone].dot}
                    style={{ width: `${pct}%` }}
                    title={`${s.label}: ${formatMoney(s.value)}`}
                  />
                );
              })}
          </div>

          <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
            {segments.map((s) => (
              <div key={s.label} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`size-2.5 rounded-full ${TONE_CLASSES[s.tone].dot}`}
                />
                <dt className="text-xs text-ink-soft">{s.label}</dt>
                <dd
                  className={`text-sm font-semibold tabular-nums ${TONE_CLASSES[s.tone].text}`}
                >
                  {formatMoney(s.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
