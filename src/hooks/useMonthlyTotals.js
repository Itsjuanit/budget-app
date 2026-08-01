import { useMemo } from "react";
import { getCategoriesForType, getCategoryGroup } from "@/utils/categories";

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
 * Agrupa transacciones por el grupo ("paraguas") de su categoría.
 *
 * El grupo sale de la definición de la categoría, no de la transacción, así que
 * esto funciona sobre los datos que ya existen: no hizo falta migrar nada.
 */
const groupByCategoryGroup = (transactions, customCategories) => {
  const totals = new Map();

  transactions.forEach((t) => {
    const group = getCategoryGroup(t.category, customCategories);
    const current = totals.get(group.value);
    const amount = Number(t.amount) || 0;

    if (current) current.amount += amount;
    else totals.set(group.value, { ...group, category: group.label, amount });
  });

  return [...totals.values()].filter((g) => g.amount > 0).sort((a, b) => b.amount - a.amount);
};

/**
 * Totales del mes derivados de las transacciones.
 *
 * Antes esto vivía en seis useState sincronizados por un useEffect; como son
 * valores puramente derivados, alcanza con useMemo (menos renders y sin riesgo
 * de que el estado quede desfasado de las transacciones).
 */
export const useMonthlyTotals = (transactions, customCategories, projectsTotal = 0) =>
  useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const income = transactions.filter((t) => t.type === "income");
    const savings = transactions.filter((t) => t.type === "savings");

    const totalExpenses = sumAmounts(expenses);
    const totalIncome = sumAmounts(income);
    const totalSavings = sumAmounts(savings);

    return {
      // Los gastos por categoría siguen contando sólo transacciones, para que
      // el total coincida con lo que muestra el gráfico. El aporte de los
      // proyectos se expone aparte y sólo se descuenta del disponible.
      totalExpenses,
      totalIncome,
      totalSavings,
      projectsTotal,
      totalSpent: totalExpenses + projectsTotal,
      available: totalIncome - totalExpenses - totalSavings - projectsTotal,
      savingsPercentage: totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0,
      expensesByCategory: groupByCategory(expenses, "expense", customCategories),
      expensesByGroup: groupByCategoryGroup(expenses, customCategories),
      savingsByCategory: groupByCategory(savings, "savings", customCategories),
    };
  }, [transactions, customCategories, projectsTotal]);
