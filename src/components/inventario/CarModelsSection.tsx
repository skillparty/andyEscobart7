import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState } from "~/components/ui/LedgerCard";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { ModelCompatibilityEditor } from "./ModelCompatibilityEditor";

export function CarModelsSection() {
  const models = useQuery(api.inventario.carModels.list);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section
      aria-label="Modelos de auto"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Inventario
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
            Modelos de auto
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            {models === undefined
              ? "Cargando…"
              : models.length === 1
                ? "1 registro"
                : `${models.length} registros`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen((open) => !open)}
          aria-expanded={isFormOpen}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-semibold transition-all duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {isFormOpen ? "Cancelar" : "+ Agregar"}
        </button>
      </header>

      {isFormOpen ? (
        <div className="mt-4 border-b border-line pb-4">
          <CarModelForm onDone={() => setIsFormOpen(false)} />
        </div>
      ) : null}

      <div className="pt-2">
        {models === undefined ? (
          <EmptyState message="Cargando…" />
        ) : models.length === 0 ? (
          <EmptyState message="Todavía no registraste modelos de auto." />
        ) : (
          <ul className="divide-y divide-line/70">
            {models.map((model) => (
              <CarModelRow key={model._id} model={model} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function CarModelRow({ model }: { model: Doc<"carModels"> }) {
  const updateModel = useMutation(api.inventario.carModels.update);
  const removeModel = useMutation(api.inventario.carModels.remove);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(model.name);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompat, setShowCompat] = useState(false);

  const startEditing = () => {
    setName(model.name);
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateModel({ id: model._id, name: trimmedName });
      setIsEditing(false);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar. Intenta de nuevo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <li className="py-3">
        <form onSubmit={handleSave} className="grid gap-2">
          <div>
            <label htmlFor={`model-name-${model._id}`} className={LABEL_CLASS}>
              Nombre del modelo
            </label>
            <input
              id={`model-name-${model._id}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {error ? <p className="text-xs text-debt">{error}</p> : <span />}
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
              >
                Cancelar
              </button>
              <SubmitButton isSaving={isSaving} label="Guardar" />
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="group flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {model.name}
        </span>
        <span className="flex shrink-0 gap-1">
          <RowButton
            type="button"
            label={
              showCompat
                ? `Ocultar repuestos compatibles: ${model.name}`
                : `Ver repuestos compatibles: ${model.name}`
            }
            onClick={() => setShowCompat((open) => !open)}
          >
            🔗
          </RowButton>
          <span className="flex gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
            <RowButton
              type="button"
              label={`Editar: ${model.name}`}
              onClick={startEditing}
            >
              ✎
            </RowButton>
            <RowButton
              type="button"
              label={`Eliminar: ${model.name}`}
              onClick={() => void removeModel({ id: model._id })}
            >
              ✕
            </RowButton>
          </span>
        </span>
      </div>
      {showCompat ? <ModelCompatibilityEditor carModelId={model._id} /> : null}
    </li>
  );
}

function CarModelForm({ onDone }: { onDone: () => void }) {
  const createModel = useMutation(api.inventario.carModels.create);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await createModel({ name });
      setName("");
      onDone();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar. Intenta de nuevo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div>
        <label htmlFor="new-model-name" className={LABEL_CLASS}>
          Nombre del modelo
        </label>
        <input
          id="new-model-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Toyota Hilux 2018-2022"
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-debt">{error}</p> : <span />}
        <SubmitButton isSaving={isSaving} />
      </div>
    </form>
  );
}
