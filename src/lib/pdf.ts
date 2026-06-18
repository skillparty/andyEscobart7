import type { Doc } from "../../convex/_generated/dataModel";
import { formatMoney } from "./money";

interface ExportData {
  accounts: Doc<"accounts">[];
  receivables: Doc<"receivables">[];
  payables: Doc<"payables">[];
  transactions: Doc<"transactions">[];
  period: "weekly" | "monthly";
}

export async function exportPdf(data: ExportData): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const periodLabel = data.period === "weekly" ? "Semana actual" : "Mes actual";

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Cuentas Claras", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(periodLabel, 14, 27);
  doc.text(
    now.toLocaleDateString("es-BO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    pageWidth - 14,
    27,
    { align: "right" },
  );
  doc.setTextColor(0);

  // Summary bar
  const totalAccounts = data.accounts.reduce((s, a) => s + a.balance, 0);
  const totalReceivable = data.receivables.reduce((s, r) => s + r.amount, 0);
  const totalPayable = data.payables.reduce((s, p) => s + p.amount, 0);
  const net = totalAccounts + totalReceivable - totalPayable;

  doc.setFillColor(248, 247, 244);
  doc.roundedRect(14, 32, pageWidth - 28, 18, 3, 3, "F");
  doc.setFontSize(9);
  doc.setTextColor(100);

  const cols = [
    { label: "Balance neto", value: net },
    { label: "En cuentas", value: totalAccounts },
    { label: "Te deben", value: totalReceivable },
    { label: "Debes", value: totalPayable },
  ];
  const colW = (pageWidth - 28) / cols.length;
  cols.forEach((col, i) => {
    const x = 14 + colW * i + colW / 2;
    doc.text(col.label, x, 38, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(i === 3 ? 180 : 40, i === 3 ? 60 : 40, i === 3 ? 60 : 40);
    doc.text(formatMoney(col.value), x, 45, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
  });
  doc.setTextColor(0);

  let y = 58;

  // Accounts table
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Cuentas bancarias", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Banco / Cuenta", "Saldo"]],
    body: data.accounts.map((a) => [a.name, formatMoney(a.balance)]),
    columnStyles: { 1: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [230, 228, 222],
      textColor: 40,
      fontStyle: "bold",
    },
    margin: { left: 14, right: 14 },
    theme: "plain",
  });

  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  // Receivables table
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Por cobrar", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Deudor", "Nota", "Monto"]],
    body: data.receivables.length
      ? data.receivables.map((r) => [
          r.debtorName,
          r.note ?? "",
          formatMoney(r.amount),
        ])
      : [["—", "", ""]],
    columnStyles: { 2: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [230, 228, 222],
      textColor: 40,
      fontStyle: "bold",
    },
    margin: { left: 14, right: 14 },
    theme: "plain",
  });

  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  // Payables table
  if (y > 240) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Por pagar", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Acreedor", "Razón", "Monto"]],
    body: data.payables.length
      ? data.payables.map((p) => [
          p.creditorName,
          p.reason,
          formatMoney(p.amount),
        ])
      : [["—", "", ""]],
    columnStyles: { 2: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [230, 228, 222],
      textColor: 40,
      fontStyle: "bold",
    },
    margin: { left: 14, right: 14 },
    theme: "plain",
  });

  y =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  // History table
  const filtered = filterTransactions(data.transactions, data.period);
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Historial de pagos", 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [["Fecha", "Acreedor", "Razón", "Cuenta", "Monto"]],
    body: filtered.length
      ? filtered.map((tx) => [
          new Date(tx.paidAt).toLocaleDateString("es-BO", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          tx.counterpartyName,
          tx.reason,
          tx.accountName ?? "—",
          formatMoney(tx.amount),
        ])
      : [["—", "", "", "", ""]],
    columnStyles: { 4: { halign: "right" } },
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [230, 228, 222],
      textColor: 40,
      fontStyle: "bold",
    },
    margin: { left: 14, right: 14 },
    theme: "plain",
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(
      `Cuentas Claras · Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  const filename = `cuentas-claras-${data.period}-${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function filterTransactions(
  txs: Doc<"transactions">[],
  period: "weekly" | "monthly",
): Doc<"transactions">[] {
  const now = new Date();
  if (period === "weekly") {
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return txs.filter((tx) => tx.paidAt >= monday.getTime());
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  return txs.filter((tx) => tx.paidAt >= start);
}
