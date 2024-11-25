import React, { useEffect, useState } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { useFinanceStore } from "../store/useFinanceStore";
import { formatCurrency } from "../utils/format";
import { Wallet, TrendingUp, PiggyBank } from "lucide-react";
import { db } from "@/firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useTransactions } from "../context/TransactionsProvider";
import { EditTransactionForm } from "./EditTransactionForm";

export const Dashboard = () => {
  const { categories } = useFinanceStore();
  const { deleteTransaction } = useTransactions();
  const [transactions, setTransactions] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [expensesByCategory, setExpensesByCategory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const userTransactionsRef = query(collection(db, "transactions"), where("userId", "==", user.uid));

      const unsubscribe = onSnapshot(userTransactionsRef, (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTransactions(data);
      });

      return () => unsubscribe();
    }
  }, []);

  useEffect(() => {
    const expenseTransactions = transactions.filter((t) => t.type === "expense");

    const expensesGroupedByCategory = categories
      .filter((category) => category.type === "expense")
      .map((category) => {
        const total = expenseTransactions.filter((t) => t.category === category.value).reduce((sum, t) => sum + t.amount, 0);

        return {
          category: category.name,
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
  }, [transactions, categories]);

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

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id);
    } catch (error) {
      console.error("Error eliminando transacción:", error);
    }
  };

  return (
    <div className="p-6">
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
                {monthlyExpenses > 0 ? `${Math.round((monthlySavings / monthlyExpenses) * 100)}%` : "0%"}
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
          <ul className="space-y-2">
            {transactions.slice(0, 5).map((transaction) => (
              <li key={transaction.id} className="flex justify-between items-center p-2 border-b last:border-0">
                <div>
                  <span className="font-medium">{transaction.description}</span>
                  <p className="text-gray-600">{formatCurrency(transaction.amount)}</p>
                </div>
                <div className="flex gap-1">
                  <Button
                    icon="pi pi-pencil"
                    className="p-button-rounded p-button-text p-button-sm"
                    onClick={() => handleEdit(transaction)}
                  />
                  <Button
                    icon="pi pi-trash"
                    className="p-button-rounded p-button-text p-button-sm"
                    onClick={() => handleDelete(transaction.id)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Dialog header="Editar Transacción" visible={isModalOpen} style={{ width: "40vw" }} onHide={() => setIsModalOpen(false)}>
        {transactionToEdit && <EditTransactionForm transaction={transactionToEdit} onClose={() => setIsModalOpen(false)} />}
      </Dialog>
    </div>
  );
};
