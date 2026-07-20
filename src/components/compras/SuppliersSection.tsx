import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState } from "~/components/ui/LedgerCard";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

export function SuppliersSection() {
  const suppliers = useQuery(api.compras.suppliers.list);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section
      aria-label="Proveedores"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Compras
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
            Proveedores
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            {suppliers === undefined
              ? "Cargando…"
              : suppliers.length === 1
                ? "1 registro"
                : `${suppliers.length} registros`}
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
          <SupplierForm onDone={() => setIsFormOpen(false)} />
        </div>
      ) : null}

      <div className="pt-2">
        {suppliers === undefined ? (
          <EmptyState message="Cargando…" />
        ) : suppliers.length === 0 ? (
          <EmptyState message="Todavía no registraste proveedores." />
        ) : (
          <ul className="divide-y divide-line/70">
            {suppliers.map((supplier) => (
              <SupplierRow key={supplier._id} supplier={supplier} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function SupplierRow({ supplier }: { supplier: Doc<"suppliers"> }) {
  const updateSupplier = useMutation(api.compras.suppliers.update);
  const removeSupplier = useMutation(api.compras.suppliers.remove);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(supplier.name);
  const [phone, setPhone] = useState(supplier.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setName(supplier.name);
    setPhone(supplier.phone ?? "");
    setError(null);
    setIsEditing(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setError("El nombre es obligatorio");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateSupplier({ id: supplier._id, name, phone });
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
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`supplier-name-${supplier._id}`}
                className={LABEL_CLASS}
              >
                Nombre
              </label>
              <input
                id={`supplier-name-${supplier._id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label
                htmlFor={`supplier-phone-${supplier._id}`}
                className={LABEL_CLASS}
              >
                Teléfono
              </label>
              <input
                id={`supplier-phone-${supplier._id}`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
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
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {supplier.name}
          </span>
          {supplier.phone ? (
            <span className="block text-xs text-ink-soft">
              {supplier.phone}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
          <RowButton
            type="button"
            label={`Editar: ${supplier.name}`}
            onClick={startEditing}
          >
            ✎
          </RowButton>
          <RowButton
            type="button"
            label={`Eliminar: ${supplier.name}`}
            onClick={() => void removeSupplier({ id: supplier._id })}
          >
            ✕
          </RowButton>
        </span>
      </div>
    </li>
  );
}

function SupplierForm({ onDone }: { onDone: () => void }) {
  const createSupplier = useMutation(api.compras.suppliers.create);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
      await createSupplier({ name, phone: phone || undefined });
      setName("");
      setPhone("");
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="new-supplier-name" className={LABEL_CLASS}>
            Nombre del proveedor
          </label>
          <input
            id="new-supplier-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Importadora Rodríguez"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-supplier-phone" className={LABEL_CLASS}>
            Teléfono (opcional)
          </label>
          <input
            id="new-supplier-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="70012345"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-debt">{error}</p> : <span />}
        <SubmitButton isSaving={isSaving} />
      </div>
    </form>
  );
}
