import type * as React from "react";

interface RowButtonProps {
  type: "button" | "submit";
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}

export function RowButton({ type, label, onClick, children }: RowButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-7 place-items-center rounded-md border border-line text-xs text-ink-soft transition-colors duration-150 hover:border-ink/30 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
    >
      {children}
    </button>
  );
}

export function SubmitButton({ isSaving }: { isSaving: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSaving}
      className="self-end rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-paper transition-all duration-150 hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
    >
      {isSaving ? "Guardando…" : "Guardar"}
    </button>
  );
}
