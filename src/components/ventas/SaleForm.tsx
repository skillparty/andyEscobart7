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

export function SaleForm() {
  const items = useQuery(api.inventario.items.list);
  const valuation = useQuery(api.kardex.valuation.list);
  const accounts = useQuery(api.accounts.list);
  const createSale = useMutation(api.ventas.sales.create);

  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [paymentType, setPaymentType] = useState<"cash" | "credit">("cash");
  const [accountId, setAccountId] = useState<Id<"accounts"> | "">("");
  const [lines, setLines] = useState<LineDraft[]>([EMPTY_LINE(0)]);
  const [nextKey, setNextKey] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avgCostByItem = new Map(
    (valuation ?? []).map((v) => [v._id, v.avgCostCents]),
  );

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

  const lineAmounts = (
    line: LineDraft,
  ): { revenueCents: number; costCents: number } | null => {
    const quantity = Number(line.quantity);
    const priceCents = parseAmount(line.price);
    if (!Number.isInteger(quantity) || quantity <= 0) return null;
    if (priceCents === null || priceCents <= 0) return null;
    const avgCostCents =
      line.itemId === "" ? 0 : (avgCostByItem.get(line.itemId) ?? 0);
    return {
      revenueCents: quantity * priceCents,
      costCents: quantity * avgCostCents,
    };
  };

  const totals = lines.reduce(
    (acc, line) => {
      const amounts = lineAmounts(line);
      if (amounts === null) return acc;
      return {
        revenueCents: acc.revenueCents + amounts.revenueCents,
        costCents: acc.costCents + amounts.costCents,
      };
    },
    { revenueCents: 0, costCents: 0 },
  );
  const marginCents = totals.revenueCents - totals.costCents;
  const marginPct =
    totals.revenueCents > 0
      ? Math.round((marginCents / totals.revenueCents) * 100)
      : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccess(null);

    if (customerName.trim().length === 0) {
      setError("El nombre del cliente es obligatorio");
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
      await createSale({
        customerName,
        note: note.trim() || undefined,
        paymentType,
        accountId:
          paymentType === "cash" && accountId !== "" ? accountId : undefined,
        lines: parsedLines,
      });
      setLines([EMPTY_LINE(nextKey)]);
      setNextKey((k) => k + 1);
      setNote("");
      setSuccess("Venta registrada. El stock ya está actualizado.");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo registrar la venta. Intenta de nuevo.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const hasItems = items !== undefined && items.length > 0;

  return (
    <section
      aria-label="Registrar venta"
      className="rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7"
    >
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
          Ventas
        </p>
        <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
          Registrar venta
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Qué vendiste, a quién y a cuánto. El margen se calcula contra el costo
          promedio del kardex.
        </p>
      </header>

      {!hasItems ? (
        <p className="mt-5 rounded-lg bg-line/30 px-4 py-3 text-sm text-ink-soft">
          Primero registra repuestos en Inventario para poder venderlos.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="sale-customer" className={LABEL_CLASS}>
                Cliente
              </label>
              <input
                id="sale-customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="María Pérez"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label htmlFor="sale-note" className={LABEL_CLASS}>
                Nota (opcional)
              </label>
              <input
                id="sale-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Pedido mostrador"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <fieldset>
            <legend className={LABEL_CLASS}>Productos</legend>
            <div className="grid gap-2">
              {lines.map((line) => {
                const amounts = lineAmounts(line);
                return (
                  <div key={line.key} className="grid gap-1">
                    <div className="flex flex-col gap-2 rounded-xl border border-line bg-paper/50 p-3 sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:gap-2">
                      <div className="flex-1 min-w-0">
                        <select
                          aria-label="Repuesto"
                          value={line.itemId}
                          onChange={(e) => {
                            const itemId = e.target.value as Id<"items"> | "";
                            const item = items.find((i) => i._id === itemId);
                            updateLine(line.key, {
                              itemId,
                              price:
                                line.price === "" &&
                                item?.priceCents !== undefined
                                  ? (item.priceCents / 100).toFixed(2)
                                  : line.price,
                            });
                          }}
                          className={INPUT_CLASS}
                        >
                          <option value="">— Repuesto —</option>
                          {items.map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.sku} · {item.name} (stock {item.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
                        <input
                          aria-label="Cantidad"
                          inputMode="numeric"
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, { quantity: e.target.value })
                          }
                          placeholder="Cant."
                          className={`${INPUT_CLASS} sm:w-20`}
                        />
                        <input
                          aria-label="Precio unitario en bolivianos"
                          inputMode="decimal"
                          value={line.price}
                          onChange={(e) =>
                            updateLine(line.key, { price: e.target.value })
                          }
                          placeholder="Bs c/u"
                          className={`${INPUT_CLASS} sm:w-28`}
                        />
                      </div>
                      <div className="flex justify-end border-t border-line/30 pt-2 sm:border-0 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length === 1}
                          aria-label="Quitar línea"
                          className="grid size-9 place-items-center rounded-md border border-line text-xs text-ink-soft transition-colors hover:border-ink/30 hover:text-ink disabled:opacity-40 sm:size-8"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {amounts !== null ? (
                      <p className="pl-1 text-xs text-ink-soft">
                        Margen de esta línea:{" "}
                        <span
                          className={
                            amounts.revenueCents - amounts.costCents < 0
                              ? "text-debt"
                              : "text-positive"
                          }
                        >
                          {formatMoney(
                            amounts.revenueCents - amounts.costCents,
                          )}
                        </span>
                      </p>
                    ) : null}
                  </div>
                );
              })}
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
              <span className={LABEL_CLASS}>Forma de cobro</span>
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
                <label htmlFor="sale-account" className={LABEL_CLASS}>
                  Cobrado a
                </label>
                <select
                  id="sale-account"
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
                Se creará una deuda del cliente en "Te deben".
              </p>
            )}
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-line pt-4">
            <div>
              <p className="text-xs text-ink-soft">Total de la venta</p>
              <p className="font-display text-2xl font-semibold tabular-nums">
                {formatMoney(totals.revenueCents)}
              </p>
              <p className="mt-1 text-xs text-ink-soft">
                Margen estimado:{" "}
                <span
                  className={`font-semibold tabular-nums ${
                    marginCents < 0 ? "text-debt" : "text-positive"
                  }`}
                >
                  {formatMoney(marginCents)}
                </span>
                {marginPct !== null ? ` (${marginPct}%)` : ""}
              </p>
            </div>
            <SubmitButton isSaving={isSaving} label="Registrar venta" />
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
