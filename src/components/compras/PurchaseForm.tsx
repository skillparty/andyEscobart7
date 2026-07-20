import { useMutation, useQuery } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { SubmitButton } from "~/components/ui/buttons";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

interface LineDraft {
  key: number;
  itemId: Id<"items"> | "";
  quantity: string;
  price: string;
}

const EMPTY_LINE = (key: number): LineDraft => ({
  key,
  itemId: "",
  quantity: "1",
  price: "",
});

export function PurchaseForm() {
  const suppliers = useQuery(api.compras.suppliers.list);
  const items = useQuery(api.inventario.items.list);
  const accounts = useQuery(api.accounts.list);
  const createPurchase = useMutation(api.compras.purchases.create);

  const [supplierId, setSupplierId] = useState<Id<"suppliers"> | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [accountId, setAccountId] = useState<Id<"accounts"> | "">("");
  const [lines, setLines] = useState<LineDraft[]>([EMPTY_LINE(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const updateLine = (key: number, patch: Partial<LineDraft>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  };

  const addLine = () => {
    setLines((current) => [...current, EMPTY_LINE(nextKey)]);
    setNextKey((k) => k + 1);
  };

  const removeLine = (key: number) => {
    setLines((current) =>
      current.length > 1 ? current.filter((line) => line.key !== key) : current,
    );
  };

  const lineTotalCents = (line: LineDraft): number | null => {
    const quantity = Number(line.quantity);
    const priceCents = parseAmount(line.price);
    if (!Number.isInteger(quantity) || quantity <= 0) return null;
    if (priceCents === null || priceCents <= 0) return null;
    return quantity * priceCents;
  };

  const totalCents = lines.reduce((sum, line) => {
    const lineTotal = lineTotalCents(line);
    return lineTotal === null ? sum : sum + lineTotal;
  }, 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccess(null);

    if (supplierId === "") {
      setError("Elige un proveedor");
      return;
    }
    const parsedLines: {
      itemId: Id<"items">;
      quantity: number;
      unitPriceCents: number;
    }[] = [];
    for (const line of lines) {
      if (line.itemId === "") {
        setError("Cada línea debe tener un repuesto");
        return;
      }
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setError("La cantidad debe ser un entero mayor que cero");
        return;
      }
      const unitPriceCents = parseAmount(line.price);
      if (unitPriceCents === null || unitPriceCents <= 0) {
        setError("El precio unitario no es válido");
        return;
      }
      parsedLines.push({ itemId: line.itemId, quantity, unitPriceCents });
    }

    setError(null);
    setIsSaving(true);
    try {
      await createPurchase({
        supplierId,
        invoiceNumber: invoiceNumber.trim() || undefined,
        paymentType,
        accountId:
          paymentType === "cash" && accountId !== "" ? accountId : undefined,
        lines: parsedLines,
      });
      setLines([EMPTY_LINE(nextKey)]);
      setNextKey((k) => k + 1);
      setInvoiceNumber("");
      setSuccess("Compra registrada. El stock ya está actualizado.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la compra. Intenta de nuevo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasSuppliers = suppliers !== undefined && suppliers.length > 0;
  const hasItems = items !== undefined && items.length > 0;

  return (
    <section
      aria-label="Registrar compra"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Compras
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Registrar compra
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Qué compraste, a quién y a cuánto. El stock se actualiza solo.
        </p>
      </header>

      {!hasSuppliers || !hasItems ? (
        <p className="mt-5 rounded-lg bg-line/30 px-4 py-3 text-sm text-ink-soft">
          {!hasSuppliers
            ? "Primero registra un proveedor (sección Proveedores, abajo)."
            : "Primero registra repuestos en Inventario para poder comprarlos."}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="purchase-supplier" className={LABEL_CLASS}>
                Proveedor
              </label>
              <select
                id="purchase-supplier"
                value={supplierId}
                onChange={(e) =>
                  setSupplierId(e.target.value as Id<"suppliers"> | "")
                }
                className={INPUT_CLASS}
              >
                <option value="">— Elegir proveedor —</option>
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="purchase-invoice" className={LABEL_CLASS}>
                Nº de factura o recibo (opcional)
              </label>
              <input
                id="purchase-invoice"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="F-0042"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <fieldset>
            <legend className={LABEL_CLASS}>Productos</legend>
            <div className="grid gap-2">
              {lines.map((line) => (
                <div
                  key={line.key}
                  className="grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-center gap-2"
                >
                  <select
                    aria-label="Repuesto"
                    value={line.itemId}
                    onChange={(e) =>
                      updateLine(line.key, {
                        itemId: e.target.value as Id<"items"> | "",
                      })
                    }
                    className={INPUT_CLASS}
                  >
                    <option value="">— Repuesto —</option>
                    {items.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.sku} · {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label="Cantidad"
                    inputMode="numeric"
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, { quantity: e.target.value })
                    }
                    placeholder="Cant."
                    className={INPUT_CLASS}
                  />
                  <input
                    aria-label="Precio unitario en bolivianos"
                    inputMode="decimal"
                    value={line.price}
                    onChange={(e) =>
                      updateLine(line.key, { price: e.target.value })
                    }
                    placeholder="Bs c/u"
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length === 1}
                    aria-label="Quitar línea"
                    className="grid size-8 place-items-center rounded-md border border-line text-xs text-ink-soft transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="mt-2 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
            >
              + Agregar otro producto
            </button>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={LABEL_CLASS}>Forma de pago</span>
              <div className="flex gap-2">
                <PaymentToggle
                  label="Al contado"
                  isActive={paymentType === "cash"}
                  onClick={() => setPaymentType("cash")}
                />
                <PaymentToggle
                  label="Al crédito"
                  isActive={paymentType === "credit"}
                  onClick={() => setPaymentType("credit")}
                />
              </div>
            </div>
            {paymentType === "cash" ? (
              <div>
                <label htmlFor="purchase-account" className={LABEL_CLASS}>
                  Pagado desde
                </label>
                <select
                  id="purchase-account"
                  value={accountId}
                  onChange={(e) =>
                    setAccountId(e.target.value as Id<"accounts"> | "")
                  }
                  className={INPUT_CLASS}
                >
                  <option value="">Efectivo (sin cuenta)</option>
                  {(accounts ?? []).map((account) => (
                    <option key={account._id} value={account._id}>
                      {account.name} · {formatMoney(account.balance)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="self-end pb-2 text-xs text-ink-soft">
                Se creará una deuda al proveedor en "Debes".
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="text-xs text-ink-soft">Total de la compra</p>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatMoney(totalCents)}
              </p>
            </div>
            <SubmitButton isSaving={isSaving} label="Registrar compra" />
          </div>
          {error ? <p className="text-xs text-debt">{error}</p> : null}
          {success ? <p className="text-xs text-positive">{success}</p> : null}
        </form>
      )}
    </section>
  );
}

function PaymentToggle({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        isActive
          ? "border-ink bg-ink text-paper"
          : "border-line bg-paper hover:border-ink/30"
      }`}
    >
      {label}
    </button>
  );
}
