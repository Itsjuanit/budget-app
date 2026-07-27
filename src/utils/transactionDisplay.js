/**
 * Cómo se muestra cada tipo de transacción.
 * Centralizado porque el Dashboard, el Reporte mensual y el PDF repetían
 * los mismos ternarios anidados para decidir label, color y signo.
 */
const TYPE_CONFIG = {
  income: {
    label: "Ingreso",
    severity: "success",
    sign: "+",
    amountClass: "text-emerald-400",
  },
  savings: {
    label: "Ahorro",
    severity: "info",
    sign: "",
    amountClass: "text-blue-400",
  },
  expense: {
    label: "Gasto",
    severity: "danger",
    sign: "-",
    amountClass: "text-red-400",
  },
};

/** Devuelve la config del tipo, con "gasto" como fallback para datos viejos o inesperados. */
export const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.expense;
