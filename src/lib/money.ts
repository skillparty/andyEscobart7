export const CURRENCY = "USD";

const formatter = new Intl.NumberFormat("es", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return formatter.format(amount);
}

export function parseAmount(raw: string): number | null {
  const normalized = raw.replace(",", ".").trim();
  if (normalized.length === 0) {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value)) {
    return null;
  }
  return value;
}
