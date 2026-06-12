import { useMutation } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState, LedgerCard } from "~/components/ui/LedgerCard";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

interface ReceivablesSectionProps {
  receivables: Doc<"receivables">[] | undefined;
}

export function ReceivablesSection({ receivables }: ReceivablesSectionProps) {
  const removeReceivable = useMutation(api.receivables.remove);
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
            <li key={item._id} className="group flex items-baseline py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {item.debtorName}
                </span>
                {item.note ? (
                  <span className="block truncate text-xs text-ink-soft">
                    {item.note}
                  </span>
                ) : null}
              </span>
              <span className="ledger-dots" />
              <span className="font-medium tabular-nums text-claim">
                {formatMoney(item.amount)}
              </span>
              <span className="ml-3 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
                <RowButton
                  type="button"
                  label={`Marcar como cobrado y eliminar: ${item.debtorName}`}
                  onClick={() => void removeReceivable({ id: item._id })}
                >
                  ✓
                </RowButton>
              </span>
            </li>
          ))}
        </ul>
      )}
    </LedgerCard>
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

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
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
      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-debt">{error}</p> : <span />}
        <SubmitButton isSaving={isSaving} />
      </div>
    </form>
  );
}
