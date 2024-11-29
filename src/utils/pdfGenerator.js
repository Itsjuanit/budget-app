import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { formatCurrency } from "./format";

// Mapeo de meses en español abreviados
const monthMap = {
  0: "ENE",
  1: "FEB",
  2: "MAR",
  3: "ABR",
  4: "MAY",
  5: "JUN",
  6: "JUL",
  7: "AGO",
  8: "SEP",
  9: "OCT",
  10: "NOV",
  11: "DIC",
};

// Función para generar el nombre del archivo
const generatePDFFileName = (selectedMonth, userId) => {
  const [year, month] = selectedMonth.split("-"); // Separar año y mes del formato "YYYY-MM"
  const monthAbbreviation = monthMap[parseInt(month, 10) - 1]; // Convertir mes a índice y obtener la abreviatura
  const timestamp = new Date().getTime(); // Identificador único basado en tiempo

  return `PAGATODO-${monthAbbreviation}-${year}-${userId}-${timestamp}.pdf`;
};

export const generatePDF = (data, selectedMonth, userId) => {
  const fileName = generatePDFFileName(selectedMonth, userId);
  const doc = new jsPDF();

  // Crear título
  doc.text(`Reporte Mensual - ${format(selectedMonth, "MMMM yyyy")}`, 14, 15);

  // Ordenar las transacciones por fecha (más antigua a más nueva)
  const sortedTransactions = [...data.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Crear tabla de transacciones
  const tableColumn = ["Fecha", "Tipo", "Categoría", "Descripción", "Monto"];
  const tableRows = sortedTransactions.map((transaction) => [
    // Formatear la fecha a "dd/MM/yyyy"
    format(new Date(transaction.date), "dd/MM/yyyy"),

    // Traducir "income" a "INGRESO" y "expense" a "EGRESO"
    transaction.type === "income" ? "INGRESO" : "EGRESO",

    // Mostrar categoría o "N/A" si está vacía
    transaction.category || "N/A",

    // Mostrar descripción o "N/A" si está vacía
    transaction.description || "N/A",

    // Formatear el monto como moneda
    formatCurrency(transaction.amount),
  ]);

  // Agregar la tabla al PDF
  doc.autoTable({
    head: [tableColumn], // Encabezados de la tabla
    body: tableRows, // Filas procesadas
    startY: 20, // Posición inicial debajo del título
  });

  // Obtener la posición final de la tabla para agregar estadísticas
  const finalY = doc.autoTable.previous.finalY;

  // Agregar estadísticas generales al PDF
  doc.text(`Ingresos Totales: ${formatCurrency(data.income)}`, 14, finalY + 10);
  doc.text(`Gastos Totales: ${formatCurrency(data.expenses)}`, 14, finalY + 20);
  doc.text(`Ahorros Netos: ${formatCurrency(data.savings)}`, 14, finalY + 30);

  // Descargar el archivo PDF con el nombre generado
  doc.save(fileName);
};
