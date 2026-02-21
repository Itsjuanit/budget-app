import React, { useState, useEffect } from "react";
import { ProgressBar } from "primereact/progressbar";
import { Button } from "primereact/button";
import { formatCurrency } from "../utils/format";
import { db } from "@/firebaseConfig";
import { doc, onSnapshot } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories as defaultCategories } from "../utils/categories";
import { BudgetConfig } from "./BudgetConfig";

export const BudgetProgress = ({ transactions = [] }) => {
  const [budgets, setBudgets] = useState({});
  const [showConfig, setShowConfig] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  // Escuchar cambios en el presupuesto en tiempo real
  useEffect(() => {
    if (!user) return;

    const budgetRef = doc(db, "budgets", user.uid);
    const unsubscribe = onSnapshot(budgetRef, (docSnap) => {
      if (docSnap.exists()) {
        setBudgets(docSnap.data().categories || {});
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Calcular gastos por categoría del mes actual
  const expensesByCategory = {};
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    });

  // Filtrar solo categorías que tienen presupuesto definido
  const budgetedCategories = Object.entries(budgets)
    .filter(([_, limit]) => limit > 0)
    .map(([categoryValue, limit]) => {
      const spent = expensesByCategory[categoryValue] || 0;
      const percentage = Math.min(Math.round((spent / limit) * 100), 100);
      const catInfo = defaultCategories.expense.find((c) => c.value === categoryValue);

      return {
        value: categoryValue,
        label: catInfo?.label || categoryValue,
        color: catInfo?.color || "#94a3b8",
        limit,
        spent,
        percentage,
        remaining: limit - spent,
        overBudget: spent > limit,
      };
    })
    .sort((a, b) => b.percentage - a.percentage); // Más usados primero

  const getProgressColor = (percentage) => {
    if (percentage >= 90) return "#f87171"; // rojo
    if (percentage >= 70) return "#fbbf24"; // amarillo
    return "#34d399"; // verde
  };

  const hasBudgets = budgetedCategories.length > 0;

  return (
    <>
      <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Presupuesto mensual</h3>
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
                    <span className="text-sm text-white">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        cat.overBudget ? "text-red-400" : "text-[#94a3b8]"
                      }`}
                    >
                      {formatCurrency(cat.spent)} / {formatCurrency(cat.limit)}
                    </span>
                    {cat.overBudget && (
                      <i className="pi pi-exclamation-triangle text-red-400 text-xs" />
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
                  <span className="text-xs text-[#64748b]">{cat.percentage}% usado</span>
                  <span
                    className={`text-xs ${
                      cat.overBudget ? "text-red-400 font-medium" : "text-[#64748b]"
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
            <i className="pi pi-calculator text-3xl text-[#2a2a4a] mb-3" />
            <p className="text-[#94a3b8] text-sm">
              Todavía no configuraste un presupuesto mensual.
            </p>
            <p className="text-[#64748b] text-xs mt-1">
              Definí límites por categoría para controlar tus gastos.
            </p>
          </div>
        )}
      </div>

      <BudgetConfig visible={showConfig} onHide={() => setShowConfig(false)} />
    </>
  );
};
