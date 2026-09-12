import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { SubmitButton } from "~/components/ui/buttons";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface PriceFormProps {
  initialProductId?: Id<"personalProducts">;
  products: Doc<"personalProducts">[];
  onDone: () => void;
}

export function PriceForm({
  initialProductId,
  products,
  onDone,
}: PriceFormProps) {
  const recordPrice = useMutation(api.personal.prices.create);
  const accounts = useQuery(api.accounts.list);

  const [productId, setProductId] = useState<Id<"personalProducts"> | "">(
    initialProductId ?? products[0]?._id ?? "",
  );
  const [priceInput, setPriceInput] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [dateStr, setDateStr] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [storeName, setStoreName] = useState("");
  const [deductFromAccount, setDeductFromAccount] = useState(false);
  const [accountId, setAccountId] = useState<Id<"accounts"> | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedProduct = products.find((p) => p._id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError("Por favor selecciona un producto.");
      return;
    }

    const priceCents = parseAmount(priceInput);
    if (priceCents === null || priceCents <= 0) {
      setError("Ingresa un precio válido mayor a 0 (ej. 12.50).");
      return;
    }

    const parsedQty = Number.parseFloat(quantity);
    if (Number.isNaN(parsedQty) || parsedQty <= 0) {
      setError("Ingresa una cantidad válida mayor a 0.");
      return;
    }

    if (deductFromAccount && !accountId) {
      setError("Selecciona la cuenta de donde se descontará el dinero.");
      return;
    }

    const [year, month, day] = dateStr.split("-").map(Number);
    const purchasedAt = new Date(year, month - 1, day, 12, 0, 0).getTime();

    setIsSaving(true);
    setError(null);

    try {
      await recordPrice({
        productId: productId as Id<"personalProducts">,
        priceCents,
        quantity: parsedQty,
        purchasedAt,
        storeName: storeName.trim() || undefined,
        accountId:
          deductFromAccount && accountId
            ? (accountId as Id<"accounts">)
            : undefined,
        note: note.trim() || undefined,
      });
      onDone();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Error al registrar el precio.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const parsedCents = parseAmount(priceInput);
  const qtyNumber = Number.parseFloat(quantity) || 1;
  const totalPreview = parsedCents !== null ? parsedCents * qtyNumber : null;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="price-product-select" className={LABEL_CLASS}>
            Producto
          </label>
          <select
            id="price-product-select"
            value={productId}
            onChange={(e) =>
              setProductId(e.target.value as Id<"personalProducts">)
            }
            className={INPUT_CLASS}
          >
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="price-input" className={LABEL_CLASS}>
            Precio Unitario ({selectedProduct ? selectedProduct.unit : "unidad"}
            )
          </label>
          <div className="relative">
            <input
              id="price-input"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              placeholder="Ej. 12.50"
              inputMode="decimal"
              className={INPUT_CLASS}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-xs text-ink-soft">
              Bs
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="price-qty-input" className={LABEL_CLASS}>
            Cantidad
          </label>
          <input
            id="price-qty-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            type="number"
            step="any"
            min="0.01"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="price-date-input" className={LABEL_CLASS}>
            Fecha de Compra
          </label>
          <input
            id="price-date-input"
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="price-store-input" className={LABEL_CLASS}>
            Comercio / Mercado (opcional)
          </label>
          <input
            id="price-store-input"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Ej. Mercado Central, Hipermaxi"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Opción de vincular a cuenta bancaria / efectivo */}
      <div className="rounded-xl border border-line bg-paper/60 p-4 space-y-3">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={deductFromAccount}
            onChange={(e) => {
              setDeductFromAccount(e.target.checked);
              if (e.target.checked && !accountId && accounts?.[0]) {
                setAccountId(accounts[0]._id);
              }
            }}
            className="size-4 rounded border-line text-ink focus:ring-ink"
          />
          <span>¿Descontar de una cuenta bancaria / efectivo?</span>
        </label>

        {deductFromAccount && (
          <div className="pt-2 animate-card-enter">
            <label htmlFor="account-select" className={LABEL_CLASS}>
              Seleccionar Cuenta de Pago
            </label>
            <select
              id="account-select"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value as Id<"accounts">)}
              className={INPUT_CLASS}
            >
              <option value="">Selecciona una cuenta...</option>
              {accounts?.map((acc) => (
                <option key={acc._id} value={acc._id}>
                  {acc.name} — Saldo: {formatMoney(acc.balance)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="price-note-input" className={LABEL_CLASS}>
          Nota u observación (opcional)
        </label>
        <input
          id="price-note-input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ej. Oferta 2x1, marca específica, calidad primera..."
          className={INPUT_CLASS}
        />
      </div>

      {/* Previsualización del total */}
      {totalPreview !== null && totalPreview > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-line bg-line/20 px-4 py-2.5 text-xs">
          <span className="text-ink-soft">
            Total a registrar ({quantity} {selectedProduct?.unit ?? "unid"}):
          </span>
          <span className="font-display text-base font-semibold text-ink">
            {formatMoney(totalPreview)}
          </span>
        </div>
      )}

      {error && <p className="text-xs text-debt">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-ink-soft hover:text-ink transition-colors"
        >
          Cancelar
        </button>
        <SubmitButton isSaving={isSaving} label="Registrar Precio" />
      </div>
    </form>
  );
}
