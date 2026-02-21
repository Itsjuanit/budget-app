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
import { ProgressBar } from "primereact/progressbar";
import { formatCurrency } from "../utils/format";
import { Wallet, TrendingUp, PiggyBank, Landmark } from "lucide-react";
import { db } from "@/firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  deleteDoc,
  onSnapshot as onSnapshotSingle,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories } from "../utils/categories";
import { EditTransactionForm } from "./EditTransactionForm";
import { format } from "date-fns";
import { ConfirmDialog } from "./ConfirmDialog";
import { BudgetProgress } from "./BudgetProgress";

export const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlySavingsDeposits, setMonthlySavingsDeposits] = useState(0);
  const [monthlyAvailable, setMonthlyAvailable] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [savingsByCategory, setSavingsByCategory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [budgets, setBudgets] = useState({});
  const [alertsShown, setAlertsShown] = useState(false);

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
    // Gastos
    const expenseTransactions = transactions.filter((t) => t.type === "expense");
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    setMonthlyExpenses(totalExpenses);

    const expensesGroupedByCategory = categories.expense
      .map((category) => {
        const total = expenseTransactions
          .filter((t) => t.category === category.value)
          .reduce((sum, t) => sum + t.amount, 0);
        return { category: category.label, amount: total, color: category.color };
      })
      .filter((c) => c.amount > 0);
    setExpensesByCategory(expensesGroupedByCategory);

    // Ingresos
    const totalIncome = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    setMonthlyIncome(totalIncome);

    // Ahorros depositados
    const savingsTransactions = transactions.filter((t) => t.type === "savings");
    const totalSavings = savingsTransactions.reduce((sum, t) => sum + t.amount, 0);
    setMonthlySavingsDeposits(totalSavings);

    const savingsGrouped = categories.savings
      .map((category) => {
        const total = savingsTransactions
          .filter((t) => t.category === category.value)
          .reduce((sum, t) => sum + t.amount, 0);
        return { category: category.label, amount: total, color: category.color };
      })
      .filter((c) => c.amount > 0);
    setSavingsByCategory(savingsGrouped);

    // Disponible = ingresos - gastos - ahorros
    setMonthlyAvailable(totalIncome - totalExpenses - totalSavings);
  }, [transactions]);

  // Cargar presupuestos en tiempo real
  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const budgetRef = doc(db, "budgets", user.uid);
    const unsubscribe = onSnapshot(budgetRef, (docSnap) => {
      if (docSnap.exists()) {
        setBudgets(docSnap.data().categories || {});
      }
    });

    return () => unsubscribe();
  }, []);
  
  // Alertas de presupuesto
  useEffect(() => {
    if (alertsShown || !toast.current || Object.keys(budgets).length === 0) return;
    if (transactions.length === 0) return;

    const expensesByCat = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expensesByCat[t.category] = (expensesByCat[t.category] || 0) + t.amount;
      });

    const alerts = [];

    Object.entries(budgets).forEach(([categoryValue, limit]) => {
      if (limit <= 0) return;
      const spent = expensesByCat[categoryValue] || 0;
      const percentage = (spent / limit) * 100;
      const label = getCategoryLabel(categoryValue);

      if (percentage >= 100) {
        alerts.push({
          severity: "error",
          summary: "¡Presupuesto excedido!",
          detail: `${label}: ${formatCurrency(spent)} de ${formatCurrency(limit)} (${Math.round(percentage)}%)`,
          life: 8000,
        });
      } else if (percentage >= 80) {
        alerts.push({
          severity: "warn",
          summary: "Presupuesto al límite",
          detail: `${label}: ${formatCurrency(spent)} de ${formatCurrency(limit)} (${Math.round(percentage)}%)`,
          life: 6000,
        });
      }
    });

    if (alerts.length > 0) {
      // Ordenar: excedidos primero, luego warnings
      alerts.sort((a, b) => (a.severity === "error" ? -1 : 1));

      alerts.forEach((alert, index) => {
        setTimeout(() => {
          toast.current?.show(alert);
        }, index * 400);
      });
      setAlertsShown(true);
    }
  }, [transactions, budgets, alertsShown]);

  // --- Chart config (solo gastos) ---
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

  // --- Helpers ---
  const savingsPercentage =
    monthlyIncome > 0
      ? Math.round((monthlySavingsDeposits / monthlyIncome) * 100)
      : 0;

  const getCategoryLabel = (value) => {
    const allCategories = [
      ...categories.income,
      ...categories.savings,
      ...categories.expense,
    ];
    return allCategories.find((c) => c.value === value)?.label || value;
  };

  const getTypeConfig = (type) => {
    const config = {
      income: { label: "Ingreso", severity: "success", sign: "+" },
      savings: { label: "Ahorro", severity: "info", sign: "" },
      expense: { label: "Gasto", severity: "danger", sign: "-" },
    };
    return config[type] || config.expense;
  };

  // --- Summary cards ---
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
      label: "Ahorro depositado",
      value: formatCurrency(monthlySavingsDeposits),
      color: "text-blue-400",
      borderColor: "border-blue-500/30",
      bgGlow: "bg-blue-500/5",
    },
    {
      icon: <Landmark className="w-8 h-8" />,
      label: "Disponible",
      value: formatCurrency(monthlyAvailable),
      color: monthlyAvailable >= 0 ? "text-emerald-400" : "text-red-400",
      borderColor:
        monthlyAvailable >= 0
          ? "border-emerald-500/30"
          : "border-red-500/30",
      bgGlow:
        monthlyAvailable >= 0 ? "bg-emerald-500/5" : "bg-red-500/5",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      label: "% destinado a ahorro",
      value: `${savingsPercentage}%`,
      color: "text-purple-400",
      borderColor: "border-purple-500/30",
      bgGlow: "bg-purple-500/5",
    },
  ];

  // --- Mobile cards ---
  const renderCards = () => {
    const currentTransactions = transactions.slice(first, first + rows);

    return (
      <div className="flex flex-col gap-3">
        {currentTransactions.map((transaction) => {
          const typeConfig = getTypeConfig(transaction.type);
          return (
            <div
              key={transaction.id}
              className="rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] p-4"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium text-sm">
                      {transaction.description}
                    </p>
                    <Tag
                      value={typeConfig.label}
                      severity={typeConfig.severity}
                      className="text-xs"
                    />
                  </div>
                  <p className="text-[#94a3b8] text-xs">
                    {format(new Date(transaction.date), "dd/MM/yyyy")} ·{" "}
                    {getCategoryLabel(transaction.category)}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    transaction.type === "income"
                      ? "text-emerald-400"
                      : transaction.type === "savings"
                      ? "text-blue-400"
                      : "text-red-400"
                  }`}
                >
                  {typeConfig.sign}
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
          );
        })}
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
        body={(row) => {
          const typeConfig = getTypeConfig(row.type);
          return (
            <Tag
              value={typeConfig.label}
              severity={typeConfig.severity}
              className="text-xs"
            />
          );
        }}
        sortable
      />
      <Column
        field="amount"
        header="Monto"
        body={(row) => {
          const typeConfig = getTypeConfig(row.type);
          return (
            <span
              className={`text-sm font-bold ${
                row.type === "income"
                  ? "text-emerald-400"
                  : row.type === "savings"
                  ? "text-blue-400"
                  : "text-red-400"
              }`}
            >
              {typeConfig.sign}
              {formatCurrency(row.amount)}
            </span>
          );
        }}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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

      <BudgetProgress transactions={transactions} />
      
      {/* Sección de ahorro */}
      {monthlySavingsDeposits > 0 && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-white">
            Detalle de ahorro
          </h3>

          {/* Barra de progreso */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[#94a3b8]">
                {savingsPercentage}% del ingreso destinado a ahorro
              </span>
              <span className="text-blue-400 font-medium">
                {formatCurrency(monthlySavingsDeposits)} / {formatCurrency(monthlyIncome)}
              </span>
            </div>
            <ProgressBar
              value={Math.min(savingsPercentage, 100)}
              showValue={false}
              style={{ height: "8px" }}
              color="#60a5fa"
            />
          </div>

          {/* Desglose por categoría de ahorro */}
          {savingsByCategory.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {savingsByCategory.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] px-4 py-3"
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-xs text-[#94a3b8]">{item.category}</p>
                    <p className="text-sm font-bold text-blue-400">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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