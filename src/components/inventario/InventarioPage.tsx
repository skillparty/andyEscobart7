import { Link } from "@tanstack/react-router";
import { BrandMark } from "~/components/ui/BrandMark";
import { CarModelsSection } from "./CarModelsSection";
import { ExcelImportPanel } from "./ExcelImportPanel";
import { InventarioSearch } from "./InventarioSearch";
import { ItemsSection } from "./ItemsSection";

export function InventarioPage() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <p className="font-display text-xl font-semibold tracking-tight">
              Inventario
            </p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Secciones">
            <Link
              to="/"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              ← Cuentas
            </Link>
            <Link
              to="/compras"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Compras
            </Link>
            <Link
              to="/kardex"
              className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition-colors duration-150 hover:border-ink/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Kardex
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8 sm:pt-10">
        <div className="grid gap-5">
          <ExcelImportPanel />
          <InventarioSearch />
          <div className="grid items-start gap-5 lg:grid-cols-2">
            <ItemsSection />
            <CarModelsSection />
          </div>
        </div>
      </main>
    </div>
  );
}
