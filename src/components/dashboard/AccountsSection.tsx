import { useMutation } from "convex/react";
import type * as React from "react";
import { useState } from "react";
import { BankLogo } from "~/components/ui/BankLogo";
import { BankPicker } from "~/components/ui/BankPicker";
import { RowButton, SubmitButton } from "~/components/ui/buttons";
import { EmptyState, LedgerCard } from "~/components/ui/LedgerCard";
import { INPUT_CLASS, LABEL_CLASS } from "~/components/ui/tones";
import { getBankName } from "~/lib/banks";
import { centsToInput, formatMoney, parseAmount } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc } from "../../../convex/_generated/dataModel";

interface AccountsSectionProps {
  accounts: Doc<"accounts">[] | undefined;
  className?: string;
}

export function AccountsSection({ accounts, className }: AccountsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const total = (accounts ?? []).reduce((sum, a) => sum + a.balance, 0);

  return (
    <LedgerCard
      eyebrow="Lo que tengo"
      title="Cuentas bancarias"
      tone="positive"
      total={total}
      count={accounts?.length ?? 0}
      isFormOpen={isFormOpen}
      onToggleForm={() => setIsFormOpen((open) => !open)}
      form={<AccountForm onDone={() => setIsFormOpen(false)} />}
      className={className}
    >
      {accounts === undefined ? (
        <EmptyState message="Cargando…" />
      ) : accounts.length === 0 ? (
        <EmptyState message="Aún no tienes cuentas. Agrega la primera." />
      ) : (
        <ul className="grid gap-3 pt-1 sm:grid-cols-2">
          {accounts.map((account) => (
            <AccountRow key={account._id} account={account} />
          ))}
        </ul>
      )}
    </LedgerCard>
  );
}

function AccountRow({ account }: { account: Doc<"accounts"> }) {
  const updateAccount = useMutation(api.accounts.update);
  const removeAccount = useMutation(api.accounts.remove);
  const [isEditing, setIsEditing] = useState(false);
  const [draftBalance, setDraftBalance] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const balance = parseAmount(draftBalance);
    if (balance === null) {
      setError("Monto inválido");
      return;
    }
    try {
      await updateAccount({ id: account._id, balance });
      setIsEditing(false);
      setError(null);
    } catch {
      setError("No se pudo actualizar");
    }
  };

  if (isEditing) {
    return (
      <li className="rounded-xl border border-line bg-paper p-4">
        <p className="mb-2 truncate text-sm font-medium">{account.name}</p>
        <form onSubmit={handleSave} className="flex items-center gap-2">
          <input
            value={draftBalance}
            onChange={(e) => setDraftBalance(e.target.value)}
            inputMode="decimal"
            aria-label={`Nuevo saldo de ${account.name}`}
            className={`${INPUT_CLASS} flex-1 text-right`}
            // biome-ignore lint/a11y/noAutofocus: el usuario acaba de pedir editar
            autoFocus
          />
          <RowButton type="submit" label="Guardar">
            ✓
          </RowButton>
          <RowButton
            type="button"
            label="Cancelar"
            onClick={() => setIsEditing(false)}
          >
            ✕
          </RowButton>
        </form>
        {error && <p className="mt-2 text-xs text-debt">{error}</p>}
      </li>
    );
  }

  return (
    <li className="group relative rounded-xl border border-line bg-paper p-4 transition-colors duration-150 hover:border-ink/20">
      <div className="flex items-center gap-3">
        {account.bankSlug ? (
          <BankLogo slug={account.bankSlug} size={32} className="shrink-0" />
        ) : (
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-line/60 text-xs font-semibold text-ink-soft">
            {account.name.trim().slice(0, 1).toUpperCase() || "·"}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {account.name}
          </span>
          {account.bankSlug && (
            <span className="block truncate text-xs text-ink-soft">
              {getBankName(account.bankSlug)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 gap-1 opacity-100 transition-opacity duration-150 sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
          <RowButton
            type="button"
            label={`Editar saldo de ${account.name}`}
            onClick={() => {
              setDraftBalance(centsToInput(account.balance));
              setIsEditing(true);
            }}
          >
            ✎
          </RowButton>
          <RowButton
            type="button"
            label={`Eliminar cuenta ${account.name}`}
            onClick={() => void removeAccount({ id: account._id })}
          >
            ✕
          </RowButton>
        </span>
      </div>
      <p className="mt-3 font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
        {formatMoney(account.balance)}
      </p>
    </li>
  );
}

function AccountForm({ onDone }: { onDone: () => void }) {
  const createAccount = useMutation(api.accounts.create);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [bankSlug, setBankSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedBalance = parseAmount(balance);
    if (name.trim().length === 0) {
      setError("Escribe el nombre de la cuenta");
      return;
    }
    if (parsedBalance === null) {
      setError("Escribe un saldo válido, por ejemplo 1500.00");
      return;
    }
    setIsSaving(true);
    try {
      await createAccount({
        name,
        balance: parsedBalance,
        bankSlug: bankSlug || undefined,
      });
      onDone();
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const parsedPreview = parseAmount(balance);
  const previewBalance =
    parsedPreview !== null ? formatMoney(parsedPreview) : formatMoney(0);

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div>
        <span className={LABEL_CLASS}>Banco (opcional)</span>
        <BankPicker value={bankSlug} onChange={setBankSlug} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="account-name" className={LABEL_CLASS}>
            Nombre / tipo de cuenta
          </label>
          <input
            id="account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Cuenta de ahorros"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="account-balance" className={LABEL_CLASS}>
            Saldo actual
          </label>
          <input
            id="account-balance"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            inputMode="decimal"
            placeholder="1500.00"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Vista previa de cómo quedará la tarjeta */}
      <div className="rounded-xl border border-dashed border-line bg-paper/60 p-4">
        <div className="flex items-center gap-3">
          {bankSlug ? (
            <BankLogo slug={bankSlug} size={32} className="shrink-0" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-line/60 text-xs font-semibold text-ink-soft">
              {name.trim().slice(0, 1).toUpperCase() || "·"}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {name.trim() || "Nombre de la cuenta"}
            </span>
            {bankSlug && (
              <span className="block truncate text-xs text-ink-soft">
                {getBankName(bankSlug)}
              </span>
            )}
          </span>
        </div>
        <p className="mt-3 font-display text-2xl font-semibold tabular-nums tracking-tight text-ink">
          {previewBalance}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        {error ? <p className="text-xs text-debt">{error}</p> : <span />}
        <SubmitButton isSaving={isSaving} />
      </div>
    </form>
  );
}
