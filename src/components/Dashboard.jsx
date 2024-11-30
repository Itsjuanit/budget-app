import React, { useEffect, useState, useRef } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Paginator } from "primereact/paginator";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { formatCurrency } from "../utils/format";
import { Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { db } from "@/firebaseConfig";
import { collection, onSnapshot, query, where, doc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories } from "../utils/categories";
import { EditTransactionForm } from "./EditTransactionForm";
import { format } from "date-fns";
import { ConfirmDialog } from "./ConfirmDialog";

export const Dashboard = () => {
  const [transactions, setTransactions] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10); // Máximo de 10 entradas por página para mobile
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  const toast = useRef(null);

  // Detectar si estamos en una pantalla pequeña
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Menor a 768px será considerado móvil
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

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
    const expenseTransactions = transactions.filter((t) => t.type === "expense");

    const expensesGroupedByCategory = categories.expense
      .map((category) => {
        const total = expenseTransactions.filter((t) => t.category === category.value).reduce((sum, t) => sum + t.amount, 0);

        return {
          category: category.label,
          amount: total,
          color: category.color,
        };
      })
      .filter((category) => category.amount > 0);

    setExpensesByCategory(expensesGroupedByCategory);

    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    setMonthlyExpenses(totalExpenses);

    const totalIncome = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    setMonthlySavings(totalIncome - totalExpenses);
  }, [transactions]);

  const chartData = {
    labels: expensesByCategory.map((item) => item.category),
    datasets: [
      {
        data: expensesByCategory.map((item) => item.amount),
        backgroundColor: expensesByCategory.map((item) => item.color),
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: true,
        position: "bottom",
      },
    },
  };

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
      const transactionDocRef = doc(db, "transactions", transactionToDelete.id);
      await deleteDoc(transactionDocRef);
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

  const renderCards = () => {
    const start = first;
    const end = first + rows;
    const currentTransactions = transactions.slice(start, end);

    return (
      <div className="flex flex-col gap-4">
        {currentTransactions.map((transaction) => (
          <div key={transaction.id} className="border p-4 rounded-md shadow-md bg-white">
            <p>
              <strong>Fecha:</strong> {format(new Date(transaction.date), "dd/MM/yyyy")}
            </p>
            <p>
              <strong>Descripción:</strong> {transaction.description}
            </p>
            <p>
              <strong>Monto:</strong> {formatCurrency(transaction.amount)}
            </p>
            <div className="flex gap-2 mt-2">
              <Button
                label="Editar"
                icon="pi pi-pencil"
                className="p-button-rounded p-button-text p-button-sm"
                onClick={() => handleEdit(transaction)}
              />
              <Button
                label="Eliminar"
                icon="pi pi-trash"
                className="p-button-rounded p-button-text p-button-sm"
                onClick={() => confirmDelete(transaction)}
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
        />
      </div>
    );
  };

  const renderTable = () => (
    <DataTable
      value={transactions}
      paginator
      rows={10}
      rowsPerPageOptions={[5, 10, 25, 50]}
      className="p-datatable-sm"
      style={{ borderCollapse: "separate", width: "100%" }}
    >
      <Column field="date" header="Fecha" body={(rowData) => format(new Date(rowData.date), "dd/MM/yyyy")} sortable />
      <Column field="description" header="Descripción" sortable />
      <Column field="amount" header="Monto" body={(rowData) => formatCurrency(rowData.amount)} sortable />
      <Column
        header="Acciones"
        body={(rowData) => (
          <div className="flex gap-2">
            <Button
              placeholder="Top"
              tooltip="Editar"
              label=""
              icon="pi pi-pencil"
              className="p-button-rounded p-button-text p-button-sm"
              onClick={() => handleEdit(rowData)}
            />

            <Button
              placeholder="Top"
              tooltip="Eliminar"
              label=""
              icon="pi pi-trash"
              className="p-button-rounded p-button-text p-button-sm"
              onClick={() => confirmDelete(rowData)}
            />
          </div>
        )}
      />
    </DataTable>
  );

  return (
    <div className="p-6">
      <Toast ref={toast} />
      <h1 className="text-3xl font-bold mb-6">Análisis del gasto</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="shadow-lg">
          <div className="flex items-center">
            <Wallet className="w-10 h-10 text-blue-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600">Gastos mensuales</h3>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="flex items-center">
            <PiggyBank className="w-10 h-10 text-green-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600">Ahorro mensual</h3>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(monthlySavings)}</p>
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
          <div className="flex items-center">
            <TrendingUp className="w-10 h-10 text-purple-500 mr-4" />
            <div>
              <h3 className="text-lg font-semibold text-gray-600">Porcentaje de ahorro</h3>
              <p className="text-2xl font-bold text-gray-800">
                {monthlyExpenses > 0 && transactions.some((t) => t.type === "income")
                  ? `${Math.round(
                      (1 - monthlyExpenses / transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)) * 100
                    )}%`
                  : "0%"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Gastos por categoría</h3>
          <Chart type="pie" data={chartData} options={chartOptions} style={{ height: "300px" }} />
        </Card>
        <Card className="shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Transacciones recientes</h3>
          {isMobile ? renderCards() : renderTable()}
        </Card>
      </div>

      <Dialog
        header="Editar Transacción"
        visible={isModalOpen}
        style={{ width: "45vw" }}
        onHide={() => setIsModalOpen(false)}
        breakpoints={{
          "960px": "75vw",
          "640px": "90vw",
        }}
      >
        {transactionToEdit && <EditTransactionForm transaction={transactionToEdit} onClose={() => setIsModalOpen(false)} />}
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
