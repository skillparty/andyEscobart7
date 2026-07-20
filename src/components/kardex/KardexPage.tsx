import { Link } from "@tanstack/react-router";
import { BrandMark } from "~/components/ui/BrandMark";
import { ValuationSection } from "./ValuationSection";

export function KardexPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <p className="font-display text-xl font-semibold tracking-tight">
              Kardex
            </p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Secciones">
            <HeaderLink to="/" label="← Cuentas" />
            <HeaderLink to="/inventario" label="Inventario" />
            <HeaderLink to="/compras" label="Compras" />
            <HeaderLink to="/ventas" label="Ventas" />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-10">
        <ValuationSection />
      </main>
    </div>
  );
}

function HeaderLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {label}
    </Link>
  );
}
