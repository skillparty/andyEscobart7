import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/** Chips de repuestos compatibles con un modelo de auto, con alta/baja rápida. */
export function ModelCompatibilityEditor({
  carModelId,
}: {
  carModelId: Id<"carModels">;
}) {
  const linkedItems = useQuery(api.inventario.compatibility.listItemsForModel, {
    carModelId,
  });
  const allItems = useQuery(api.inventario.items.list);
  const link = useMutation(api.inventario.compatibility.link);
  const unlink = useMutation(api.inventario.compatibility.unlink);

  const [selectedItemId, setSelectedItemId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const linkedIds = new Set((linkedItems ?? []).map((item) => item._id));
  const availableItems = (allItems ?? []).filter(
    (item) => !linkedIds.has(item._id),
  );

  const handleLink = async () => {
    if (selectedItemId.length === 0) {
      return;
    }
    setError(null);
    setIsLinking(true);
    try {
      await link({
        itemId: selectedItemId as Id<"items">,
        carModelId,
      });
      setSelectedItemId("");
    } catch {
      setError("No se pudo vincular. Intenta de nuevo.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-dashed border-line bg-paper/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        Repuestos compatibles
      </p>

      {linkedItems === undefined ? (
        <p className="text-xs text-ink-soft">Cargando…</p>
      ) : linkedItems.length === 0 ? (
        <p className="text-xs italic text-ink-soft">Sin repuestos vinculados</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {linkedItems.map((item) => (
            <li key={item._id}>
              <button
                type="button"
                onClick={() => void unlink({ itemId: item._id, carModelId })}
                aria-label={`Quitar repuesto compatible: ${item.name}`}
                title="Quitar"
                className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-debt/40 hover:text-debt"
              >
                {item.name}
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableItems.length > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <select
            value={selectedItemId}
            onChange={(e) => setSelectedItemId(e.target.value)}
            aria-label="Elegir repuesto para vincular"
            className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs focus:border-ink/40 focus:outline-none"
          >
            <option value="">— Elegir repuesto —</option>
            {availableItems.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name} ({item.sku})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={selectedItemId.length === 0 || isLinking}
            onClick={() => void handleLink()}
            className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition-all duration-150 hover:opacity-85 disabled:opacity-50"
          >
            {isLinking ? "Vinculando…" : "Vincular"}
          </button>
        </div>
      ) : allItems !== undefined ? (
        <p className="mt-2 text-xs text-ink-soft">
          Ya está vinculado a todos los repuestos registrados.
        </p>
      ) : null}

      {error ? <p className="mt-1 text-xs text-debt">{error}</p> : null}
    </div>
  );
}
