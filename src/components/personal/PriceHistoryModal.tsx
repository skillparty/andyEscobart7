import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RowButton } from "~/components/ui/buttons";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface PriceHistoryModalProps {
  productId: Id<"personalProducts">;
  productName: string;
  unit: string;
  onClose: () => void;
}

const DATE_FMT = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "2-digit",
});

const SEASON_COLORS: Record<string, string> = {
  Verano: "text-amber-600 bg-amber-50 border-amber-200",
  Otoño: "text-orange-600 bg-orange-50 border-orange-200",
  Invierno: "text-blue-600 bg-blue-50 border-blue-200",
  Primavera: "text-emerald-600 bg-emerald-50 border-emerald-200",
};

export function PriceHistoryModal({
  productId,
  productName,
  unit,
  onClose,
}: PriceHistoryModalProps) {
  const records = useQuery(api.personal.prices.listByProduct, { productId });
  const removeRecord = useMutation(api.personal.prices.remove);
  const [deletingId, setDeletingId] =
    useState<Id<"personalPriceRecords"> | null>(null);

  const chartData = (records ?? []).map((r) => ({
    date: DATE_FMT.format(new Date(r.purchasedAt)),
    timestamp: r.purchasedAt,
    priceBs: r.priceCents / 100,
    store: r.storeName ?? "No especificado",
    season: r.season,
    quantity: r.quantity ?? 1,
    formattedPrice: formatMoney(r.priceCents),
  }));

  const handleDelete = async (id: Id<"personalPriceRecords">) => {
    if (!confirm("¿Eliminar este registro de precio?")) return;
    setDeletingId(id);
    try {
      await removeRecord({ id });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-2xl animate-card-enter">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">
              Evolución de Precios: {productName}
            </h3>
            <p className="text-xs text-ink-soft">
              Historial de asignaciones, temporadas y compras ({unit})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="grid size-8 place-items-center rounded-lg border border-line text-ink-soft hover:border-ink/40 hover:text-ink transition-colors"
          >
            ✕
          </button>
        </div>

        {records === undefined ? (
          <div className="py-16 text-center text-sm text-ink-soft">
            Cargando historial…
          </div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-soft">
            Aún no hay registros de precios para este producto.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Gráfico de Tendencia */}
            <div className="rounded-xl border border-line bg-paper/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-3">
                Tendencia en el Tiempo
              </p>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(87% 0.018 80)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "oklch(48% 0.02 55)" }}
                      tickLine={false}
                      axisLine={{ stroke: "oklch(87% 0.018 80)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "oklch(48% 0.02 55)" }}
                      tickLine={false}
                      axisLine={{ stroke: "oklch(87% 0.018 80)" }}
                      tickFormatter={(val) => `Bs ${val}`}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="rounded-xl border border-line bg-card p-3 shadow-md text-xs">
                            <p className="font-semibold text-ink">
                              {data.date}
                            </p>
                            <p className="text-base font-bold text-ink mt-1">
                              {data.formattedPrice}{" "}
                              <span className="text-xs font-normal text-ink-soft">
                                / {unit}
                              </span>
                            </p>
                            <p className="text-ink-soft mt-1">
                              Tienda: {data.store}
                            </p>
                            <p className="text-ink-soft">
                              Temporada: {data.season}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="priceBs"
                      stroke="oklch(50% 0.11 160)"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: "oklch(50% 0.11 160)",
                        strokeWidth: 1,
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tabla de registros históricos */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft mb-3">
                Historial de Compras ({records.length})
              </p>
              <div className="overflow-x-auto rounded-xl border border-line bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-line/20 text-ink-soft uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Temporada</th>
                      <th className="px-4 py-3">Lugar / Comercio</th>
                      <th className="px-4 py-3 text-right">Precio Unit.</th>
                      <th className="px-4 py-3 text-right">Cant.</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {records
                      .slice()
                      .reverse()
                      .map((r) => {
                        const seasonStyle =
                          SEASON_COLORS[r.season] ??
                          "text-ink-soft bg-paper border-line";
                        return (
                          <tr
                            key={r._id}
                            className="hover:bg-line/10 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-ink">
                              {DATE_FMT.format(new Date(r.purchasedAt))}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${seasonStyle}`}
                              >
                                {r.season}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-ink-soft">
                              {r.storeName || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-ink">
                              {formatMoney(r.priceCents)}
                            </td>
                            <td className="px-4 py-3 text-right text-ink-soft">
                              {r.quantity ?? 1}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-ink">
                              {formatMoney(r.totalCents ?? r.priceCents)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <RowButton
                                type="button"
                                label="Eliminar registro"
                                onClick={() => handleDelete(r._id)}
                                disabled={deletingId === r._id}
                              >
                                ✕
                              </RowButton>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
