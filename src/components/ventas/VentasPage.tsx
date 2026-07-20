import { Header } from "~/components/ui/Header";
import { MarginSummary } from "./MarginSummary";
import { SaleForm } from "./SaleForm";
import { SalesSection } from "./SalesSection";

export function VentasPage() {
  return (
    <div className="min-h-dvh">
      <Header title="Ventas" />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8 sm:pt-10">
        <div className="pt-0">
          <MarginSummary />
        </div>
        <div className="rise-stagger mt-5 grid items-start gap-5">
          <SaleForm />
          <SalesSection />
        </div>
      </main>
    </div>
  );
}
