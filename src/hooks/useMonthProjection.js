import { useMemo } from "react";
import { getCurrentMonth, monthKeyToDate } from "@/utils/months";

/** Días que tiene un mes "YYYY-MM". */
const daysInMonth = (monthKey) => {
  const date = monthKeyToDate(monthKey);
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

/**
 * Proyección de cierre del mes en curso.
 *
 * Sólo tiene sentido sobre el mes actual: en uno pasado el resultado ya está
 * cerrado y en uno futuro no hay ritmo que extrapolar. En esos casos devuelve
 * null y la UI no muestra nada.
 *
 * @param {string} month           mes visible, "YYYY-MM"
 * @param {number} spentSoFar      gastado hasta hoy (incluye proyectos incluidos)
 * @param {number} availableNow    disponible hoy, después de ingresos y ahorros
 */
export const useMonthProjection = (month, spentSoFar, availableNow) =>
  useMemo(() => {
    if (month !== getCurrentMonth()) return null;

    const today = new Date();
    const totalDays = daysInMonth(month);
    const elapsedDays = today.getDate();
    const remainingDays = totalDays - elapsedDays;

    // El primer día del mes no hay ritmo del cual extrapolar.
    if (elapsedDays < 1 || spentSoFar <= 0) return null;

    const dailyPace = spentSoFar / elapsedDays;
    const projectedTotal = dailyPace * totalDays;

    // Cuánto se puede gastar por día en lo que queda sin pasarse del disponible.
    // Si ya está en rojo, el presupuesto diario es cero, no un número negativo.
    const safeDailyBudget = remainingDays > 0 ? Math.max(availableNow / remainingDays, 0) : 0;

    return {
      totalDays,
      elapsedDays,
      remainingDays,
      dailyPace,
      projectedTotal,
      safeDailyBudget,
      /** El ritmo actual termina gastando más de lo que hay disponible. */
      willOverspend: availableNow < 0 || projectedTotal - spentSoFar > availableNow,
      /** Cuánto se pasaría al cierre si sigue este ritmo. */
      projectedOverspend: Math.max(projectedTotal - spentSoFar - availableNow, 0),
    };
  }, [month, spentSoFar, availableNow]);
