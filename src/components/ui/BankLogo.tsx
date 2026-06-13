import { bankLogoUrl, getBankName } from "~/lib/banks";

interface BankLogoProps {
  slug: string;
  size?: number;
  className?: string;
}

export function BankLogo({ slug, size = 28, className = "" }: BankLogoProps) {
  return (
    <img
      src={bankLogoUrl(slug)}
      alt={getBankName(slug)}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
