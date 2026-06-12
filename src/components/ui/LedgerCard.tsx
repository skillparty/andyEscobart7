import type * as React from "react";
import { formatMoney } from "~/lib/money";
import { TONE_CLASSES, type Tone } from "./tones";

interface LedgerCardProps {
  eyebrow: string;
  title: string;
  tone: Tone;
  total: number;
  count: number;
  isFormOpen: boolean;
  onToggleForm: () => void;
  form: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function LedgerCard({
  eyebrow,
  title,
  tone,
  total,
  count,
  isFormOpen,
  onToggleForm,
  form,
  children,
  className = "",
}: LedgerCardProps) {
  const toneClasses = TONE_CLASSES[tone];

  return (
    <section
      aria-label={title}
      className={`rise-in flex flex-col rounded-2xl border border-line bg-card p-6 shadow-[0_1px_3px_oklch(0%_0_0/0.04)] sm:p-7 ${className}`}
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${toneClasses.dot}`}
            />
            {eyebrow}
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
            {title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onToggleForm}
          aria-expanded={isFormOpen}
          className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm font-semibold transition-all duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {isFormOpen ? "Cancelar" : "+ Agregar"}
        </button>
      </header>

      <p className="mt-4 flex items-baseline gap-2 border-b border-line pb-4">
        <span
          className={`font-display text-3xl font-semibold tabular-nums tracking-tight ${toneClasses.text}`}
        >
          {formatMoney(total)}
        </span>
        <span className="text-xs text-ink-soft">
          {count === 1 ? "1 registro" : `${count} registros`}
        </span>
      </p>

      {isFormOpen && <div className="border-b border-line py-4">{form}</div>}

      <div className="flex-1 pt-2">{children}</div>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm italic text-ink-soft">{message}</p>
  );
}
