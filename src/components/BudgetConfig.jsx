import { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { db } from "@/firebaseConfig";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { useTransactions } from "@/context/TransactionsProvider";
import { getCategoriesForType } from "@/utils/categories";

export const BudgetConfig = ({ visible, onHide }) => {
  const { user } = useAuth();
  // budgets ya llega del provider en tiempo real: no hace falta releer el doc al abrir.
  const { budgets: savedBudgets, customCategories, archivedCategories } = useTransactions();

  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  // Al abrir el diálogo se parte de lo guardado; al cerrar se descartan los cambios.
  useEffect(() => {
    if (visible) setDraft(savedBudgets);
  }, [visible, savedBudgets]);

  // Incluye las personalizadas (antes sólo se podían presupuestar las por defecto)
  // y excluye las archivadas, que ya no se usan para cargar movimientos.
  const expenseCategories = getCategoriesForType("expense", customCategories, archivedCategories);

  const handleChange = (categoryValue, amount) => {
    setDraft((prev) => ({ ...prev, [categoryValue]: amount || 0 }));
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);

    try {
      const filteredBudgets = Object.fromEntries(
        Object.entries(draft).filter(([, value]) => value > 0)
      );

      await setDoc(doc(db, "budgets", user.uid), {
        userId: user.uid,
        categories: filteredBudgets,
        updatedAt: new Date().toISOString(),
      });

      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Presupuesto guardado correctamente.",
        life: 3000,
      });
      onHide();
    } catch (error) {
      console.error("Error guardando presupuesto:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo guardar el presupuesto.",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />
      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-calculator text-brand"></i>
            <span>Configurar presupuesto mensual</span>
          </div>
        }
        visible={visible}
        onHide={onHide}
        style={{ width: "90vw", maxWidth: "650px" }}
        breakpoints={{ "640px": "95vw" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-outlined p-button-sm"
              severity="secondary"
              onClick={onHide}
              disabled={saving}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              className="p-button-sm"
              severity="success"
              onClick={handleSave}
              loading={saving}
            />
          </div>
        }
      >
        <p className="text-muted text-sm mb-4">
          Definí un límite mensual para las categorías que querés controlar. Dejá en 0 las que no
          necesitan límite.
        </p>

        <div className="flex flex-col gap-2.5 max-h-[450px] overflow-y-auto overflow-x-hidden pr-3">
          {expenseCategories.map((cat) => (
            <div
              key={cat.value}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm text-strong">{cat.label}</span>
              </div>
              <div className="w-28 sm:w-44 flex-shrink-0">
                <InputNumber
                  value={draft[cat.value] || null}
                  onValueChange={(e) => handleChange(cat.value, e.value)}
                  mode="currency"
                  currency="ARS"
                  locale="es-AR"
                  placeholder="$ 0"
                  inputClassName="text-right text-sm"
                  aria-label={`Presupuesto de ${cat.label}`}
                />
              </div>
            </div>
          ))}
        </div>
      </Dialog>
    </>
  );
};
