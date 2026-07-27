import { useMemo, useState } from "react";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import { formatCurrency } from "@/utils/format";
import { getCategoryLabel, getCategoryColor } from "@/utils/categories";
import { useTransactions } from "@/context/TransactionsProvider";
import { BudgetConfig } from "./BudgetConfig";

// ProgressBar aplica `color` como backgroundColor inline, así que una variable CSS
// funciona y sigue al tema activo.
const getProgressColor = (percentage) => {
  if (percentage >= 90) return "var(--expense)"; // rojo
  if (percentage >= 70) return "var(--warning)"; // amarillo
  return "var(--income)"; // verde
};

export const BudgetProgress = ({ transactions = [] }) => {
  // Los presupuestos vienen del provider: antes había dos listeners escuchando
  // el mismo documento (uno acá y otro en el Dashboard).
  const { budgets, customCategories } = useTransactions();
  const [showConfig, setShowConfig] = useState(false);

  const budgetedCategories = useMemo(() => {
    const spentByCategory = {};
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        spentByCategory[t.category] = (spentByCategory[t.category] || 0) + (Number(t.amount) || 0);
      });

    return Object.entries(budgets)
      .filter(([, limit]) => limit > 0)
      .map(([categoryValue, limit]) => {
        const spent = spentByCategory[categoryValue] || 0;
        return {
          value: categoryValue,
          label: getCategoryLabel(categoryValue, customCategories),
          color: getCategoryColor(categoryValue, customCategories),
          limit,
          spent,
          percentage: Math.min(Math.round((spent / limit) * 100), 100),
          remaining: limit - spent,
          overBudget: spent > limit,
        };
      })
      .sort((a, b) => b.percentage - a.percentage); // Más usados primero
  }, [budgets, transactions, customCategories]);

  const hasBudgets = budgetedCategories.length > 0;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface-raised p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-strong">Presupuesto mensual</h3>
          <Button
            icon={hasBudgets ? "pi pi-cog" : "pi pi-plus"}
            label={hasBudgets ? "Editar" : "Configurar"}
            className="p-button-text p-button-sm"
            onClick={() => setShowConfig(true)}
          />
        </div>

        {hasBudgets ? (
          <div className="flex flex-col gap-4">
            {budgetedCategories.map((cat) => (
              <div key={cat.value}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm text-strong">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        cat.overBudget ? "text-expense" : "text-muted"
                      }`}
                    >
                      {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)}
                    </span>
                    {cat.overBudget && (
                      <i className="pi pi-exclamation-triangle text-expense text-xs" />
                    )}
                  </div>
                </div>
                <ProgressBar
                  value={cat.percentage}
                  showValue={false}
                  style={{ height: "6px" }}
                  color={getProgressColor(cat.percentage)}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-subtle">{cat.percentage}% usado</span>
                  <span
                    className={`text-xs ${
                      cat.overBudget ? "text-expense font-medium" : "text-subtle"
                    }`}
                  >
                    {cat.overBudget
                      ? `Excedido ${formatCurrency(Math.abs(cat.remaining))}`
                      : `Quedan ${formatCurrency(cat.remaining)}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <i className="pi pi-calculator text-3xl text-border mb-3" />
            <p className="text-muted text-sm">Todavía no configuraste un presupuesto mensual.</p>
            <p className="text-subtle text-xs mt-1">
              Definí límites por categoría para controlar tus gastos.
            </p>
          </div>
        )}
      </div>

      <BudgetConfig visible={showConfig} onHide={() => setShowConfig(false)} />
    </>
  );
};
