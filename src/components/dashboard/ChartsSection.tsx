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

const COLORS = {
  positive: "oklch(55% 0.17 145)",
  claim: "oklch(62% 0.17 250)",
  debt: "oklch(55% 0.22 25)",
};

export function ChartsSection({
  totalAccounts,
  totalReceivable,
  totalPayable,
  monthlyData,
}: ChartsSectionProps) {
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

  return (
    <section aria-label="Gráficos financieros" className="grid gap-5">
      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Distribución
        </p>
        <p className="mt-1 text-lg font-semibold">Balance general</p>
        <div className="mt-4 flex items-center gap-6">
          <ResponsiveContainer width={160} height={160}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={72}
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
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid var(--color-line)",
                  background: "var(--color-card)",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex flex-col gap-2 text-sm">
            {donutData.map((entry) => (
              <li key={entry.name} className="flex items-center gap-2">
                <span
                  className="size-3 rounded-full shrink-0"
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
      </div>

      <div className="rounded-2xl border border-line bg-card p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
          Últimos 6 meses
        </p>
        <p className="mt-1 text-lg font-semibold">Pagos realizados</p>
        <div className="mt-4">
          {monthlyData.every((d) => d.pagado === 0) ? (
            <p className="text-sm text-ink-soft py-8 text-center">
              Aún no hay pagos registrados.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={monthlyData}
                margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
              >
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "oklch(55% 0 0)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(55% 0 0)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v === 0 ? "0" : `${Math.round(v / 1000)}k`
                  }
                />
                <Tooltip
                  formatter={(value) => [
                    formatMoney(value as number),
                    "Pagado",
                  ]}
                  contentStyle={{
                    borderRadius: "10px",
                    border: "1px solid var(--color-line)",
                    background: "var(--color-card)",
                    fontSize: "12px",
                  }}
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
