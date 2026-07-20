import { type RefObject, useEffect } from "react";

// Factor de interpolación por frame: bajo = el halo "persigue" al puntero
// con retardo suave en vez de pegarse a él.
const LERP_FACTOR = 0.09;
const SETTLE_THRESHOLD_PX = 0.5;

/**
 * Hace que un elemento decorativo (halo de luz) siga al puntero dentro de un
 * contenedor, con persecución suavizada vía requestAnimationFrame. Solo muta
 * `transform` (compositor-friendly). Se desactiva con prefers-reduced-motion
 * y en dispositivos táctiles: el halo queda en su posición inicial.
 */
export function usePointerGlow(
  containerRef: RefObject<HTMLElement | null>,
  glowRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const container = containerRef.current;
    const glow = glowRef.current;
    if (container === null || glow === null) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    if (!window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    let raf = 0;
    let isRunning = false;
    // Posición inicial: espejo del transform inline del elemento para que el
    // primer movimiento arranque desde donde el halo ya está pintado.
    let x = -96;
    let y = -96;
    let targetX = x;
    let targetY = y;

    const tick = () => {
      x += (targetX - x) * LERP_FACTOR;
      y += (targetY - y) * LERP_FACTOR;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (
        Math.abs(targetX - x) > SETTLE_THRESHOLD_PX ||
        Math.abs(targetY - y) > SETTLE_THRESHOLD_PX
      ) {
        raf = requestAnimationFrame(tick);
      } else {
        isRunning = false;
      }
    };

    const handleMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      // Centrar el halo en el puntero: el transform mueve su esquina superior
      // izquierda, así que se compensa con la mitad de su tamaño.
      targetX = event.clientX - rect.left - glow.offsetWidth / 2;
      targetY = event.clientY - rect.top - glow.offsetHeight / 2;
      if (!isRunning) {
        isRunning = true;
        raf = requestAnimationFrame(tick);
      }
    };

    container.addEventListener("pointermove", handleMove);
    return () => {
      container.removeEventListener("pointermove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, [containerRef, glowRef]);
}
