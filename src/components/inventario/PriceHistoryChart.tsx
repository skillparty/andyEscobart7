import { useQuery } from "convex/react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "~/components/ui/LedgerCard";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const DATE_FMT = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
});

const COLORS = {
  positive: "oklch(50% 0.11 160)",
  debt: "oklch(52% 0.15 30)",
  inkSoft: "oklch(48% 0.02 55)",
  line: "oklch(87% 0.018 80)",
};

const TOOLTIP_STYLE = {
  borderRadius: "10px",
  border: "1px solid var(--color-line)",
  background: "var(--color-card)",
  fontSize: "12px",
};

// Umbral bajo el cual una variación de precio se considera ruido, no
// tendencia real (redondeos, descuentos puntuales de proveedor).
const STABLE_THRESHOLD_PCT = 2;

interface TrendInfo {
  direction: "up" | "down" | "stable";
  pctChange: number;
}

function computeTrend(firstCents: number, lastCents: number): TrendInfo {
  if (firstCents === 0) {
    return { direction: "stable", pctChange: 0 };
  }
  const pctChange = ((lastCents - firstCents) / firstCents) * 100;
  if (Math.abs(pctChange) < STABLE_THRESHOLD_PCT) {
    return { direction: "stable", pctChange };
  }
  return { direction: pctChange > 0 ? "up" : "down", pctChange };
}

function TrendBadge({ trend }: { trend: TrendInfo }) {
  const config = {
    up: { label: "Subió", icon: "▲", className: "text-debt" },
    down: { label: "Bajó", icon: "▼", className: "text-positive" },
    stable: { label: "Se mantiene", icon: "●", className: "text-ink-soft" },
  }[trend.direction];

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${config.className}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
      {trend.direction !== "stable"
        ? ` ${Math.abs(trend.pctChange).toFixed(0)}%`
        : null}
    </span>
  );
}

export function PriceHistoryChart({ itemId }: { itemId: Id<"items"> }) {
  const history = useQuery(api.compras.purchases.priceHistory, { itemId });

  if (history === undefined) {
    return <EmptyState message="Cargando historial de precio…" />;
  }
  if (history.length === 0) {
    return (
      <EmptyState message="Todavía no hay compras registradas para este repuesto." />
    );
  }

  // La query devuelve más reciente primero; el gráfico se lee de izquierda
  // (más antiguo) a derecha (más reciente).
  const chronological = [...history].reverse();
  const chartData = chronological.map((point) => ({
    date: DATE_FMT.format(new Date(point.purchasedAt)),
    priceCents: point.unitPriceCents / 100,
  }));

  const trend = computeTrend(
    chronological[0].unitPriceCents,
    chronological[chronological.length - 1].unitPriceCents,
  );
  const lineColor =
    trend.direction === "up"
      ? COLORS.debt
      : trend.direction === "down"
        ? COLORS.positive
        : COLORS.inkSoft;

  return (
    <div className="mt-3 rounded-lg bg-line/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink-soft">
          {chronological.length === 1
            ? "1 compra registrada"
            : `${chronological.length} compras registradas`}
        </p>
        {chronological.length > 1 ? <TrendBadge trend={trend} /> : null}
      </div>
      {chronological.length === 1 ? (
        <p className="mt-2 text-sm">
          Precio único: {formatMoney(chronological[0].unitPriceCents)}
        </p>
      ) : (
        <div className="mt-2">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: COLORS.inkSoft }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: COLORS.inkSoft }}
                axisLine={false}
                tickLine={false}
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => `Bs ${v}`}
              />
              <Tooltip
                formatter={(value) => [
                  formatMoney((value as number) * 100),
                  "Precio unitario",
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              <Line
                type="monotone"
                dataKey="priceCents"
                stroke={lineColor}
                strokeWidth={2}
                dot={{ r: 3, fill: lineColor }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
