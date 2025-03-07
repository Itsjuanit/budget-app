import React, { useEffect, useState, useRef } from "react";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { formatCurrency } from "../utils/format";
import { format } from "date-fns";
import { EditTransactionForm } from "./EditTransactionForm";
import { useTransactions } from "../context/TransactionsProvider";
import { generatePDF } from "../utils/pdfGenerator";
import { ConfirmDialog } from "./ConfirmDialog";

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

  const handleTransactionUpdate = (updatedTransaction) => {
    try {
      updateTransaction(updatedTransaction);
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción actualizada correctamente.",
        life: 3000,
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error actualizando transacción:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo actualizar la transacción.",
        life: 3000,
      });
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

    const sanitizedTransactions = transactions.filter((t) => t.date && !isNaN(new Date(t.date).getTime()));

    const formattedMonth = format(new Date(selectedMonth), "MMMM-yyyy");
    const fileName = `Reporte-${formattedMonth}.pdf`;

    const pdfContent = {
      transactions: sanitizedTransactions,
      month: formattedMonth,
      income: sanitizedTransactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc), 0),
      expenses: sanitizedTransactions.reduce((acc, t) => (t.type === "expense" ? acc + t.amount : acc), 0),
      savings:
        sanitizedTransactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc), 0) -
        sanitizedTransactions.reduce((acc, t) => (t.type === "expense" ? acc + t.amount : acc), 0),
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
        label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy"),
      };
    })
    .filter(Boolean);

  const totalIncome = transactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc), 0);
  const totalExpenses = transactions.reduce((acc, t) => (t.type === "expense" ? acc + t.amount : acc), 0);
  const percentageSpent = totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(2) : 0;

  return (
    <div className="p-6">
      <Toast ref={toast} />

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Total Ingresado</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Total Gastado</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">% Gastado</h3>
            <p className="text-2xl font-bold text-blue-600">{`${percentageSpent}%`}</p>
          </div>
        </Card>
      </div>

      <Card className="shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Detalles de transacciones</h3>
        <DataTable
          value={transactions}
          paginator
          rows={5}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sortField="date"
          sortOrder={-1}
          className="p-datatable-sm"
        >
          <Column field="date" header="Fecha" body={(rowData) => format(new Date(rowData.date), "dd/MM/yyyy")} sortable />
          <Column
            field="type"
            header="Tipo"
            body={(rowData) => (
              <span className={`font-bold ${rowData.type === "expense" ? "text-red-600" : "text-green-600"}`}>
                {rowData.type === "expense" ? "GASTO" : "INGRESO"}
              </span>
            )}
            sortable
          />
          <Column field="category" header="Categoría" sortable />
          <Column field="description" header="Descripción" sortable />
          <Column field="amount" header="Monto" body={(rowData) => formatCurrency(rowData.amount)} sortable />
          <Column
            body={(rowData) => (
              <div className="flex gap-2">
                <Button
                  label="Editar"
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text p-button-sm p-button-white-gradient-border"
                  onClick={() => handleEdit(rowData)}
                  disabled={!isCurrentMonth(selectedMonth)}
                />
                <Button
                  label="Eliminar"
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-sm p-button-white-gradient-border"
                  onClick={() => confirmDelete(rowData)}
                  disabled={!isCurrentMonth(selectedMonth)}
                />
              </div>
            )}
          />
        </DataTable>
      </Card>

      <Dialog
        header="Editar Transacción"
        visible={isModalOpen}
        style={{ width: "45vw" }}
        onHide={handleModalClose}
        breakpoints={{
          "960px": "75vw",
          "640px": "90vw",
        }}
      >
        {transactionToEdit && <EditTransactionForm transaction={transactionToEdit} onClose={handleModalClose} />}
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
