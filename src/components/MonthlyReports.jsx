import React, { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { formatCurrency } from "../utils/format";
import { format } from "date-fns";
import { EditTransactionForm } from "./EditTransactionForm";
import { useTransactions } from "../context/TransactionsProvider"; // Importa el contexto

export const MonthlyReports = () => {
  const {
    transactions = [], // Asegurar que sea un array
    availableMonths = [], // Asegurar que sea un array
    selectedMonth,
    setSelectedMonth,
    loadTransactionsForMonth,
    updateTransaction,
    deleteTransaction,
  } = useTransactions(); // Usa el contexto para manejar el estado

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  useEffect(() => {
    if (selectedMonth) {
      loadTransactionsForMonth(selectedMonth); // Cargar transacciones para el mes seleccionado
    }
  }, [selectedMonth, loadTransactionsForMonth]);

  const handleEdit = (transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id); // Usa el contexto para eliminar
    } catch (error) {
      console.error("Error eliminando transacción:", error);
    }
  };

  const handleTransactionUpdate = (updatedTransaction) => {
    updateTransaction(updatedTransaction); // Actualiza la transacción en el contexto
    setIsModalOpen(false);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTransactionToEdit(null);
  };

  const handleDownloadPDF = () => {
    if (!transactions.length || !selectedMonth) return;

    const formattedMonth = format(new Date(selectedMonth), "MMMM-yyyy");
    const fileName = `Reporte-${formattedMonth}.pdf`;

    const pdfContent = {
      transactions,
      month: formattedMonth,
    };

    generatePDF(pdfContent, fileName);
  };

  const monthOptions = availableMonths
    .map((monthYear) => {
      if (!monthYear) return null; // Verifica valores inválidos
      const [year, month] = monthYear.split("-");
      return {
        value: monthYear,
        label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy"),
      };
    })
    .filter(Boolean); // Elimina valores nulos o indefinidos

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Ingresos Totales</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(transactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc), 0))}
            </p>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Gastos Totales</h3>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(transactions.reduce((acc, t) => (t.type === "expense" ? acc + t.amount : acc), 0))}
            </p>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Ahorros Netos</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                transactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc), 0) -
                  transactions.reduce((acc, t) => (t.type === "expense" ? acc + t.amount : acc), 0)
              )}
            </p>
          </div>
        </Card>
      </div>

      <Card className="shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Detalles de transacciones</h3>
        <DataTable value={transactions} paginator rows={5} sortField="date" sortOrder={-1} className="p-datatable-sm">
          <Column field="date" header="Fecha" body={(rowData) => format(new Date(rowData.date), "dd/MM/yyyy")} sortable />
          <Column field="type" header="Tipo" body={(rowData) => rowData.type.toUpperCase()} sortable />
          <Column field="category" header="Categoría" sortable />
          <Column field="description" header="Descripción" sortable />
          <Column field="amount" header="Monto" body={(rowData) => formatCurrency(rowData.amount)} sortable />
          <Column
            body={(rowData) => (
              <div className="flex gap-2">
                <Button
                  label="Editar"
                  icon="pi pi-pencil"
                  className="p-button-rounded p-button-text p-button-sm"
                  onClick={() => handleEdit(rowData)}
                />
                <Button
                  label="Borrar"
                  icon="pi pi-trash"
                  className="p-button-rounded p-button-text p-button-sm"
                  onClick={() => handleDelete(rowData.id)}
                />
              </div>
            )}
          />
        </DataTable>
      </Card>

      <Dialog
        header="Editar Transacción"
        visible={isModalOpen}
        style={{ width: "40vw" }}
        onHide={handleModalClose}
        breakpoints={{
          "960px": "75vw",
          "640px": "90vw",
        }}
      >
        {transactionToEdit && <EditTransactionForm transaction={transactionToEdit} onClose={handleModalClose} />}
      </Dialog>
    </div>
  );
};
