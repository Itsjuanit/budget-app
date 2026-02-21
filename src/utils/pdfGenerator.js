import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatCurrency } from "./format";
import { categories as defaultCategories } from "./categories";

// Paleta de colores consistente con la app
const COLORS = {
  primary: [167, 139, 250],       // #a78bfa — purple
  dark: [26, 26, 46],             // #1a1a2e
  surface: [30, 30, 58],          // #1e1e3a
  text: [226, 232, 240],          // #e2e8f0
  textSecondary: [148, 163, 184], // #94a3b8
  green: [52, 211, 153],          // #34d399
  red: [248, 113, 113],           // #f87171
  white: [255, 255, 255],
};

/**
 * Obtiene el label legible de una categoría a partir de su value.
 */
const getCategoryLabel = (value) => {
  const allCategories = [
    ...defaultCategories.income,
    ...defaultCategories.expense,
  ];
  return allCategories.find((c) => c.value === value)?.label || value;
};

/**
 * Genera el nombre del archivo PDF.
 */
const generateFileName = (selectedMonth) => {
  const [year, month] = selectedMonth.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthName = format(date, "MMMM", { locale: es });
  return `PAGATODO-${monthName}-${year}.pdf`;
};

/**
 * Dibuja fondo oscuro en toda la página.
 */
const drawPageBackground = (doc) => {
  doc.setFillColor(...COLORS.dark);
  doc.rect(
    0,
    0,
    doc.internal.pageSize.getWidth(),
    doc.internal.pageSize.getHeight(),
    "F"
  );
};

/**
 * Dibuja el header del PDF con logo y título.
 */
const drawHeader = (doc, selectedMonth) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Fondo header
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Línea accent
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 40, pageWidth, 2, "F");

  // Título
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("PAGATODO", 14, 22);

  // Subtítulo — mes y año
  const [year, month] = selectedMonth.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const monthLabel = format(date, "MMMM yyyy", { locale: es });
  const capitalizedMonth =
    monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(`Reporte mensual — ${capitalizedMonth}`, 14, 33);

  // Fecha de generación
  doc.setFontSize(8);
  doc.text(
    `Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
    pageWidth - 14,
    33,
    { align: "right" }
  );
};

/**
 * Dibuja las cards de resumen (ingresos, gastos, ahorro).
 */
const drawSummaryCards = (doc, data, startY) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 49) / 4;
  const cardHeight = 28;
  const available = data.income - data.expenses - data.savings;
  const cards = [
    {
      label: "Ingresos",
      value: formatCurrency(data.income),
      color: COLORS.green,
    },
    {
      label: "Gastos",
      value: formatCurrency(data.expenses),
      color: COLORS.red,
    },
    {
      label: "Ahorros",
      value: formatCurrency(data.savings),
      color: [96, 165, 250], // #60a5fa — blue
    },
    {
      label: "Disponible",
      value: formatCurrency(available),
      color: available >= 0 ? COLORS.primary : COLORS.red,
    },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardWidth + 7);

    doc.setFillColor(...COLORS.surface);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 3, 3, "F");

    doc.setFillColor(...card.color);
    doc.rect(x, startY, cardWidth, 2, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(card.label, x + 4, startY + 11);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 4, startY + 22);
  });

  return startY + cardHeight + 10;
};

/**
 * Dibuja la tabla de transacciones.
 */
const drawTransactionsTable = (doc, transactions, startY) => {
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const tableRows = sortedTransactions.map((t) => [
    format(new Date(t.date), "dd/MM/yyyy"),
    t.type === "income" ? "INGRESO" : t.type === "savings" ? "AHORRO" : "GASTO",
    getCategoryLabel(t.category),
    t.description || "—",
    formatCurrency(t.amount),
  ]);

  doc.autoTable({
    head: [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]],
    body: tableRows,
    startY,
    theme: "plain",
    willDrawPage: (data) => {
      // Fondo oscuro en páginas adicionales (la primera ya lo tiene)
      if (data.pageNumber > 1) {
        drawPageBackground(doc);
      }
    },
    margin: { top: 15 },
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: COLORS.text,
      lineColor: [42, 42, 74],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: COLORS.surface,
      textColor: COLORS.textSecondary,
      fontStyle: "bold",
      fontSize: 7,
      halign: "left",
    },
    bodyStyles: {
      fillColor: false,
    },
    alternateRowStyles: {
      fillColor: [24, 24, 44],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 22 },
      4: { halign: "right", cellWidth: 30 },
    },
    didParseCell: (data) => {
      // Colorear tipo
      if (data.section === "body" && data.column.index === 1) {
        const value = data.cell.raw;
        data.cell.styles.textColor =
         value === "INGRESO" ? COLORS.green
         : value === "AHORRO" ? [96, 165, 250]
         : COLORS.red;
        data.cell.styles.fontStyle = "bold";
      }
      // Colorear monto
      if (data.section === "body" && data.column.index === 4) {
        const type = data.row.raw[1];
       data.cell.styles.textColor =
         type === "INGRESO" ? COLORS.green
         : type === "AHORRO" ? [96, 165, 250]
         : COLORS.red;
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  return doc.autoTable.previous.finalY;
};

/**
 * Dibuja la sección de cuotas pendientes de tarjeta de crédito.
 */
const drawCreditCardSummary = (doc, transactions, startY) => {
  const creditCardTransactions = transactions.filter(
    (t) => t.category === "tarjeta-credito" && t.installments > 0
  );

  if (creditCardTransactions.length === 0) return startY;

  const totalRemaining = creditCardTransactions.reduce((acc, t) => {
    const perInstallment =
      t.installments > 0 ? t.amount / t.installments : 0;
    const remaining = t.installmentsRemaining || 0;
    return acc + remaining * perInstallment;
  }, 0);

  const pageWidth = doc.internal.pageSize.getWidth();
  const y = startY + 8;

  // Fondo
  doc.setFillColor(...COLORS.surface);
  doc.roundedRect(14, y, pageWidth - 28, 20, 3, 3, "F");

  // Línea lateral
  doc.setFillColor(...COLORS.primary);
  doc.rect(14, y, 2, 20, "F");

  // Texto
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textSecondary);
  doc.text("Cuotas pendientes (Tarjetas de crédito)", 22, y + 8);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text(formatCurrency(totalRemaining), 22, y + 16);

  return y + 28;
};

/**
 * Dibuja el footer del PDF.
 */
const drawFooter = (doc) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...COLORS.dark);
  doc.rect(0, pageHeight - 15, pageWidth, 15, "F");

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.textSecondary);
  doc.text(
    "PAGATODO — Generado automáticamente",
    pageWidth / 2,
    pageHeight - 6,
    { align: "center" }
  );
};

/**
 * Genera y descarga el PDF del reporte mensual.
 */
export const generatePDF = (data, selectedMonth) => {
  const doc = new jsPDF();
  const fileName = generateFileName(selectedMonth);

  // Fondo primera página
  drawPageBackground(doc);

  // Secciones
  drawHeader(doc, selectedMonth);
  const afterSummary = drawSummaryCards(doc, data, 50);
  const afterTable = drawTransactionsTable(
    doc,
    data.transactions,
    afterSummary
  );
  drawCreditCardSummary(doc, data.transactions, afterTable);

  // Footer en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc);
  }

  doc.save(fileName);
};