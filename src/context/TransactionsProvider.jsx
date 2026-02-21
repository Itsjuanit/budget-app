import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth } from "firebase/auth";

const TransactionsContext = createContext();

/**
 * Genera un array de strings "YYYY-MM" desde startMonth hasta endMonth inclusive.
 * Ej: generateMonthRange("2025-03", "2025-07") → ["2025-03", "2025-04", "2025-05", "2025-06", "2025-07"]
 */
const generateMonthRange = (startMonth, endMonth) => {
  const [startYear, startMon] = startMonth.split("-").map(Number);
  const [endYear, endMon] = endMonth.split("-").map(Number);

  const months = [];
  let year = startYear;
  let month = startMon;

  while (year < endYear || (year === endYear && month <= endMon)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
};

/**
 * Retorna el mes actual en formato "YYYY-MM".
 */
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const TransactionsProvider = ({ children }) => {
  const [transactions, setTransactions] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Cargar meses disponibles una sola vez al montar
  useEffect(() => {
    const loadAvailableMonths = async () => {
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) return;

        // Obtener solo la transacción más antigua para saber el primer mes
        const oldestQuery = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          orderBy("monthYear", "asc"),
          limit(1)
        );

        const snapshot = await getDocs(oldestQuery);

        if (snapshot.empty) {
          // Sin transacciones — solo mostrar mes actual
          setAvailableMonths([getCurrentMonth()]);
          return;
        }

        const firstMonth = snapshot.docs[0].data().monthYear;
        const currentMonth = getCurrentMonth();

        // Generar todos los meses desde el primero hasta el actual
        const allMonths = generateMonthRange(firstMonth, currentMonth);
        setAvailableMonths(allMonths);
      } catch (error) {
        console.error("Error al cargar meses disponibles:", error);
      }
    };

    loadAvailableMonths();
  }, []);

  const loadTransactionsForMonth = useCallback(async (month) => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user || !month) return;

      const transactionsRef = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        where("monthYear", "==", month)
      );

      const snapshot = await getDocs(transactionsRef);
      const data = snapshot.docs.map((doc) => {
        const transaction = doc.data();
        const remainingAmount =
          transaction.type === "expense" &&
          transaction.category === "tarjeta-credito" &&
          transaction.installments > 0 &&
          transaction.installmentsRemaining > 0
            ? (transaction.amount * (1 + (transaction.interest || 0) / 100)) /
              transaction.installments
            : 0;

        return {
          id: doc.id,
          ...transaction,
          remainingAmount,
        };
      });

      setTransactions(data);
    } catch (error) {
      console.error("Error al cargar transacciones del mes:", error);
    }
  }, []);

  const updateTransaction = async (updatedTransaction) => {
    try {
      const transactionRef = doc(db, "transactions", updatedTransaction.id);
      const { id, ...dataToUpdate } = updatedTransaction;
      await updateDoc(transactionRef, dataToUpdate);

      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? updatedTransaction : t))
      );
    } catch (error) {
      console.error("Error al actualizar transacción:", error);
    }
  };

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

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error("useTransactions debe usarse dentro de TransactionsProvider");
  }
  return context;
};