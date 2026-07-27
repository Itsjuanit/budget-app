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
    amountClass: "text-income",
    dotClass: "bg-income",
  },
  savings: {
    label: "Ahorro",
    severity: "info",
    sign: "",
    amountClass: "text-savings",
    dotClass: "bg-savings",
  },
  expense: {
    label: "Gasto",
    severity: "danger",
    sign: "-",
    amountClass: "text-expense",
    dotClass: "bg-expense",
  },
};

/** Devuelve la config del tipo, con "gasto" como fallback para datos viejos o inesperados. */
export const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.expense;
