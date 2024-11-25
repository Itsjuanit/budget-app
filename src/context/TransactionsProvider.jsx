import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth } from "firebase/auth";

const TransactionsContext = createContext();

export const TransactionsProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Carga inicial de meses disponibles
  useEffect(() => {
    const loadAvailableMonths = async () => {
      try {
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

        // Seleccionar el mes más reciente si no hay uno seleccionado
        if (monthsArray.length > 0 && !selectedMonth) {
          setSelectedMonth(monthsArray[monthsArray.length - 1]);
        }
      } catch (error) {
        console.error("Error al cargar meses disponibles:", error);
      }
    };

    loadAvailableMonths();
  }, [selectedMonth]);

  // Cargar transacciones del mes seleccionado
  const loadTransactionsForMonth = async (month) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !month) return;

      const transactionsRef = query(collection(db, "transactions"), where("userId", "==", user.uid), where("monthYear", "==", month));

      const snapshot = await getDocs(transactionsRef);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setTransactions(data);
    } catch (error) {
      console.error("Error al cargar transacciones del mes:", error);
    }
  };

  // Actualizar una transacción
  const updateTransaction = async (updatedTransaction) => {
    try {
      const transactionRef = doc(db, "transactions", updatedTransaction.id);
      await updateDoc(transactionRef, updatedTransaction);

      setTransactions((prev) => prev.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t)));
    } catch (error) {
      console.error("Error al actualizar transacción:", error);
    }
  };

  // Eliminar una transacción
  const deleteTransaction = async (id) => {
    try {
      await deleteDoc(doc(db, "transactions", id));
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error al eliminar transacción:", error);
    }
  };

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        availableMonths,
        selectedMonth,
        setSelectedMonth,
        loadTransactionsForMonth,
        updateTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
};

export const useTransactions = () => useContext(TransactionsContext);
