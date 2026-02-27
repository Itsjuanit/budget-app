import React, { useState, useRef, useEffect } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { useTransactions } from "../context/TransactionsProvider";
import { categories as defaultCategories } from "../utils/categories";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getAuth } from "firebase/auth";

export const EditTransactionForm = ({ transaction, onClose }) => {
  const { updateTransaction } = useTransactions();

  const [type, setType] = useState(transaction?.type || "expense");
  const [amount, setAmount] = useState(transaction?.amount || null);
  const [category, setCategory] = useState(transaction?.category || "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [installments, setInstallments] = useState(transaction?.installments || 0);
  const [installmentsRemaining, setInstallmentsRemaining] = useState(
    transaction?.installmentsRemaining || installments
  );
  const [errors, setErrors] = useState({});
  const toast = useRef(null);

  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchCustomCategories = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, "customCategories"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const income = [];
        const expense = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === "income") income.push({ label: data.label, value: data.value });
          else if (data.type === "expense") expense.push({ label: data.label, value: data.value });
        });
        setCustomCategories({ income, expense });
      } catch (error) {
        console.error("Error cargando categorías personalizadas:", error);
      }
    };
    fetchCustomCategories();
  }, [user]);

  const mergedCategories = {
    income: [...defaultCategories.income, ...customCategories.income],
    expense: [...defaultCategories.expense, ...customCategories.expense],
  };

  const validateFields = () => {
    const newErrors = {};
    if (!amount) newErrors.amount = "El monto es obligatorio.";
    if (!category) newErrors.category = "La categoría es obligatoria.";
    if (!description.trim()) newErrors.description = "La descripción es obligatoria.";
    if (!date) newErrors.date = "La fecha es obligatoria.";
    if (category === "tarjeta-credito" && installments < 0)
      newErrors.installments = "Las cuotas no pueden ser negativas.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;

    const updatedTransaction = {
      ...transaction,
      type,
      amount,
      category,
      description,
      date: date.toISOString(),
      monthYear: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      ...(category === "tarjeta-credito" && {
        installments,
        installmentsRemaining,
      }),
    };

    try {
      await updateTransaction(updatedTransaction);
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción actualizada correctamente.",
        life: 3000,
      });
      onClose();
    } catch (error) {
      console.error("Error actualizando la transacción:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Hubo un problema al actualizar la transacción.",
        life: 3000,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Toast ref={toast} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#94a3b8]">Tipo</label>
          <Dropdown
            value={type}
            options={[
              { label: "Ingreso", value: "income" },
              { label: "Gasto", value: "expense" },
              { label: "Ahorro", value: "savings" },
            ]}
            onChange={(e) => {
              setType(e.value);
              setCategory("");
            }}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#94a3b8]">Monto</label>
          <InputNumber
            value={amount}
            onValueChange={(e) => setAmount(e.value)}
            mode="currency"
            currency="ARS"
            locale="es-AR"
            className="w-full"
          />
          {errors.amount && <Message severity="error" text={errors.amount} />}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#94a3b8]">Categoría</label>
          <Dropdown
            value={category}
            options={mergedCategories[type]?.map((c) => ({
              label: c.label,
              value: c.value,
            }))}
            onChange={(e) => setCategory(e.value)}
            className="w-full"
            placeholder="Selecciona una categoría"
          />
          {errors.category && <Message severity="error" text={errors.category} />}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-[#94a3b8]">Fecha</label>
          <Calendar
            value={date}
            onChange={(e) => setDate(e.value)}
            showIcon
            className="w-full"
            dateFormat="dd/mm/yy"
            locale="es"
            maxDate={new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0)}
          />
          {errors.date && <Message severity="error" text={errors.date} />}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium text-[#94a3b8]">Descripción</label>
          <InputText
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
            placeholder="Ingrese una descripción"
          />
          {errors.description && <Message severity="error" text={errors.description} />}
        </div>

        {category === "tarjeta-credito" && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#94a3b8]">Cuotas</label>
            <InputNumber
              value={installments}
              onValueChange={(e) => {
                setInstallments(e.value);
                setInstallmentsRemaining(e.value);
              }}
              min={0}
              className="w-full"
            />
            {errors.installments && <Message severity="error" text={errors.installments} />}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          label="Cancelar"
          icon="pi pi-times"
          className="p-button-outlined p-button-sm"
          severity="secondary"
          onClick={onClose}
        />
        <Button
          type="submit"
          label="Guardar cambios"
          icon="pi pi-check"
          className="p-button-sm"
          severity="success"
          disabled={!amount || !category || !description.trim() || !date}
        />
      </div>
    </form>
  );
};
