export const CURRENCY = "BOB";

// All monetary values are stored as integer centavos to avoid float drift.
const CENTS_PER_UNIT = 100;
const MAX_UNITS = 1_000_000_000; // límite sano: mil millones de Bs

const formatter = new Intl.NumberFormat("es-BO", {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formatea centavos enteros como moneda (ej. 124050 → "Bs 1.240,50"). */
export function formatMoney(cents: number): string {
  return formatter.format(cents / CENTS_PER_UNIT);
}

/**
 * Convierte la entrada decimal del usuario a centavos enteros.
 * Devuelve null si no es un número finito o excede el límite.
 */
export function parseAmount(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".").trim();
  if (normalized.length === 0) {
    return null;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || Math.abs(value) > MAX_UNITS) {
    return null;
  }
  return Math.round(value * CENTS_PER_UNIT);
}

/** Convierte centavos enteros a una cadena decimal editable (ej. 124050 → "1240.50"). */
export function centsToInput(cents: number): string {
  return (cents / CENTS_PER_UNIT).toFixed(2);
}
