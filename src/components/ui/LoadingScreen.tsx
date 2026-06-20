import { BrandMark } from "./BrandMark";

/** Pantalla de carga de marca mientras se resuelve la sesión. */
export function LoadingScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-paper">
      <div className="flex flex-col items-center gap-5">
        <div className="animate-pulse motion-reduce:animate-none">
          <BrandMark size={56} />
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-semibold tracking-tight">
            Cuentas Claras
          </p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-ink-soft">
            Cargando tu libreta
            <span className="flex gap-1">
              <span className="loading-dot size-1 rounded-full bg-ink-soft" />
              <span className="loading-dot size-1 rounded-full bg-ink-soft" />
              <span className="loading-dot size-1 rounded-full bg-ink-soft" />
            </span>
          </p>
        </div>
      </div>
    </main>
  );
}
