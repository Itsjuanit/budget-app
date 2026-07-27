import { useMemo } from "react";
import { getCategoriesForType } from "@/utils/categories";

const sumAmounts = (items) => items.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

/**
 * Agrupa un set de transacciones por categoría, descartando las que quedan en cero.
 * Devuelve la info ya lista para pintar (label + color).
 */
const groupByCategory = (transactions, type, customCategories) =>
  getCategoriesForType(type, customCategories)
    .map((category) => ({
      value: category.value,
      category: category.label,
      color: category.color,
      amount: sumAmounts(transactions.filter((t) => t.category === category.value)),
    }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);

/**
 * Totales del mes derivados de las transacciones.
 *
 * Antes esto vivía en seis useState sincronizados por un useEffect; como son
 * valores puramente derivados, alcanza con useMemo (menos renders y sin riesgo
 * de que el estado quede desfasado de las transacciones).
 */
export const useMonthlyTotals = (transactions, customCategories) =>
  useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const income = transactions.filter((t) => t.type === "income");
    const savings = transactions.filter((t) => t.type === "savings");

    const totalExpenses = sumAmounts(expenses);
    const totalIncome = sumAmounts(income);
    const totalSavings = sumAmounts(savings);

    return {
      totalExpenses,
      totalIncome,
      totalSavings,
      available: totalIncome - totalExpenses - totalSavings,
      savingsPercentage: totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0,
      expensesByCategory: groupByCategory(expenses, "expense", customCategories),
      savingsByCategory: groupByCategory(savings, "savings", customCategories),
    };
  }, [transactions, customCategories]);
