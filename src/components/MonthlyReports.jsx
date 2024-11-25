import React, { useState, useEffect } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { formatCurrency } from "../utils/format";
import { format, parseISO } from "date-fns";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth } from "firebase/auth";
import { generatePDF } from "../utils/pdfGenerator";
import { EditTransactionForm } from "./EditTransactionForm";

export const MonthlyReports = () => {
  const [transactions, setTransactions] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [monthlyData, setMonthlyData] = useState({
    income: 0,
    expenses: 0,
    savings: 0,
    transactions: [],
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

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
      setAvailableMonths(monthsArray);

      if (monthsArray.length > 0) {
        setSelectedMonth(monthsArray[monthsArray.length - 1]); // Selecciona el mes más reciente
      }
    };

    loadAvailableMonths();
  }, []);

  // Cargar las transacciones del mes seleccionado
  useEffect(() => {
    if (!selectedMonth) return;
    loadTransactionsForMonth();
  }, [selectedMonth]);

  const loadTransactionsForMonth = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user || !selectedMonth) return;

    const transactionsRef = query(collection(db, "transactions"), where("userId", "==", user.uid), where("monthYear", "==", selectedMonth));

    const snapshot = await getDocs(transactionsRef);

    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      date: parseISO(doc.data().date),
    }));

    setTransactions(data);
    updateMonthlyData(data);
  };

  const updateMonthlyData = (data) => {
    const income = data.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = data.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);

    setMonthlyData({
      income,
      expenses,
      savings: income - expenses,
      transactions: data,
    });
  };

  const handleEdit = (transaction) => {
    setTransactionToEdit(transaction);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "transactions", id));

      const updatedTransactions = transactions.filter((t) => t.id !== id);
      updateMonthlyData(updatedTransactions); // Recalcula los datos después de eliminar
    } catch (error) {
      console.error("Error eliminando transacción:", error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setTransactionToEdit(null);
  };

  const monthOptions = availableMonths.map((monthYear) => {
    const [year, month] = monthYear.split("-");
    return {
      value: monthYear,
      label: format(new Date(parseInt(year), parseInt(month) - 1), "MMMM yyyy"),
    };
  });

  const actionTemplate = (rowData) => (
    <div className="flex gap-2">
      <Button label="Editar" icon="pi pi-pencil" className="p-button-rounded p-button-success" onClick={() => handleEdit(rowData)} />
      <Button label="Borrar" icon="pi pi-trash" className="p-button-rounded p-button-danger" onClick={() => handleDelete(rowData.id)} />
    </div>
  );

  const handleTransactionUpdate = (updatedTransaction) => {
    const updatedTransactions = transactions.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t));
    updateMonthlyData(updatedTransactions); // Actualiza el estado con los nuevos datos
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Ingresos Totales</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(monthlyData.income)}</p>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Gastos Totales</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(monthlyData.expenses)}</p>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-600">Ahorros Netos</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(monthlyData.savings)}</p>
          </div>
        </Card>
      </div>

      <Card className="shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Detalles de transacciones</h3>
        <DataTable value={transactions} paginator rows={5} sortField="date" sortOrder={-1} className="p-datatable-sm">
          <Column field="date" header="Fecha" body={(rowData) => format(rowData.date, "dd/MM/yyyy")} sortable />
          <Column field="type" header="Tipo" body={(rowData) => rowData.type.toUpperCase()} sortable />
          <Column field="category" header="Categoría" sortable />
          <Column field="description" header="Descripción" sortable />
          <Column field="amount" header="Monto" body={(rowData) => formatCurrency(rowData.amount)} sortable />
          <Column body={actionTemplate} />
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
        {transactionToEdit && (
          <EditTransactionForm transaction={transactionToEdit} onClose={handleModalClose} onTransactionUpdated={handleTransactionUpdate} />
        )}
      </Dialog>
    </div>
  );
};
