import { formatMoney } from "./money";

export interface SaleReceiptData {
  customerName: string;
  soldAt: number;
  paymentType: "cash" | "credit";
  note?: string;
  totalCents: number;
  lines: Array<{
    itemSku: string;
    itemName: string;
    quantity: number;
    unitPriceCents: number;
  }>;
}

export async function exportSaleReceiptPdf(
  sale: SaleReceiptData,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a5" }); // Formato A5 ideal para notas de venta/recibos
  const pageWidth = doc.internal.pageSize.getWidth();
  const soldDate = new Date(sale.soldAt);

  // Encabezado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(30);
  doc.text("Cuentas Claras", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("Venta de Repuestos & Servicios", 14, 23);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(50);
  doc.text("NOTA DE VENTA", pageWidth - 14, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(
    soldDate.toLocaleDateString("es-BO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    pageWidth - 14,
    23,
    { align: "right" },
  );

  // Cuadro de datos del cliente
  doc.setDrawColor(220);
  doc.setFillColor(248, 247, 244);
  doc.roundedRect(14, 28, pageWidth - 28, 18, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("Cliente:", 18, 35);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20);
  doc.text(sale.customerName, 32, 35);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("Pago:", 18, 41);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20);
  doc.text(
    sale.paymentType === "cash"
      ? "Contado (Efectivo / Transferencia)"
      : "Crédito (Por cobrar)",
    32,
    41,
  );

  if (sale.note) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text("Nota:", 100, 35);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20);
    doc.text(sale.note, 110, 35);
  }

  // Tabla de items
  const tableRows = sale.lines.map((line) => [
    line.itemSku,
    line.itemName,
    String(line.quantity),
    formatMoney(line.unitPriceCents),
    formatMoney(line.quantity * line.unitPriceCents),
  ]);

  autoTable(doc, {
    startY: 50,
    margin: { left: 14, right: 14 },
    head: [["Código", "Descripción", "Cant.", "P. Unit.", "Total"]],
    body: tableRows,
    theme: "plain",
    headStyles: {
      fillColor: [240, 238, 233],
      textColor: [50, 50, 50],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 2.5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: "auto" },
      2: { halign: "center", cellWidth: 15 },
      3: { halign: "right", cellWidth: 22 },
      4: { halign: "right", cellWidth: 24, fontStyle: "bold" },
    },
  });

  // Total
  // biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable agrega lastAutoTable en runtime
  const finalY = (doc as any).lastAutoTable?.finalY ?? 90;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30);
  doc.text("TOTAL:", pageWidth - 45, finalY + 8);
  doc.text(formatMoney(sale.totalCents), pageWidth - 14, finalY + 8, {
    align: "right",
  });

  // Mensaje de pie de página
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text(
    "¡Gracias por su compra! — Este documento certifica la entrega de los repuestos detallados.",
    pageWidth / 2,
    finalY + 20,
    { align: "center" },
  );

  const safeCustomer = sale.customerName
    .replace(/[^a-zA-Z0-9]/g, "_")
    .toLowerCase();
  doc.save(
    `recibo_venta_${safeCustomer}_${soldDate.toISOString().split("T")[0]}.pdf`,
  );
}
