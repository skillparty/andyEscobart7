/** Curva ease-out cúbica: arranca rápido y frena suave. t en [0, 1]. */
export function easeOutCubic(t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1);
  return 1 - (1 - clamped) ** 3;
}

/** Interpola entre dos valores con progreso eased en [0, 1]. */
export function interpolate(
  from: number,
  to: number,
  progress: number,
): number {
  return from + (to - from) * easeOutCubic(progress);
}
