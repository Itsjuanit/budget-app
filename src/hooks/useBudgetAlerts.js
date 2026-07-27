import { useEffect } from "react";
import { formatCurrency } from "@/utils/format";
import { getCategoryLabel } from "@/utils/categories";

const WARN_THRESHOLD = 80;
const OVER_THRESHOLD = 100;

/**
 * Meses para los que ya se avisó en esta sesión.
 *
 * Vive a nivel de módulo y no en un ref porque el TabView desmonta el panel al
 * cambiar de pestaña: con un ref las alertas volvían a saltar cada vez que
 * volvías al Dashboard. Se limpia solo al recargar la página, que es justamente
 * el comportamiento buscado ("avisar al abrir la app").
 */
const alertedMonths = new Set();

/** Sólo para tests / debugging manual. */
export const resetBudgetAlerts = () => alertedMonths.clear();

/**
 * Muestra un toast por cada categoría que esté cerca del límite o lo haya excedido.
 */
export const useBudgetAlerts = ({ transactions, budgets, customCategories, month, toastRef }) => {
  useEffect(() => {
    if (!toastRef.current || !month) return;
    if (alertedMonths.has(month)) return;
    if (transactions.length === 0 || Object.keys(budgets).length === 0) return;

    const spentByCategory = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        spentByCategory[t.category] = (spentByCategory[t.category] || 0) + (Number(t.amount) || 0);
      });

    const alerts = Object.entries(budgets)
      .filter(([, limit]) => limit > 0)
      .map(([categoryValue, limit]) => {
        const spent = spentByCategory[categoryValue] || 0;
        return { categoryValue, limit, spent, percentage: (spent / limit) * 100 };
      })
      .filter(({ percentage }) => percentage >= WARN_THRESHOLD)
      // El más grave primero (antes el comparador ignoraba el segundo argumento).
      .sort((a, b) => b.percentage - a.percentage)
      .map(({ categoryValue, limit, spent, percentage }) => {
        const isOver = percentage >= OVER_THRESHOLD;
        const label = getCategoryLabel(categoryValue, customCategories);
        return {
          severity: isOver ? "error" : "warn",
          summary: isOver ? "¡Presupuesto excedido!" : "Presupuesto al límite",
          detail: `${label}: ${formatCurrency(spent)} de ${formatCurrency(limit)} (${Math.round(percentage)}%)`,
          life: isOver ? 8000 : 6000,
        };
      });

    if (alerts.length === 0) return;

    alertedMonths.add(month);

    const timers = alerts.map((alert, index) =>
      setTimeout(() => toastRef.current?.show(alert), index * 400)
    );

    return () => timers.forEach(clearTimeout);
  }, [transactions, budgets, customCategories, month, toastRef]);
};
