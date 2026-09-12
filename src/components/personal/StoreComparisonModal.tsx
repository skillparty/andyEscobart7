import { useQuery } from "convex/react";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface StoreComparisonModalProps {
  productId: Id<"personalProducts">;
  productName: string;
  unit: string;
  onClose: () => void;
}

export function StoreComparisonModal({
  productId,
  productName,
  unit,
  onClose,
}: StoreComparisonModalProps) {
  const stores = useQuery(api.personal.prices.getStoreComparison, {
    productId,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl animate-card-enter">
        <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              ¿Dónde es más barato comprar?
            </h3>
            <p className="text-xs text-ink-soft">
              Comparativa por comercio para:{" "}
              <span className="font-semibold text-ink">{productName}</span> (
              {unit})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>

        {stores === undefined ? (
          <div className="py-12 text-center text-xs text-ink-soft">
            Cargando comparativa…
          </div>
        ) : stores.length === 0 ? (
          <div className="py-12 text-center text-xs text-ink-soft">
            Aún no has registrado comercios para este producto. Al ingresar una
            compra, escribe el nombre del mercado o tienda.
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Comercios Registrados ({stores.length})
            </p>
            <ul className="divide-y divide-line rounded-xl border border-line bg-paper/40">
              {stores.map((s, idx) => (
                <li
                  key={s.storeName}
                  className={`flex items-center justify-between p-4 transition-colors ${
                    s.isBestPrice ? "bg-positive-soft/40" : ""
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🏪"}
                      </span>
                      <p className="font-bold text-sm text-ink truncate">
                        {s.storeName}
                      </p>
                      {s.isBestPrice && (
                        <span className="rounded-md bg-positive-soft border border-positive/30 px-2 py-0.5 text-[10px] font-bold text-positive">
                          Mejor precio
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-soft">
                      {s.recordsCount}{" "}
                      {s.recordsCount === 1
                        ? "compra registrada"
                        : "compras registradas"}{" "}
                      · Promedio: {formatMoney(s.avgPrice)}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display text-base font-bold text-ink">
                      {formatMoney(s.minPrice)}
                    </p>
                    <span className="text-[10px] text-ink-soft">
                      mínimo histórico
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
