import { useQuery } from "convex/react";
import { EmptyState } from "~/components/ui/LedgerCard";
import { formatMoney } from "~/lib/money";
import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

const DATE_FMT = new Intl.DateTimeFormat("es-BO", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const TYPE_LABEL: Record<Doc<"stockMovements">["type"], string> = {
  opening: "Stock inicial",
  purchase: "Compra",
  purchase_reversal: "Anulación de compra",
  adjustment: "Ajuste manual",
};

export function MovementLedger({ itemId }: { itemId: Id<"items"> }) {
  const movements = useQuery(api.kardex.movements.listByItem, { itemId });

  if (movements === undefined) {
    return <p className="mt-2 text-xs text-ink-soft">Cargando ledger…</p>;
  }
  if (movements.length === 0) {
    return <EmptyState message="Sin movimientos registrados." />;
  }

  return (
    <div className="mt-3 overflow-x-auto rounded-lg bg-line/20 p-3">
      <table className="w-full min-w-[32rem] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-ink-soft">
            <th className="pb-2 font-semibold">Fecha</th>
            <th className="pb-2 font-semibold">Movimiento</th>
            <th className="pb-2 text-right font-semibold">Cantidad</th>
            <th className="pb-2 text-right font-semibold">Saldo</th>
            <th className="pb-2 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">
          {movements.map((movement) => (
            <tr key={movement._id}>
              <td className="py-1.5 text-ink-soft">
                {DATE_FMT.format(new Date(movement.occurredAt))}
              </td>
              <td className="py-1.5">
                {TYPE_LABEL[movement.type]}
                {movement.reference ? (
                  <span className="block text-xs text-ink-soft">
                    {movement.reference}
                  </span>
                ) : null}
              </td>
              <td
                className={`py-1.5 text-right tabular-nums ${
                  movement.quantityDelta < 0 ? "text-debt" : "text-positive"
                }`}
              >
                {movement.quantityDelta > 0 ? "+" : ""}
                {movement.quantityDelta}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {movement.balanceQuantity}
              </td>
              <td className="py-1.5 text-right tabular-nums">
                {formatMoney(movement.balanceValueCents)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
