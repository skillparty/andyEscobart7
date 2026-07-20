import { useEffect, useRef, useState } from "react";
import { interpolate } from "~/lib/animation";

const DEFAULT_DURATION_MS = 700;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Anima un número hacia `target` con ease-out vía requestAnimationFrame.
 * Cada cambio de `target` transiciona desde el valor mostrado actual.
 * Con prefers-reduced-motion salta directo al valor final.
 */
export function useCountUp(
  target: number,
  durationMs: number = DEFAULT_DURATION_MS,
): number {
  const [value, setValue] = useState(target);
  const displayed = useRef(target);

  useEffect(() => {
    const from = displayed.current;
    if (from === target) return;

    if (prefersReducedMotion()) {
      displayed.current = target;
      setValue(target);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const next = interpolate(from, target, progress);
      displayed.current = next;
      setValue(next);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}
