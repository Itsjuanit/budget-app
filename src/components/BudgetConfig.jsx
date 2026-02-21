import React, { useState, useEffect, useRef } from "react";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { db } from "@/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories as defaultCategories } from "../utils/categories";

export const BudgetConfig = ({ visible, onHide }) => {
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  const auth = getAuth();
  const user = auth.currentUser;

  // Cargar presupuestos existentes
  useEffect(() => {
    const loadBudgets = async () => {
      if (!user || !visible) return;
      try {
        const budgetRef = doc(db, "budgets", user.uid);
        const budgetDoc = await getDoc(budgetRef);

        if (budgetDoc.exists()) {
          setBudgets(budgetDoc.data().categories || {});
        }
      } catch (error) {
        console.error("Error cargando presupuestos:", error);
      }
    };
    loadBudgets();
  }, [user, visible]);

  const handleChange = (categoryValue, amount) => {
    setBudgets((prev) => ({
      ...prev,
      [categoryValue]: amount || 0,
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const budgetRef = doc(db, "budgets", user.uid);
      // Filtrar categorías con presupuesto > 0
      const filteredBudgets = Object.fromEntries(
        Object.entries(budgets).filter(([_, value]) => value > 0)
      );

      await setDoc(budgetRef, {
        userId: user.uid,
        categories: filteredBudgets,
        updatedAt: new Date().toISOString(),
      });

      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Presupuesto guardado correctamente.",
        life: 3000,
      });
      onHide();
    } catch (error) {
      console.error("Error guardando presupuesto:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar el presupuesto.",
        life: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const expenseCategories = defaultCategories.expense;

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-calculator text-purple-400"></i>
            <span>Configurar presupuesto mensual</span>
          </div>
        }
        visible={visible}
        onHide={onHide}
        style={{ width: "90vw", maxWidth: "550px" }}
        breakpoints={{ "640px": "95vw" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-outlined p-button-sm"
              severity="secondary"
              onClick={onHide}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              className="p-button-sm"
              severity="success"
              onClick={handleSave}
              loading={loading}
            />
          </div>
        }
      >
        <p className="text-[#94a3b8] text-sm mb-4">
          Definí un límite mensual para las categorías que querés controlar. Dejá en 0 las que no
          necesitan límite.
        </p>

        <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2">
          {expenseCategories.map((cat) => (
            <div
              key={cat.value}
              className="flex items-center justify-between gap-4 rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] px-4 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-white truncate">{cat.label}</span>
              </div>
              <InputNumber
                value={budgets[cat.value] || null}
                onValueChange={(e) => handleChange(cat.value, e.value)}
                mode="currency"
                currency="ARS"
                locale="es-AR"
                placeholder="$ 0"
                className="w-40"
                inputClassName="text-right text-sm"
              />
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
};
