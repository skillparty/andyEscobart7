import { useQuery } from "convex/react";
import { useState } from "react";
import { EmptyState } from "~/components/ui/LedgerCard";
import { useDebounce } from "~/hooks/useDebounce";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";

export function InventarioSearch() {
  const [term, setTerm] = useState("");
  const debouncedTerm = useDebounce(term, 300);
  const trimmed = debouncedTerm.trim();
  const hasTerm = trimmed.length > 0;

  const itemResults = useQuery(
    api.inventario.search.searchItems,
    hasTerm ? { term: trimmed } : "skip",
  );
  const modelResults = useQuery(
    api.inventario.search.searchCarModels,
    hasTerm ? { term: trimmed } : "skip",
  );

  return (
    <section className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Inventario
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Buscar repuesto o modelo
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Escribe un modelo de auto (ej. "Hilux") o un filtro/código (ej.
          "FA-100") para ver la compatibilidad.
        </p>
      </header>

      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Hilux, FA-100, filtro de aceite…"
        aria-label="Buscar por modelo de auto o por repuesto"
        className="mt-4 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm focus:border-ink/40 focus:outline-none"
      />

      {hasTerm ? (
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Repuestos
            </h3>
            {itemResults === undefined ? (
              <EmptyState message="Buscando…" />
            ) : itemResults.length === 0 ? (
              <EmptyState message="Sin resultados" />
            ) : (
              <ul className="mt-2 divide-y divide-line/70">
                {itemResults.map(({ item, models }) => (
                  <li key={item._id} className="py-2.5">
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-ink-soft">
                      {item.sku} · stock {item.stock}
                      {item.priceCents !== undefined
                        ? ` · ${formatMoney(item.priceCents)}`
                        : ""}
                    </p>
                    {models.length > 0 ? (
                      <p className="mt-1 text-xs text-ink-soft">
                        Sirve para: {models.map((m) => m.name).join(", ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs italic text-ink-soft">
                        Sin modelos vinculados
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              Modelos de auto
            </h3>
            {modelResults === undefined ? (
              <EmptyState message="Buscando…" />
            ) : modelResults.length === 0 ? (
              <EmptyState message="Sin resultados" />
            ) : (
              <ul className="mt-2 divide-y divide-line/70">
                {modelResults.map(({ model, items }) => (
                  <li key={model._id} className="py-2.5">
                    <p className="text-sm font-medium">{model.name}</p>
                    {items.length > 0 ? (
                      <p className="mt-1 text-xs text-ink-soft">
                        Repuestos: {items.map((i) => i.name).join(", ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs italic text-ink-soft">
                        Sin repuestos vinculados
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
