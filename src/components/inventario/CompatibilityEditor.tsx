import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

/** Chips de modelos compatibles con un repuesto, con alta/baja rápida. */
export function CompatibilityEditor({ itemId }: { itemId: Id<"items"> }) {
  const linkedModels = useQuery(
    api.inventario.compatibility.listModelsForItem,
    {
      itemId,
    },
  );
  const allModels = useQuery(api.inventario.carModels.list);
  const link = useMutation(api.inventario.compatibility.link);
  const unlink = useMutation(api.inventario.compatibility.unlink);

  const [selectedModelId, setSelectedModelId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const linkedIds = new Set((linkedModels ?? []).map((m) => m._id));
  const availableModels = (allModels ?? []).filter(
    (m) => !linkedIds.has(m._id),
  );

  const handleLink = async () => {
    if (selectedModelId.length === 0) {
      return;
    }
    setError(null);
    setIsLinking(true);
    try {
      await link({
        itemId,
        carModelId: selectedModelId as Id<"carModels">,
      });
      setSelectedModelId("");
    } catch {
      setError("No se pudo vincular. Intenta de nuevo.");
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-dashed border-line bg-paper/60 p-3">
      <p
        className={
          "mb-2 text-xs font-semibold uppercase tracking-wide text-ink-soft"
        }
      >
        Modelos compatibles
      </p>

      {linkedModels === undefined ? (
        <p className="text-xs text-ink-soft">Cargando…</p>
      ) : linkedModels.length === 0 ? (
        <p className="text-xs italic text-ink-soft">Sin modelos vinculados</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {linkedModels.map((model) => (
            <li key={model._id}>
              <button
                type="button"
                onClick={() => void unlink({ itemId, carModelId: model._id })}
                aria-label={`Quitar modelo compatible: ${model.name}`}
                title="Quitar"
                className="flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-xs font-medium transition-colors hover:border-debt/40 hover:text-debt"
              >
                {model.name}
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {availableModels.length > 0 ? (
        <div className="mt-2 flex items-center gap-2">
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            aria-label="Elegir modelo para vincular"
            className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-2.5 py-1.5 text-xs focus:border-ink/40 focus:outline-none"
          >
            <option value="">— Elegir modelo —</option>
            {availableModels.map((model) => (
              <option key={model._id} value={model._id}>
                {model.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={selectedModelId.length === 0 || isLinking}
            onClick={() => void handleLink()}
            className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-paper transition-all duration-150 hover:opacity-85 disabled:opacity-50"
          >
            {isLinking ? "Vinculando…" : "Vincular"}
          </button>
        </div>
      ) : allModels !== undefined ? (
        <p className="mt-2 text-xs text-ink-soft">
          Ya está vinculado a todos los modelos registrados.
        </p>
      ) : null}

      {error ? <p className="mt-1 text-xs text-debt">{error}</p> : null}
    </div>
  );
}
