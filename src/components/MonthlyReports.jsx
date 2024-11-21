import React, { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { formatCurrency } from "../utils/format";
import { format } from "date-fns";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { getAuth } from "firebase/auth";

export const MonthlyReports = () => {
  const [transactions, setTransactions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    transactions: [],
  });

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const userTransactionsRef = query(collection(db, "transactions"), where("userId", "==", user.uid));

      const unsubscribe = onSnapshot(userTransactionsRef, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: new Date(doc.data().date),
        }));
        setTransactions(data);
      });

      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const currentMonthTransactions = transactions.filter((t) => format(t.date, "yyyy-MM") === format(selectedMonth, "yyyy-MM"));

    const income = currentMonthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    setMonthlyData({
      income,
      expenses,
      savings: income - expenses,
      transactions: currentMonthTransactions,
    });
  }, [selectedMonth, transactions]);

  const availableMonths = [...new Set(transactions.map((t) => format(t.date, "yyyy-MM")))].sort().reverse();

  const monthOptions = availableMonths.map((date) => {
    const [year, month] = date.split("-");
    return {
      label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy"),
      value: date,
    };
  });

  const chartData = {
    labels: ["Ingresos", "Gastos", "Ahorros"],
    datasets: [
      {
        data: [monthlyData.income, monthlyData.expenses, monthlyData.savings],
        backgroundColor: ["#22c55e", "#ef4444", "#3b82f6"],
      },
    ],
  };

  const amountTemplate = (rowData) => formatCurrency(rowData.amount);
  const dateTemplate = (rowData) => format(new Date(rowData.date), "dd/MM/yyyy");
  const typeTemplate = (rowData) => {
    const colorClass = rowData.type === "income" ? "text-green-600" : "text-red-600";
    return <span className={colorClass}>{rowData.type.toUpperCase()}</span>;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Fecha", "Tipo", "Categoría", "Descripción", "Monto"];
    const tableRows = [];

    monthlyData.transactions.forEach((transaction) => {
      const transactionData = [
        format(new Date(transaction.date), "dd/MM/yyyy"),
        transaction.type.toUpperCase(),
        transaction.category,
        transaction.description || "N/A",
        formatCurrency(transaction.amount),
      ];
      tableRows.push(transactionData);
    });

    doc.text(`Reporte Mensual - ${format(selectedMonth, "MMMM yyyy")}`, 14, 15);
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });

    doc.text(`Ingresos Totales: ${formatCurrency(monthlyData.income)}`, 14, doc.autoTable.previous.finalY + 10);
    doc.text(`Gastos Totales: ${formatCurrency(monthlyData.expenses)}`, 14, doc.autoTable.previous.finalY + 20);
    doc.text(`Ahorros Netos: ${formatCurrency(monthlyData.savings)}`, 14, doc.autoTable.previous.finalY + 30);

    doc.save(`Reporte-${format(selectedMonth, "MMMM-yyyy")}.pdf`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Reporte mensual</h1>

      <div className="mb-6">
        <Dropdown
          value={format(selectedMonth, "yyyy-MM")}
          options={monthOptions}
          onChange={(e) => setSelectedMonth(new Date(e.value))}
          placeholder="Seleccionar un mes"
          className="w-full md:w-auto"
        />
      </div>

      <Button label="Descargar Reporte PDF" icon="pi pi-file-pdf" className="p-button-danger mb-4" onClick={handleDownloadPDF} />

      <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-600">Ingresos totales</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyData.income)}</p>
            </div>
          </Card>

          <Card className="shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-600">Gastos totales</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyData.expenses)}</p>
            </div>
          </Card>

          <Card className="shadow-lg">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-600">Ahorros netos</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyData.savings)}</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Resumen mensual</h3>
            <Chart type="doughnut" data={chartData} style={{ height: "300px" }} />
          </Card>

          <Card className="shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Estadísticas mensuales</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Tasa de ahorro:</span>
                <span className="font-bold">{monthlyData.income ? Math.round((monthlyData.savings / monthlyData.income) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span>Número de transacciones:</span>
                <span className="font-bold">{monthlyData.transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Transacción promedio:</span>
                <span className="font-bold">
                  {formatCurrency(
                    monthlyData.transactions.length
                      ? monthlyData.expenses / monthlyData.transactions.filter((t) => t.type === "expense").length
                      : 0
                  )}
                </span>
              </div>
            </div>
          </Card>
        </div>

        <Card className="shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Detalles de transacciones</h3>
          <DataTable value={monthlyData.transactions} paginator rows={5} sortField="date" sortOrder={-1} className="p-datatable-sm">
            <Column field="date" header="Fecha" body={dateTemplate} sortable />
            <Column field="type" header="Tipo" body={typeTemplate} sortable />
            <Column field="category" header="Categoría" sortable />
            <Column field="description" header="Descripción" sortable />
            <Column field="amount" header="Monto" body={amountTemplate} sortable />
          </DataTable>
        </Card>
      </div>
    </div>
  );
};
