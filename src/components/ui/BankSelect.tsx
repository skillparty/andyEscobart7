import { BANKS } from "~/lib/banks";
import { BankLogo } from "./BankLogo";
import { INPUT_CLASS } from "./tones";

interface BankSelectProps {
  value: string;
  onChange: (slug: string) => void;
  id?: string;
}

export function BankSelect({ value, onChange, id }: BankSelectProps) {
  return (
    <div className="relative">
      {value && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2">
          <BankLogo slug={value} size={20} />
        </span>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLASS} appearance-none ${value ? "pl-9" : ""}`}
      >
        <option value="">— Seleccionar banco —</option>
        {BANKS.map((bank) => (
          <option key={bank.slug} value={bank.slug}>
            {bank.name}
          </option>
        ))}
      </select>
    </div>
  );
}
