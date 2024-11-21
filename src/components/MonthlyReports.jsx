import React, { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { useFinanceStore } from "../store/useFinanceStore";
import { formatCurrency } from "../utils/format";
import { format } from "date-fns";
import { db } from "@/firebaseConfig";
import { collection, onSnapshot } from "firebase/firestore";

export const MonthlyReports = () => {
  const [transactions, setTransactions] = useState([]); // Estado local para las transacciones desde Firestore
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    transactions: [],
  });

  // Escucha cambios en Firestore para obtener todas las transacciones
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "transactions"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setTransactions(data); // Actualiza el estado local con los datos de Firestore
    });

    return () => unsubscribe(); // Detén la suscripción al desmontar el componente
  }, []);

  // Genera las opciones de mes disponibles
  const availableMonths = [...new Set(transactions.map((t) => format(new Date(t.date), "yyyy-MM")))].sort().reverse();

  const monthOptions = availableMonths.map((date) => {
    const [year, month] = date.split("-");
    return {
      label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy"),
      value: date,
    };
  });

  // Calcula los datos del mes seleccionado
  useEffect(() => {
    const currentMonthTransactions = transactions.filter((t) =>
      format(new Date(t.date), "yyyy-MM").startsWith(format(selectedMonth, "yyyy-MM"))
    );

    const income = currentMonthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);

    const expenses = currentMonthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    setMonthlyData({
      income,
      expenses,
      savings: income - expenses,
      transactions: currentMonthTransactions,
    });
  }, [selectedMonth, transactions]);

  const chartData = {
    labels: ["Income", "Expenses", "Savings"],
    datasets: [
      {
        data: [monthlyData.income, monthlyData.expenses, monthlyData.savings],
        backgroundColor: ["#22c55e", "#ef4444", "#3b82f6"],
      },
    ],
  };

  const amountTemplate = (rowData) => {
    return formatCurrency(rowData.amount);
  };

  const dateTemplate = (rowData) => {
    return format(new Date(rowData.date), "dd/MM/yyyy");
  };

  const typeTemplate = (rowData) => {
    const colorClass = rowData.type === "income" ? "text-green-600" : "text-red-600";
    return <span className={colorClass}>{rowData.type.toUpperCase()}</span>;
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
          <h3 className="text-xl font-semibold mb-4">Estadisticas mensuales</h3>
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
          <Column field="date" header="Date" body={dateTemplate} sortable />
          <Column field="type" header="Type" body={typeTemplate} sortable />
          <Column field="category" header="Category" sortable />
          <Column field="description" header="Description" sortable />
          <Column field="amount" header="Amount" body={amountTemplate} sortable />
        </DataTable>
      </Card>
    </div>
  );
};
