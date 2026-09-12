import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { INPUT_CLASS } from "~/components/ui/tones";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface ShoppingListSectionProps {
  products: Doc<"personalProducts">[];
  onOpenPriceForm: (productId?: Id<"personalProducts">) => void;
}

export function ShoppingListSection({
  products,
  onOpenPriceForm,
}: ShoppingListSectionProps) {
  const items = useQuery(api.personal.shoppingList.list);
  const addItem = useMutation(api.personal.shoppingList.add);
  const toggleItem = useMutation(api.personal.shoppingList.toggle);
  const removeItem = useMutation(api.personal.shoppingList.remove);
  const clearCompleted = useMutation(api.personal.shoppingList.clearCompleted);

  const [selectedProductId, setSelectedProductId] = useState<
    Id<"personalProducts"> | ""
  >("");
  const [customName, setCustomName] = useState("");
  const [targetQuantity, setTargetQuantity] = useState("1");
  const [isAdding, setIsAdding] = useState(false);

  const pendingItems = (items ?? []).filter((i) => !i.isCompleted);
  const completedItems = (items ?? []).filter((i) => i.isCompleted);
  const opportunityCount = pendingItems.filter((i) => i.isOpportunity).length;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId && !customName.trim()) return;

    const qty = Number.parseFloat(targetQuantity) || 1;
    setIsAdding(true);
    try {
      if (selectedProductId) {
        const prod = products.find((p) => p._id === selectedProductId);
        await addItem({
          productId: selectedProductId,
          targetQuantity: qty,
          unit: prod?.unit,
        });
      } else {
        await addItem({
          customName: customName.trim(),
          targetQuantity: qty,
        });
      }
      setSelectedProductId("");
      setCustomName("");
      setTargetQuantity("1");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-6 shadow-sm space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm">🛒</span>
            <h3 className="font-display text-xl font-bold text-ink">
              Lista Inteligente del Mercado
            </h3>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            Planifica tus compras y aprovecha los productos en temporada de
            precio bajo.
          </p>
        </div>

        {opportunityCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-positive/30 bg-positive-soft/50 px-3 py-1 text-xs font-semibold text-positive">
            <span>🟢</span> {opportunityCount}{" "}
            {opportunityCount === 1
              ? "artículo en buen precio"
              : "artículos en buen precio"}
          </span>
        )}
      </div>

      {/* Formulario de agregado rápido */}
      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2.5 items-end"
      >
        <div className="flex-1 w-full sm:w-auto">
          <label
            htmlFor="shop-product-select"
            className="block text-[11px] font-semibold text-ink-soft uppercase mb-1"
          >
            Producto del catálogo
          </label>
          <select
            id="shop-product-select"
            value={selectedProductId}
            onChange={(e) => {
              setSelectedProductId(e.target.value as Id<"personalProducts">);
              if (e.target.value) setCustomName("");
            }}
            className={INPUT_CLASS}
          >
            <option value="">Seleccionar producto existente...</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        {!selectedProductId && (
          <div className="flex-1 w-full sm:w-auto">
            <label
              htmlFor="shop-custom-input"
              className="block text-[11px] font-semibold text-ink-soft uppercase mb-1"
            >
              O escribe un artículo rápido
            </label>
            <input
              id="shop-custom-input"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Ej. Servilletas, Jabón..."
              className={INPUT_CLASS}
            />
          </div>
        )}

        <div className="w-24 shrink-0">
          <label
            htmlFor="shop-qty-input"
            className="block text-[11px] font-semibold text-ink-soft uppercase mb-1"
          >
            Cant.
          </label>
          <input
            id="shop-qty-input"
            type="number"
            step="any"
            min="0.1"
            value={targetQuantity}
            onChange={(e) => setTargetQuantity(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div className="w-full sm:w-auto">
          <SubmitButton isSaving={isAdding} label="＋ Añadir a lista" />
        </div>
      </form>

      {/* Lista de Artículos */}
      {items === undefined ? (
        <div className="py-6 text-center text-xs text-ink-soft">
          Cargando lista…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-paper/40 p-6 text-center text-xs text-ink-soft">
          Tu lista de compras está vacía. Añade productos arriba para planificar
          tu próxima visita al mercado.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Pendientes */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
              Por Comprar ({pendingItems.length})
            </p>
            {pendingItems.length === 0 ? (
              <p className="text-xs text-ink-soft italic">
                ¡Todo comprado! Excelente.
              </p>
            ) : (
              <ul className="divide-y divide-line/60 rounded-xl border border-line bg-card">
                {pendingItems.map((item) => (
                  <li
                    key={item._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-line/10 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => void toggleItem({ id: item._id })}
                        className="mt-1 size-4 rounded border-line text-ink focus:ring-ink"
                        aria-label={`Marcar ${item.name} como comprado`}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-ink truncate">
                            {item.name}
                          </p>
                          <span className="rounded-md bg-paper border border-line px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                            {item.targetQuantity} {item.unit}
                          </span>
                          {item.isOpportunity && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-positive-soft border border-positive/30 px-2 py-0.5 text-[10px] font-bold text-positive">
                              🟢 ¡Buen momento!
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-soft mt-1">
                          {item.latestPrice !== undefined && (
                            <span>
                              Último precio: {formatMoney(item.latestPrice)}
                            </span>
                          )}
                          {item.bestStore && (
                            <span className="font-medium text-ink">
                              🏪 Más económico en:{" "}
                              <span className="underline">
                                {item.bestStore}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {item.productId && (
                        <button
                          type="button"
                          onClick={() => {
                            void toggleItem({ id: item._id });
                            onOpenPriceForm(item.productId);
                          }}
                          className="rounded-lg bg-ink px-2.5 py-1 text-xs font-semibold text-paper hover:bg-ink/90 transition"
                        >
                          Comprar & Registrar
                        </button>
                      )}
                      <RowButton
                        type="button"
                        label="Eliminar de lista"
                        onClick={() => void removeItem({ id: item._id })}
                      >
                        ✕
                      </RowButton>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Completados */}
          {completedItems.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft/70">
                  Comprados ({completedItems.length})
                </p>
                <button
                  type="button"
                  onClick={() => void clearCompleted({})}
                  className="text-[11px] font-medium text-debt hover:underline"
                >
                  Limpiar comprados
                </button>
              </div>

              <ul className="divide-y divide-line/40 rounded-xl border border-line/60 bg-paper/40 opacity-70">
                {completedItems.map((item) => (
                  <li
                    key={item._id}
                    className="flex items-center justify-between gap-3 p-2.5 text-xs text-ink-soft"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => void toggleItem({ id: item._id })}
                        className="size-4 rounded border-line text-ink"
                      />
                      <span className="line-through">{item.name}</span>
                      <span className="text-[10px]">
                        ({item.targetQuantity} {item.unit})
                      </span>
                    </div>
                    <RowButton
                      type="button"
                      label="Eliminar"
                      onClick={() => void removeItem({ id: item._id })}
                    >
                      ✕
                    </RowButton>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
