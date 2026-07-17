import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState } from "~/components/ui/LedgerCard";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { centsToInput, formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

export function ItemsSection() {
  const items = useQuery(api.inventario.items.list);
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <section
      aria-label="Repuestos"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            Inventario
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
            Repuestos
          </h2>
          <p className="mt-1 text-xs text-ink-soft">
            {items === undefined
              ? "Cargando…"
              : items.length === 1
                ? "1 registro"
                : `${items.length} registros`}
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
          <ItemForm onDone={() => setIsFormOpen(false)} />
        </div>
      ) : null}

      <div className="pt-2">
        {items === undefined ? (
          <EmptyState message="Cargando…" />
        ) : items.length === 0 ? (
          <EmptyState message="Todavía no registraste repuestos." />
        ) : (
          <ul className="divide-y divide-line/70">
            {items.map((item) => (
              <ItemRow key={item._id} item={item} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ItemRow({ item }: { item: Doc<"items"> }) {
  const updateItem = useMutation(api.inventario.items.update);
  const removeItem = useMutation(api.inventario.items.remove);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [stock, setStock] = useState(String(item.stock));
  const [price, setPrice] = useState(
    item.priceCents !== undefined ? centsToInput(item.priceCents) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startEditing = () => {
    setName(item.name);
    setStock(String(item.stock));
    setPrice(
      item.priceCents !== undefined ? centsToInput(item.priceCents) : "",
    );
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
    const parsedStock = Number(stock.trim());
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("El stock debe ser un entero mayor o igual a cero");
      return;
    }
    let priceCents: number | undefined;
    if (price.trim().length > 0) {
      const parsedPrice = parseAmount(price);
      if (parsedPrice === null || parsedPrice < 0) {
        setError("El precio no es válido");
        return;
      }
      priceCents = parsedPrice;
    }
    setError(null);
    setIsSaving(true);
    try {
      await updateItem({
        id: item._id,
        name: trimmedName,
        stock: parsedStock,
        priceCents,
      });
      setIsEditing(false);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isEditing) {
    return (
      <li className="py-3">
        <form onSubmit={handleSave} className="grid gap-2">
          <div className="grid gap-2 sm:grid-cols-[1fr_6rem_8rem]">
            <div>
              <label htmlFor={`item-name-${item._id}`} className={LABEL_CLASS}>
                Nombre
              </label>
              <input
                id={`item-name-${item._id}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`item-stock-${item._id}`} className={LABEL_CLASS}>
                Stock
              </label>
              <input
                id={`item-stock-${item._id}`}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                inputMode="numeric"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`item-price-${item._id}`} className={LABEL_CLASS}>
                Precio (opcional)
              </label>
              <input
                id={`item-price-${item._id}`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                placeholder="45.00"
                className={INPUT_CLASS}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {error ? (
              <p className="text-xs text-debt">{error}</p>
            ) : (
              <p className="text-xs text-ink-soft">
                Código: {item.sku} (no se puede cambiar)
              </p>
            )}
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
    <li className="group flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{item.name}</span>
        <span className="block truncate text-xs text-ink-soft">
          {item.sku} · stock {item.stock}
        </span>
      </span>
      {item.priceCents !== undefined ? (
        <span className="shrink-0 font-medium tabular-nums text-ink-soft">
          {formatMoney(item.priceCents)}
        </span>
      ) : null}
      <span className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <RowButton
          type="button"
          label={`Editar: ${item.name}`}
          onClick={startEditing}
        >
          ✎
        </RowButton>
        <RowButton
          type="button"
          label={`Eliminar: ${item.name}`}
          onClick={() => void removeItem({ id: item._id })}
        >
          ✕
        </RowButton>
      </span>
    </li>
  );
}

function ItemForm({ onDone }: { onDone: () => void }) {
  const createItem = useMutation(api.inventario.items.create);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [stock, setStock] = useState("0");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sku.trim().length === 0) {
      setError("El código o número de serie es obligatorio");
      return;
    }
    if (name.trim().length === 0) {
      setError("El nombre es obligatorio");
      return;
    }
    const parsedStock = Number(stock.trim() || "0");
    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setError("El stock debe ser un entero mayor o igual a cero");
      return;
    }
    let priceCents: number | undefined;
    if (price.trim().length > 0) {
      const parsedPrice = parseAmount(price);
      if (parsedPrice === null || parsedPrice < 0) {
        setError("El precio no es válido");
        return;
      }
      priceCents = parsedPrice;
    }
    setError(null);
    setIsSaving(true);
    try {
      await createItem({ sku, name, stock: parsedStock, priceCents });
      setSku("");
      setName("");
      setStock("0");
      setPrice("");
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
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div>
          <label htmlFor="new-item-sku" className={LABEL_CLASS}>
            Código / N° de serie
          </label>
          <input
            id="new-item-sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="FA-100"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-item-name" className={LABEL_CLASS}>
            Nombre
          </label>
          <input
            id="new-item-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Filtro de aceite"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div>
          <label htmlFor="new-item-stock" className={LABEL_CLASS}>
            Stock
          </label>
          <input
            id="new-item-stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            inputMode="numeric"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-item-price" className={LABEL_CLASS}>
            Precio (opcional)
          </label>
          <input
            id="new-item-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            inputMode="decimal"
            placeholder="45.00"
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
