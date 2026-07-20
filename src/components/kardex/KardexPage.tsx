import { Header } from "~/components/ui/Header";
import { ValuationSection } from "./ValuationSection";

export function KardexPage() {
  return (
    <div className="min-h-dvh">
      <Header title="Kardex" />

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 sm:pt-10">
        <ValuationSection />
      </main>
    </div>
  );
}
