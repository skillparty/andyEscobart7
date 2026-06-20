import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "~/lib/money";

interface ChartsSectionProps {
  totalAccounts: number;
  totalReceivable: number;
  totalPayable: number;
  monthlyData: { month: string; pagado: number }[];
}

// Valores concretos de los tokens semánticos (espejo de app.css). Recharts
// aplica `fill` como atributo SVG, donde var(--token) no resuelve; por eso aquí
// usamos el oklch literal en vez de la variable CSS.
const COLORS = {
  positive: "oklch(50% 0.11 160)",
  claim: "oklch(58% 0.12 70)",
  debt: "oklch(52% 0.15 30)",
  debtSoft: "oklch(94.5% 0.03 30)",
  inkSoft: "oklch(48% 0.02 55)",
};

const CARD_CLASS =
  "rise-in rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_oklch(0%_0_0/0.07)]";

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  border: "1px solid var(--color-line)",
  background: "var(--color-card)",
  fontSize: "12px",
};

function ChartHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
        <span aria-hidden="true" className="size-2 rounded-full bg-ink/40" />
        {eyebrow}
      </p>
      <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
        {title}
      </h2>
    </header>
  );
}

export function ChartsSection({
  totalAccounts,
  totalReceivable,
  totalPayable,
  monthlyData,
}: ChartsSectionProps) {
  const net = totalAccounts + totalReceivable - totalPayable;
  const donutData = [
    {
      name: "En cuentas",
      value: Math.max(totalAccounts, 0),
      color: COLORS.positive,
    },
    {
      name: "Te deben",
      value: Math.max(totalReceivable, 0),
      color: COLORS.claim,
    },
    { name: "Debes", value: Math.max(totalPayable, 0), color: COLORS.debt },
  ].filter((d) => d.value > 0);

  const hasPayments = monthlyData.some((d) => d.pagado > 0);

  return (
    <section aria-label="Gráficos financieros" className="grid gap-5">
      <div className={CARD_CLASS}>
        <ChartHeader eyebrow="Distribución" title="Balance general" />
        {donutData.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            Sin datos todavía. Agrega cuentas o deudas.
          </p>
        ) : (
          <div className="mt-4 flex items-center gap-6">
            <div
              className="relative shrink-0"
              style={{ width: 160, height: 160 }}
            >
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={74}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatMoney(value as number)}
                    contentStyle={TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Neto al centro del donut */}
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    Neto
                  </p>
                  <p
                    className={`font-display text-sm font-semibold tabular-nums ${
                      net < 0 ? "text-debt" : "text-ink"
                    }`}
                  >
                    {formatMoney(net)}
                  </p>
                </div>
              </div>
            </div>
            <ul className="flex flex-1 flex-col gap-2.5 text-sm">
              {donutData.map((entry) => (
                <li key={entry.name} className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ background: entry.color }}
                  />
                  <span className="text-ink-soft">{entry.name}</span>
                  <span className="ml-auto font-medium tabular-nums">
                    {formatMoney(entry.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={CARD_CLASS}>
        <ChartHeader eyebrow="Últimos 6 meses" title="Pagos realizados" />
        <div className="mt-4">
          {!hasPayments ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              Aún no hay pagos registrados.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: COLORS.inkSoft }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: COLORS.inkSoft }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v === 0 ? "0" : `${Math.round(v / 1000)}k`
                  }
                />
                <Tooltip
                  cursor={{ fill: COLORS.debtSoft, opacity: 0.5 }}
                  formatter={(value) => [
                    formatMoney(value as number),
                    "Pagado",
                  ]}
                  contentStyle={TOOLTIP_STYLE}
                />
                <Bar
                  dataKey="pagado"
                  fill={COLORS.debt}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
