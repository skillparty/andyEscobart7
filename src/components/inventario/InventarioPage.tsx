import { Header } from "~/components/ui/Header";
import { CarModelsSection } from "./CarModelsSection";
import { ExcelImportPanel } from "./ExcelImportPanel";
import { InventarioSearch } from "./InventarioSearch";
import { ItemsSection } from "./ItemsSection";

export function InventarioPage() {
  return (
    <div className="min-h-dvh">
      <Header title="Inventario" />

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
