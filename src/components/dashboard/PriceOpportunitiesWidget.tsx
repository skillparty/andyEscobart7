import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { PriceForm } from "~/components/personal/PriceForm";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";

export function PriceOpportunitiesWidget() {
  const products = useQuery(api.personal.products.list);
  const analyses = useQuery(api.personal.prices.getAnalysis, {});
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtrar oportunidades (buen momento o precio alto relevante)
  const opportunities = (analyses ?? []).filter(
    (a) =>
      a.recommendation.status === "good_time" ||
      a.recommendation.status === "expensive",
  );

  const goodTimeCount = (analyses ?? []).filter(
    (a) => a.recommendation.status === "good_time",
  ).length;

  return (
    <div className="rounded-2xl border border-line bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-line pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Canasta & Temporadas
          </p>
          <h3 className="font-display text-lg font-bold text-ink">
            Oportunidades de Compra
          </h3>
        </div>
        <Link
          to="/precios"
          className="rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink hover:border-ink/40 transition"
        >
          Ver todo →
        </Link>
      </div>

      {analyses === undefined ? (
        <div className="py-6 text-center text-xs text-ink-soft">
          Cargando sugerencias…
        </div>
      ) : products?.length === 0 ? (
        <div className="py-5 text-center space-y-3">
          <p className="text-xs text-ink-soft">
            Registra los precios de tus productos habituales para recibir
            recomendaciones inteligentes según la temporada.
          </p>
          <Link
            to="/precios"
            className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink/90 transition"
          >
            Iniciar Canasta & Precios
          </Link>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {goodTimeCount > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-positive/30 bg-positive-soft/40 px-3 py-2 text-xs text-positive font-medium">
              <span>🟢</span>
              <span>
                {goodTimeCount}{" "}
                {goodTimeCount === 1 ? "producto está" : "productos están"} a
                precio ideal hoy.
              </span>
            </div>
          ) : (
            <p className="text-xs text-ink-soft">
              Los precios registrados se encuentran estables en la temporada
              actual.
            </p>
          )}

          {opportunities.length > 0 ? (
            <ul className="divide-y divide-line/60">
              {opportunities.slice(0, 3).map((item) => {
                const isGood = item.recommendation.status === "good_time";
                return (
                  <li
                    key={item.productId}
                    className="py-2.5 flex items-start justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{isGood ? "🟢" : "🔴"}</span>
                        <p className="truncate text-xs font-bold text-ink">
                          {item.productName}
                        </p>
                      </div>
                      <p className="text-[11px] text-ink-soft mt-0.5 leading-snug">
                        {item.recommendation.advice}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold font-display text-ink">
                        {item.latestPrice !== null
                          ? formatMoney(item.latestPrice)
                          : "—"}
                      </p>
                      <span
                        className={`text-[10px] font-semibold ${
                          isGood ? "text-positive" : "text-debt"
                        }`}
                      >
                        {isGood ? "Comprar" : "Esperar"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-ink hover:underline flex items-center gap-1"
            >
              <span>＋</span> Registrar precio de compra
            </button>
            <Link
              to="/precios"
              className="text-xs text-ink-soft hover:text-ink"
            >
              Ver canasta completa ({products?.length ?? 0})
            </Link>
          </div>
        </div>
      )}

      {/* Modal rápido para registrar precio desde Cuentas */}
      {isModalOpen && products && products.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-card p-6 shadow-2xl animate-card-enter">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
              <h3 className="font-display text-lg font-bold text-ink">
                Registrar Precio de Compra
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid size-7 place-items-center rounded-lg border border-line text-ink-soft hover:text-ink"
              >
                ✕
              </button>
            </div>
            <PriceForm
              products={products}
              onDone={() => setIsModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
