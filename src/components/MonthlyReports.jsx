import React, { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { formatCurrency } from "../utils/format";
import { format, parseISO } from "date-fns";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth } from "firebase/auth";
import { generatePDF } from "../utils/pdfGenerator";

export const MonthlyReports = () => {
  const [transactions, setTransactions] = useState([]); // Transacciones del mes seleccionado
  const [availableMonths, setAvailableMonths] = useState([]); // Meses con información
  const [selectedMonth, setSelectedMonth] = useState(null); // Mes seleccionado
  const [monthlyData, setMonthlyData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    transactions: [],
  });

  // Cargar los meses disponibles con información
  useEffect(() => {
    const loadAvailableMonths = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) return;

      const transactionsRef = query(collection(db, "transactions"), where("userId", "==", user.uid), orderBy("monthYear"));

      const snapshot = await getDocs(transactionsRef);

      const uniqueMonths = new Set();
      snapshot.docs.forEach((doc) => {
        uniqueMonths.add(doc.data().monthYear);
      });

      const monthsArray = Array.from(uniqueMonths).sort();
      console.log("Available months:", monthsArray); // Depuración

      setAvailableMonths(monthsArray);

      if (monthsArray.length > 0) {
        setSelectedMonth(monthsArray[monthsArray.length - 1]); // Selecciona el mes más reciente
      }
    };

    loadAvailableMonths();
  }, []);

  // Cargar las transacciones del mes seleccionado
  useEffect(() => {
    const loadTransactionsForMonth = async () => {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user || !selectedMonth) return;

      const transactionsRef = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        where("monthYear", "==", selectedMonth)
      );

      const snapshot = await getDocs(transactionsRef);

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: parseISO(doc.data().date),
      }));

      setTransactions(data);

      // Calcular ingresos, gastos y ahorros
      const income = data.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const expenses = data.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

      setMonthlyData({
        income,
        expenses,
        savings: income - expenses,
        transactions: data,
      });
    };

    loadTransactionsForMonth();
  }, [selectedMonth]);

  // Opciones de meses para el Dropdown
  const monthOptions = availableMonths.map((monthYear) => {
    const [year, month] = monthYear.split("-");
    return {
      value: monthYear,
      label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy"),
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
  const dateTemplate = (rowData) => format(rowData.date, "dd/MM/yyyy");
  const typeTemplate = (rowData) => {
    const colorClass = rowData.type === "income" ? "text-green-600" : "text-red-600";
    return <span className={colorClass}>{rowData.type.toUpperCase()}</span>;
  };

  const generatePDFName = (userId) => {
    const formattedMonth = format(new Date(selectedMonth), "MMMM-yyyy");
    return `PAGATODO-${formattedMonth}-${userId}.pdf`;
  };

  const handleDownloadPDF = () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const fileName = generatePDFName(user.uid);
      generatePDF(monthlyData, selectedMonth, fileName);
    } else {
      console.error("Usuario no autenticado");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Reporte mensual</h1>

      <div className="mb-6">
        <Dropdown
          value={selectedMonth}
          options={monthOptions}
          onChange={(e) => setSelectedMonth(e.value)}
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
