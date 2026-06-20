import { useMutation } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { BankLogo } from "~/components/ui/BankLogo";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState, LedgerCard } from "~/components/ui/LedgerCard";
import { Monogram } from "~/components/ui/Monogram";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { centsToInput, formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface ReceivablesSectionProps {
  receivables: Doc<"receivables">[] | undefined;
  accounts: Doc<"accounts">[] | undefined;
}

export function ReceivablesSection({
  receivables,
  accounts,
}: ReceivablesSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const total = (receivables ?? []).reduce((sum, r) => sum + r.amount, 0);

  return (
    <LedgerCard
      eyebrow="Me deben"
      title="Por cobrar"
      tone="claim"
      total={total}
      count={receivables?.length ?? 0}
      isFormOpen={isFormOpen}
      onToggleForm={() => setIsFormOpen((open) => !open)}
      form={<ReceivableForm onDone={() => setIsFormOpen(false)} />}
    >
      {receivables === undefined ? (
        <EmptyState message="Cargando…" />
      ) : receivables.length === 0 ? (
        <EmptyState message="Nadie te debe. ¡Qué tranquilidad!" />
      ) : (
        <ul className="divide-y divide-line/70">
          {receivables.map((item) => (
            <ReceivableRow key={item._id} item={item} accounts={accounts} />
          ))}
        </ul>
      )}
    </LedgerCard>
  );
}

function ReceivableRow({
  item,
  accounts,
}: {
  item: Doc<"receivables">;
  accounts: Doc<"accounts">[] | undefined;
}) {
  const collect = useMutation(api.receivables.collect);
  const removeReceivable = useMutation(api.receivables.remove);
  const [isCollecting, setIsCollecting] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [collectAmount, setCollectAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCollecting = () => {
    setCollectAmount(centsToInput(item.amount));
    setIsCollecting(true);
  };

  const handleCollect = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseAmount(collectAmount);
    if (parsedAmount === null || parsedAmount <= 0) {
      setError("Escribe un monto mayor que cero");
      return;
    }
    if (parsedAmount > item.amount) {
      setError(`No puede superar ${formatMoney(item.amount)}`);
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await collect({
        id: item._id,
        accountId: selectedAccountId
          ? (selectedAccountId as Id<"accounts">)
          : undefined,
        amount: parsedAmount,
      });
    } catch {
      setError("No se pudo registrar el cobro. Intenta de nuevo.");
      setIsSaving(false);
    }
  };

  if (isCollecting) {
    const selected = accounts?.find((a) => a._id === selectedAccountId);
    return (
      <li className="py-3">
        <div className="mb-3 flex items-center gap-3">
          <Monogram name={item.debtorName} tone="claim" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {item.debtorName}
            </span>
            {item.note ? (
              <span className="block truncate text-xs text-ink-soft">
                {item.note}
              </span>
            ) : null}
          </span>
          <span className="shrink-0 font-medium tabular-nums text-claim">
            {formatMoney(item.amount)}
          </span>
        </div>
        <form onSubmit={handleCollect} className="grid gap-2">
          <div>
            <label
              htmlFor={`collect-amount-${item._id}`}
              className={LABEL_CLASS}
            >
              ¿Cuánto cobras?
            </label>
            <input
              id={`collect-amount-${item._id}`}
              value={collectAmount}
              onChange={(e) => setCollectAmount(e.target.value)}
              inputMode="decimal"
              aria-label={`Monto a cobrar de ${item.debtorName}`}
              className={`${INPUT_CLASS} text-right`}
            />
          </div>
          <div>
            <label
              htmlFor={`collect-account-${item._id}`}
              className={LABEL_CLASS}
            >
              ¿A qué cuenta entra? (opcional)
            </label>
            <div className="relative">
              {selected?.bankSlug ? (
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                  <BankLogo slug={selected.bankSlug} size={18} />
                </span>
              ) : null}
              <select
                id={`collect-account-${item._id}`}
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className={`${INPUT_CLASS} appearance-none ${selected?.bankSlug ? "pl-9" : ""}`}
              >
                <option value="">— Sin cuenta específica —</option>
                {(accounts ?? []).map((acc) => (
                  <option key={acc._id} value={acc._id}>
                    {acc.name} · {formatMoney(acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            {error ? (
              <p className="text-xs text-debt">{error}</p>
            ) : (
              <p className="text-xs text-ink-soft">
                Cobro parcial permitido. Te deben {formatMoney(item.amount)}; lo
                cobrado se suma a la cuenta y baja del saldo de la deuda.
              </p>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsCollecting(false);
                  setError(null);
                }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
              >
                Cancelar
              </button>
              <SubmitButton isSaving={isSaving} label="Confirmar cobro" />
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 py-3">
      <Monogram name={item.debtorName} tone="claim" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {item.debtorName}
        </span>
        {item.note ? (
          <span className="block truncate text-xs text-ink-soft">
            {item.note}
          </span>
        ) : null}
      </span>
      <span className="shrink-0 font-medium tabular-nums text-claim">
        {formatMoney(item.amount)}
      </span>
      <span className="flex shrink-0 gap-1 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <RowButton
          type="button"
          label={`Registrar cobro de ${item.debtorName}`}
          onClick={startCollecting}
        >
          ✓
        </RowButton>
        <RowButton
          type="button"
          label={`Descartar sin cobrar: ${item.debtorName}`}
          onClick={() => void removeReceivable({ id: item._id })}
        >
          ✕
        </RowButton>
      </span>
    </li>
  );
}

function ReceivableForm({ onDone }: { onDone: () => void }) {
  const createReceivable = useMutation(api.receivables.create);
  const [debtorName, setDebtorName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (debtorName.trim().length === 0) {
      setError("Escribe quién te debe");
      return;
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      setError("Escribe un monto mayor que cero");
      return;
    }
    setIsSaving(true);
    try {
      await createReceivable({
        debtorName,
        amount: parsedAmount,
        note: note.trim() === "" ? undefined : note,
      });
      onDone();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const parsedPreview = parseAmount(amount);
  const previewAmount =
    parsedPreview !== null ? formatMoney(parsedPreview) : formatMoney(0);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <label htmlFor="receivable-name" className={LABEL_CLASS}>
            ¿Quién te debe?
          </label>
          <input
            id="receivable-name"
            value={debtorName}
            onChange={(e) => setDebtorName(e.target.value)}
            placeholder="María Pérez"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="receivable-amount" className={LABEL_CLASS}>
            Monto
          </label>
          <input
            id="receivable-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="85.00"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label htmlFor="receivable-note" className={LABEL_CLASS}>
          Nota (opcional)
        </label>
        <input
          id="receivable-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Almuerzo del viernes"
          className={INPUT_CLASS}
        />
      </div>

      {/* Vista previa de la fila */}
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-paper/60 p-4">
        <Monogram name={debtorName || "?"} tone="claim" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {debtorName.trim() || "Nombre del deudor"}
          </span>
          {note.trim() ? (
            <span className="block truncate text-xs text-ink-soft">{note}</span>
          ) : null}
        </span>
        <span className="shrink-0 font-medium tabular-nums text-claim">
          {previewAmount}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-debt">{error}</p> : <span />}
        <SubmitButton isSaving={isSaving} />
      </div>
    </form>
  );
}
