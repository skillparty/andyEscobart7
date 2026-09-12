import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState } from "~/components/ui/LedgerCard";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { centsToInput, formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";
import { CompatibilityEditor } from "./CompatibilityEditor";
import { PriceHistoryChart } from "./PriceHistoryChart";

export function ItemsSection() {
  const items = useQuery(api.inventario.items.list);
  const lowStockItems = useQuery(api.inventario.items.listLowStock);
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

      {/* Alerta de Stock Mínimo / Crítico */}
      {lowStockItems && lowStockItems.length > 0 && (
        <div className="mt-4 rounded-xl border border-debt/30 bg-debt-soft/50 p-3 text-xs text-debt flex items-center justify-between gap-2 animate-card-enter">
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span className="font-semibold">
              {lowStockItems.length}{" "}
              {lowStockItems.length === 1
                ? "repuesto está en stock crítico"
                : "repuestos están en stock crítico (por debajo del mínimo)"}
            </span>
          </div>
          <span className="text-[11px] font-medium text-debt/80">
            Requiere reposición
          </span>
        </div>
      )}

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
  const [minStock, setMinStock] = useState(
    item.minStock !== undefined ? String(item.minStock) : "",
  );
  const [price, setPrice] = useState(
    item.priceCents !== undefined ? centsToInput(item.priceCents) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCompat, setShowCompat] = useState(false);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  const startEditing = () => {
    setName(item.name);
    setStock(String(item.stock));
    setMinStock(item.minStock !== undefined ? String(item.minStock) : "");
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
    const parsedMinStock = minStock.trim()
      ? Number(minStock.trim())
      : undefined;
    if (
      parsedMinStock !== undefined &&
      (!Number.isInteger(parsedMinStock) || parsedMinStock < 0)
    ) {
      setError("El stock mínimo debe ser un entero mayor o igual a cero");
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
        minStock: parsedMinStock,
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
          <div className="grid gap-2 sm:grid-cols-[1fr_5rem_5rem_7rem]">
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
              <label
                htmlFor={`item-min-stock-${item._id}`}
                className={LABEL_CLASS}
              >
                Mínimo
              </label>
              <input
                id={`item-min-stock-${item._id}`}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                inputMode="numeric"
                placeholder="0"
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

  const isLowStock =
    item.minStock !== undefined &&
    item.minStock > 0 &&
    item.stock <= item.minStock;

  return (
    <li className="py-3">
      <div className="group flex items-center gap-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {item.name}
          </span>
          <span className="flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
            <span>{item.sku}</span>
            <span>·</span>
            <span>stock {item.stock}</span>
            {isLowStock && (
              <span className="inline-flex items-center rounded-md bg-debt-soft border border-debt/30 px-1.5 py-0.2 text-[10px] font-bold text-debt">
                ⚠️ Stock crítico (mín {item.minStock})
              </span>
            )}
          </span>
        </span>
        {item.priceCents !== undefined ? (
          <span className="shrink-0 font-medium tabular-nums text-ink-soft">
            {formatMoney(item.priceCents)}
          </span>
        ) : null}
        <span className="flex shrink-0 gap-1">
          <RowButton
            type="button"
            label={
              showPriceHistory
                ? `Ocultar historial de precio: ${item.name}`
                : `Ver historial de precio: ${item.name}`
            }
            onClick={() => setShowPriceHistory((open) => !open)}
          >
            📈
          </RowButton>
          <RowButton
            type="button"
            label={
              showCompat
                ? `Ocultar modelos compatibles: ${item.name}`
                : `Ver modelos compatibles: ${item.name}`
            }
            onClick={() => setShowCompat((open) => !open)}
          >
            🔗
          </RowButton>
          <span className="flex gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
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
        </span>
      </div>
      {showPriceHistory ? <PriceHistoryChart itemId={item._id} /> : null}
      {showCompat ? <CompatibilityEditor itemId={item._id} /> : null}
    </li>
  );
}

function ItemForm({ onDone }: { onDone: () => void }) {
  const createItem = useMutation(api.inventario.items.create);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("");
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
    let parsedMinStock: number | undefined;
    if (minStock.trim().length > 0) {
      const parsed = Number(minStock.trim());
      if (!Number.isInteger(parsed) || parsed < 0) {
        setError("El stock mínimo debe ser un entero mayor o igual a cero");
        return;
      }
      parsedMinStock = parsed;
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
      await createItem({
        sku,
        name,
        stock: parsedStock,
        minStock: parsedMinStock,
        priceCents,
      });
      setSku("");
      setName("");
      setStock("0");
      setMinStock("");
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
      <div className="grid gap-3 sm:grid-cols-[6rem_6rem_1fr]">
        <div>
          <label htmlFor="new-item-stock" className={LABEL_CLASS}>
            Stock inicial
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
          <label htmlFor="new-item-min-stock" className={LABEL_CLASS}>
            Mínimo alerta
          </label>
          <input
            id="new-item-min-stock"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            inputMode="numeric"
            placeholder="0"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="new-item-price" className={LABEL_CLASS}>
            Precio venta (opcional)
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
