import { Header } from "~/components/ui/Header";
import { PurchaseForm } from "./PurchaseForm";
import { PurchasesSection } from "./PurchasesSection";
import { SuppliersSection } from "./SuppliersSection";

export function ComprasPage() {
  return (
    <div className="min-h-dvh">
      <Header title="Compras" />

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-8 sm:pt-10">
        <div className="rise-stagger grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="grid gap-5">
            <PurchaseForm />
            <PurchasesSection />
          </div>
          <SuppliersSection />
        </div>
      </main>
    </div>
  );
}

