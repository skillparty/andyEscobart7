// Validación monetaria compartida para las mutaciones de Convex.
// Todos los montos son centavos enteros para evitar deriva de float
// (espejo de src/lib/money.ts en el frontend).
const MAX_CENTS = 1_000_000_000 * 100; // mil millones de Bs en centavos

/** Lanza si el monto no es un entero de centavos positivo y dentro del límite. */
export function assertPositiveCents(amount: number, label = "El monto"): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} debe ser un monto válido en centavos`);
  }
  if (amount <= 0) {
    throw new Error(`${label} debe ser mayor que cero`);
  }
  if (amount > MAX_CENTS) {
    throw new Error(`${label} excede el límite permitido`);
  }
}

/** Igual que assertPositiveCents pero acepta cero y negativos (saldos, deltas). */
export function assertCents(amount: number, label = "El saldo"): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} debe ser un monto válido en centavos`);
  }
  if (Math.abs(amount) > MAX_CENTS) {
    throw new Error(`${label} excede el límite permitido`);
  }
}

/**
 * Saldo de cuenta: entero, cero o positivo, dentro del límite.
 * Las cuentas de efectivo no pueden quedar en negativo.
 */
export function assertBalanceCents(amount: number, label = "El saldo"): void {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} debe ser un monto válido en centavos`);
  }
  if (amount < 0) {
    throw new Error(`${label} no puede ser negativo`);
  }
  if (amount > MAX_CENTS) {
    throw new Error(`${label} excede el límite permitido`);
  }
}
