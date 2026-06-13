import { useMutation } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState, LedgerCard } from "~/components/ui/LedgerCard";
import { BankLogo } from "~/components/ui/BankLogo";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

interface PayablesSectionProps {
  payables: Doc<"payables">[] | undefined;
  accounts: Doc<"accounts">[] | undefined;
}

export function PayablesSection({ payables, accounts }: PayablesSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const total = (payables ?? []).reduce((sum, p) => sum + p.amount, 0);

  return (
    <LedgerCard
      eyebrow="Debo"
      title="Por pagar"
      tone="debt"
      total={total}
      count={payables?.length ?? 0}
      isFormOpen={isFormOpen}
      onToggleForm={() => setIsFormOpen((open) => !open)}
      form={<PayableForm onDone={() => setIsFormOpen(false)} />}
    >
      {payables === undefined ? (
        <EmptyState message="Cargando…" />
      ) : payables.length === 0 ? (
        <EmptyState message="No debes nada. Disfrútalo." />
      ) : (
        <ul className="divide-y divide-line/70">
          {payables.map((item) => (
            <PayableRow key={item._id} item={item} accounts={accounts} />
          ))}
        </ul>
      )}
    </LedgerCard>
  );
}

function PayableRow({
  item,
  accounts,
}: {
  item: Doc<"payables">;
  accounts: Doc<"accounts">[] | undefined;
}) {
  const payMutation = useMutation(api.payables.pay);
  const [isPaying, setIsPaying] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePay = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await payMutation({
        id: item._id,
        accountId: selectedAccountId
          ? (selectedAccountId as Id<"accounts">)
          : undefined,
      });
    } catch {
      setError("No se pudo registrar el pago. Intenta de nuevo.");
      setIsSaving(false);
    }
  };

  if (isPaying) {
    return (
      <li className="py-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">
              {item.creditorName}
            </span>
            <span className="block truncate text-xs text-ink-soft">
              {item.reason}
            </span>
          </span>
          <span className="shrink-0 font-medium tabular-nums text-debt">
            {formatMoney(item.amount)}
          </span>
        </div>
        <form onSubmit={handlePay} className="grid gap-2">
          <div>
            <label
              htmlFor={`pay-account-${item._id}`}
              className={LABEL_CLASS}
            >
              ¿Con qué cuenta pagas? (opcional)
            </label>
            <div className="relative">
              {selectedAccountId && (
                (() => {
                  const acc = accounts?.find((a) => a._id === selectedAccountId);
                  return acc?.bankSlug ? (
                    <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
                      <BankLogo slug={acc.bankSlug} size={18} />
                    </span>
                  ) : null;
                })()
              )}
              <select
                id={`pay-account-${item._id}`}
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className={`${INPUT_CLASS} appearance-none ${selectedAccountId && accounts?.find((a) => a._id === selectedAccountId)?.bankSlug ? "pl-9" : ""}`}
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
                Se restará {formatMoney(item.amount)} del saldo de la cuenta seleccionada.
              </p>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => { setIsPaying(false); setError(null); }}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold transition-colors hover:border-ink/30"
              >
                Cancelar
              </button>
              <SubmitButton isSaving={isSaving} label="Confirmar pago" />
            </div>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-baseline py-3">
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {item.creditorName}
        </span>
        <span className="block truncate text-xs text-ink-soft">
          {item.reason}
        </span>
      </span>
      <span className="ledger-dots" />
      <span className="font-medium tabular-nums text-debt">
        {formatMoney(item.amount)}
      </span>
      <span className="ml-3 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-hover:opacity-100">
        <RowButton
          type="button"
          label={`Pagar: ${item.creditorName}`}
          onClick={() => setIsPaying(true)}
        >
          ✓
        </RowButton>
      </span>
    </li>
  );
}

function PayableForm({ onDone }: { onDone: () => void }) {
  const createPayable = useMutation(api.payables.create);
  const [creditorName, setCreditorName] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = parseAmount(amount);
    if (creditorName.trim().length === 0) {
      setError("Escribe a quién le debes");
      return;
    }
    if (reason.trim().length === 0) {
      setError("Escribe la razón de la deuda");
      return;
    }
    if (parsedAmount === null || parsedAmount <= 0) {
      setError("Escribe un monto mayor que cero");
      return;
    }
    setIsSaving(true);
    try {
      await createPayable({ creditorName, reason, amount: parsedAmount });
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
          <label htmlFor="payable-name" className={LABEL_CLASS}>
            ¿A quién le debes?
          </label>
          <input
            id="payable-name"
            value={creditorName}
            onChange={(e) => setCreditorName(e.target.value)}
            placeholder="Carlos Gómez"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="payable-amount" className={LABEL_CLASS}>
            Monto
          </label>
          <input
            id="payable-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="450.00"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <div>
        <label htmlFor="payable-reason" className={LABEL_CLASS}>
          Razón o descripción
        </label>
        <input
          id="payable-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Alquiler de junio"
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
