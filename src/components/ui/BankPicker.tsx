import type * as React from "react";
import { BANKS } from "~/lib/banks";
import { BankLogo } from "./BankLogo";

interface BankPickerProps {
  value: string;
  onChange: (slug: string) => void;
}

/** Selector visual de banco: una rejilla de logos en vez de un desplegable. */
export function BankPicker({ value, onChange }: BankPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      <BankOption
        label="Sin banco"
        selected={value === ""}
        onClick={() => onChange("")}
      >
        <span className="text-sm font-semibold text-ink-soft">—</span>
      </BankOption>
      {BANKS.map((bank) => (
        <BankOption
          key={bank.slug}
          label={bank.name}
          selected={value === bank.slug}
          onClick={() => onChange(bank.slug)}
        >
          <BankLogo slug={bank.slug} size={28} />
        </BankOption>
      ))}
    </div>
  );
}

function BankOption({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className={`grid aspect-square place-items-center rounded-xl border bg-paper p-2 transition-all duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        selected ? "border-ink ring-1 ring-ink" : "border-line"
      }`}
    >
      {children}
    </button>
  );
}
