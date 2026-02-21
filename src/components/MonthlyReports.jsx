import React, { useEffect, useState, useRef } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import { formatCurrency } from "../utils/format";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import { EditTransactionForm } from "./EditTransactionForm";
import { useTransactions } from "../context/TransactionsProvider";
import { generatePDF } from "../utils/pdfGenerator";
import { ConfirmDialog } from "./ConfirmDialog";
import { categories } from "../utils/categories";
import {
  Wallet,
  TrendingDown,
  PercentCircle,
} from "lucide-react";

export const MonthlyReports = () => {
  const {
    transactions = [],
    availableMonths = [],
    selectedMonth,
    setSelectedMonth,
    loadTransactionsForMonth,
    updateTransaction,
    deleteTransaction,
  } = useTransactions();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const toast = useRef(null);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  useEffect(() => {
    if (selectedMonth) {
      loadTransactionsForMonth(selectedMonth);
    }
  }, [selectedMonth, loadTransactionsForMonth]);

  const isCurrentMonth = (monthYear) => {
    const currentDate = new Date();
    const [year, month] = monthYear.split("-").map(Number);
    return currentDate.getFullYear() === year && currentDate.getMonth() + 1 === month;
  };

  const handleEdit = (transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const confirmDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setConfirmDialogVisible(true);
  };

  const handleDeleteConfirmed = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteTransaction(transactionToDelete.id);
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción eliminada correctamente.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error eliminando transacción:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar la transacción.",
        life: 3000,
      });
    } finally {
      setTransactionToDelete(null);
      setConfirmDialogVisible(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!transactions.length || !selectedMonth) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No hay datos para generar el reporte.",
        life: 3000,
      });
      return;
    }

    const sanitizedTransactions = transactions.filter(
      (t) => t.date && !isNaN(new Date(t.date).getTime())
    );

    const formattedMonth = format(new Date(selectedMonth), "MMMM-yyyy");

    const pdfContent = {
      transactions: sanitizedTransactions,
      month: formattedMonth,
      income: sanitizedTransactions.reduce(
        (acc, t) => (t.type === "income" ? acc + t.amount : acc),
        0
      ),
      expenses: sanitizedTransactions.reduce(
        (acc, t) => (t.type === "expense" ? acc + t.amount : acc),
        0
      ),
      savings:
        sanitizedTransactions.reduce(
          (acc, t) => (t.type === "income" ? acc + t.amount : acc),
          0
        ) -
        sanitizedTransactions.reduce(
          (acc, t) => (t.type === "expense" ? acc + t.amount : acc),
          0
        ),
    };

    try {
      generatePDF(pdfContent, selectedMonth, "UsuarioID");
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Reporte descargado correctamente.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error generando el PDF:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo generar el reporte.",
        life: 3000,
      });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTransactionToEdit(null);
  };

  const monthOptions = availableMonths
    .map((monthYear) => {
      if (!monthYear) return null;
      const [year, month] = monthYear.split("-");
      return {
        value: monthYear,
         label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy", { locale: es }),
      };
    })
    .filter(Boolean);

  const totalIncome = transactions.reduce(
    (acc, t) => (t.type === "income" ? acc + t.amount : acc),
    0
  );
  const totalExpenses = transactions.reduce(
    (acc, t) => (t.type === "expense" ? acc + t.amount : acc),
    0
  );
  const percentageSpent =
    totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0;

  const getCategoryLabel = (value) => {
    const allCategories = [...categories.income, ...categories.expense];
    return allCategories.find((c) => c.value === value)?.label || value;
  };

  const summaryCards = [
    {
      icon: <Wallet className="w-8 h-8" />,
      label: "Total ingresado",
      value: formatCurrency(totalIncome),
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      bgGlow: "bg-emerald-500/5",
    },
    {
      icon: <TrendingDown className="w-8 h-8" />,
      label: "Total gastado",
      value: formatCurrency(totalExpenses),
      color: "text-red-400",
      borderColor: "border-red-500/30",
      bgGlow: "bg-red-500/5",
    },
    {
      icon: <PercentCircle className="w-8 h-8" />,
      label: "% Gastado",
      value: `${percentageSpent}%`,
      color: "text-purple-400",
      borderColor: "border-purple-500/30",
      bgGlow: "bg-purple-500/5",
    },
  ];

  return (
    <div>
      <Toast ref={toast} />

      <h1 className="text-2xl font-bold mb-6 text-white">Reporte mensual</h1>

      {/* Selector de mes + botón PDF */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <Dropdown
          value={selectedMonth}
          options={monthOptions}
          onChange={(e) => setSelectedMonth(e.value)}
          placeholder="Seleccionar un mes"
          className="w-full sm:w-auto"
        />
        <Button
          label="Descargar PDF"
          icon="pi pi-file-pdf"
          className="p-button-sm p-button-outlined"
          severity="danger"
          onClick={handleDownloadPDF}
          disabled={!transactions.length || !selectedMonth}
        />
      </div>

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

      {/* Tabla de transacciones */}
      <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
        <h3 className="text-lg font-semibold mb-4 text-white">
          Detalle de transacciones
        </h3>

        {transactions.length > 0 ? (
          <DataTable
            value={transactions}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sortField="date"
            sortOrder={-1}
            className="p-datatable-sm"
            emptyMessage="No hay transacciones para este mes."
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
                    disabled={!isCurrentMonth(selectedMonth)}
                  />
                  <Button
                    icon="pi pi-trash"
                    className="p-button-rounded p-button-text p-button-sm"
                    tooltip="Eliminar"
                    tooltipOptions={{ position: "top" }}
                    onClick={() => confirmDelete(row)}
                    disabled={!isCurrentMonth(selectedMonth)}
                    severity="danger"
                  />
                </div>
              )}
            />
          </DataTable>
        ) : (
          <p className="text-[#94a3b8] text-sm text-center py-8">
            {selectedMonth
              ? "No hay transacciones para este mes."
              : "Seleccioná un mes para ver las transacciones."}
          </p>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog
        header="Editar Transacción"
        visible={isModalOpen}
        style={{ width: "45vw" }}
        onHide={handleModalClose}
        breakpoints={{ "960px": "75vw", "640px": "90vw" }}
      >
        {transactionToEdit && (
          <EditTransactionForm
            transaction={transactionToEdit}
            onClose={handleModalClose}
          />
        )}
      </Dialog>

      <ConfirmDialog
        visible={confirmDialogVisible}
        onHide={() => setConfirmDialogVisible(false)}
        onConfirm={handleDeleteConfirmed}
        message={`¿Estás seguro de que deseas eliminar la transacción "${transactionToDelete?.description}"?`}
      />
    </div>
  );
};