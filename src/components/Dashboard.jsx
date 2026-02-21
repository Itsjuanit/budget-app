import React, { useEffect, useState, useRef } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Paginator } from "primereact/paginator";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { formatCurrency } from "../utils/format";
import { Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { db } from "@/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories } from "../utils/categories";
import { EditTransactionForm } from "./EditTransactionForm";
import { format } from "date-fns";
import { ConfirmDialog } from "./ConfirmDialog";

export const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const toast = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    const currentMonthYear = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;

    if (user) {
      const userTransactionsRef = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        where("monthYear", "==", currentMonthYear)
      );

      const unsubscribe = onSnapshot(userTransactionsRef, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(data);
      });

      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const expenseTransactions = transactions.filter(
      (t) => t.type === "expense"
    );

    const expensesGroupedByCategory = categories.expense
      .map((category) => {
        const total = expenseTransactions
          .filter((t) => t.category === category.value)
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          category: category.label,
          amount: total,
          color: category.color,
        };
      })
      .filter((category) => category.amount > 0);

    setExpensesByCategory(expensesGroupedByCategory);

    const totalExpenses = expenseTransactions.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    setMonthlyExpenses(totalExpenses);

    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    setMonthlyIncome(totalIncome);
    setMonthlySavings(totalIncome - totalExpenses);
  }, [transactions]);

  // --- Chart config ---
  const chartData = {
    labels: expensesByCategory.map((item) => item.category),
    datasets: [
      {
        data: expensesByCategory.map((item) => item.amount),
        backgroundColor: expensesByCategory.map((item) => item.color),
        borderColor: "transparent",
        hoverBorderColor: "#ffffff33",
        hoverBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    cutout: "60%",
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#e2e8f0",
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
      tooltip: {
        backgroundColor: "#1e1e3a",
        titleColor: "#e2e8f0",
        bodyColor: "#e2e8f0",
        borderColor: "#2a2a4a",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return ` ${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
          },
        },
      },
    },
  };

  // --- Handlers ---
  const handleEdit = (transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const confirmDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setConfirmDialogVisible(true);
  };

  const handleDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteDoc(doc(db, "transactions", transactionToDelete.id));
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción eliminada correctamente",
        life: 3000,
      });
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Error eliminando transacción:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Hubo un problema al eliminar la transacción",
        life: 3000,
      });
    } finally {
      setConfirmDialogVisible(false);
    }
  };

  const onPageChange = (event) => {
    setFirst(event.first);
    setRows(event.rows);
  };

  // --- Helpers de render ---
  const savingsPercentage =
    monthlyIncome > 0 ? Math.round((1 - monthlyExpenses / monthlyIncome) * 100) : 0;

  const getCategoryLabel = (value) => {
    const allCategories = [...categories.income, ...categories.expense];
    return allCategories.find((c) => c.value === value)?.label || value;
  };

  // --- Summary cards config ---
  const summaryCards = [
    {
      icon: <Wallet className="w-8 h-8" />,
      label: "Gastos mensuales",
      value: formatCurrency(monthlyExpenses),
      color: "text-red-400",
      borderColor: "border-red-500/30",
      bgGlow: "bg-red-500/5",
    },
    {
      icon: <PiggyBank className="w-8 h-8" />,
      label: "Ahorro mensual",
      value: formatCurrency(monthlySavings),
      color: monthlySavings >= 0 ? "text-emerald-400" : "text-red-400",
      borderColor:
        monthlySavings >= 0 ? "border-emerald-500/30" : "border-red-500/30",
      bgGlow: monthlySavings >= 0 ? "bg-emerald-500/5" : "bg-red-500/5",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      label: "Porcentaje de ahorro",
      value: `${savingsPercentage}%`,
      color: savingsPercentage >= 0 ? "text-purple-400" : "text-red-400",
      borderColor: "border-purple-500/30",
      bgGlow: "bg-purple-500/5",
    },
  ];

  // --- Mobile cards ---
  const renderCards = () => {
    const currentTransactions = transactions.slice(first, first + rows);

    return (
      <div className="flex flex-col gap-3">
        {currentTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="text-white font-medium text-sm">
                  {transaction.description}
                </p>
                <p className="text-[#94a3b8] text-xs mt-1">
                  {format(new Date(transaction.date), "dd/MM/yyyy")} ·{" "}
                  {getCategoryLabel(transaction.category)}
                </p>
              </div>
              <span
                className={`text-sm font-bold ${
                  transaction.type === "income"
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {transaction.type === "income" ? "+" : "-"}
                {formatCurrency(transaction.amount)}
              </span>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                icon="pi pi-pencil"
                className="p-button-rounded p-button-text p-button-sm"
                tooltip="Editar"
                tooltipOptions={{ position: "top" }}
                onClick={() => handleEdit(transaction)}
              />
              <Button
                icon="pi pi-trash"
                className="p-button-rounded p-button-text p-button-sm"
                tooltip="Eliminar"
                tooltipOptions={{ position: "top" }}
                onClick={() => confirmDelete(transaction)}
                severity="danger"
              />
            </div>
          </div>
        ))}
        <Paginator
          first={first}
          rows={rows}
          totalRecords={transactions.length}
          rowsPerPageOptions={[5, 10, 20]}
          onPageChange={onPageChange}
          className="mt-2"
        />
      </div>
    );
  };

  // --- Desktop table ---
  const renderTable = () => (
    <DataTable
      value={transactions}
      paginator
      rows={10}
      rowsPerPageOptions={[5, 10, 25, 50]}
      className="p-datatable-sm"
      emptyMessage="No hay transacciones este mes."
      stripedRows
    >
      <Column
        field="date"
        header="Fecha"
        body={(row) => (
          <span className="text-[#cbd5e1] text-sm">
            {format(new Date(row.date), "dd/MM/yyyy")}
          </span>
        )}
        sortable
      />
      <Column
        field="description"
        header="Descripción"
        body={(row) => (
          <span className="text-white text-sm font-medium">
            {row.description}
          </span>
        )}
        sortable
      />
      <Column
        field="category"
        header="Categoría"
        body={(row) => (
          <span className="text-[#94a3b8] text-sm">
            {getCategoryLabel(row.category)}
          </span>
        )}
        sortable
      />
      <Column
        field="type"
        header="Tipo"
        body={(row) => (
          <Tag
            value={row.type === "income" ? "Ingreso" : "Gasto"}
            severity={row.type === "income" ? "success" : "danger"}
            className="text-xs"
          />
        )}
        sortable
      />
      <Column
        field="amount"
        header="Monto"
        body={(row) => (
          <span
            className={`text-sm font-bold ${
              row.type === "income" ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {row.type === "income" ? "+" : "-"}
            {formatCurrency(row.amount)}
          </span>
        )}
        sortable
      />
      <Column
        header="Acciones"
        body={(row) => (
          <div className="flex gap-1">
            <Button
              icon="pi pi-pencil"
              className="p-button-rounded p-button-text p-button-sm"
              tooltip="Editar"
              tooltipOptions={{ position: "top" }}
              onClick={() => handleEdit(row)}
            />
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-text p-button-sm"
              tooltip="Eliminar"
              tooltipOptions={{ position: "top" }}
              onClick={() => confirmDelete(row)}
              severity="danger"
            />
          </div>
        )}
      />
    </DataTable>
  );

  // --- Render principal ---
  return (
    <div>
      <Toast ref={toast} />
      <h1 className="text-2xl font-bold mb-6 text-white">
        Análisis del gasto
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card, index) => (
          <div
            key={index}
            className={`rounded-xl border ${card.borderColor} ${card.bgGlow} p-5`}
          >
            <div className="flex items-center gap-4">
              <div className={`${card.color} opacity-80`}>{card.icon}</div>
              <div>
                <p className="text-[#94a3b8] text-sm">{card.label}</p>
                <p className={`text-2xl font-bold ${card.color} mt-1`}>
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Gastos por categoría
          </h3>
          {expensesByCategory.length > 0 ? (
            <Chart
              type="doughnut"
              data={chartData}
              options={chartOptions}
              className="w-full"
            />
          ) : (
            <p className="text-[#94a3b8] text-sm text-center py-8">
              No hay gastos registrados este mes.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Transacciones recientes
          </h3>
          {transactions.length > 0 ? (
            isMobile ? (
              renderCards()
            ) : (
              renderTable()
            )
          ) : (
            <p className="text-[#94a3b8] text-sm text-center py-8">
              No hay transacciones este mes.
            </p>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        header="Editar Transacción"
        visible={isModalOpen}
        style={{ width: "45vw" }}
        onHide={() => setIsModalOpen(false)}
        breakpoints={{ "960px": "75vw", "640px": "90vw" }}
      >
        {transactionToEdit && (
          <EditTransactionForm
            transaction={transactionToEdit}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        visible={confirmDialogVisible}
        onHide={() => setConfirmDialogVisible(false)}
        onConfirm={handleDelete}
        message={`¿Estás seguro de que deseas eliminar la transacción "${transactionToDelete?.description}"?`}
      />
    </div>
  );
};