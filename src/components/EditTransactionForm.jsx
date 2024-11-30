import React, { useState, useRef } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { useTransactions } from "../context/TransactionsProvider";
import { categories } from "../utils/categories";

export const EditTransactionForm = ({ transaction, onClose }) => {
  const { updateTransaction } = useTransactions();

  const [type, setType] = useState(transaction?.type || "expense");
  const [amount, setAmount] = useState(transaction?.amount || null);
  const [category, setCategory] = useState(transaction?.category || "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [installments, setInstallments] = useState(transaction?.installments || 1);
  const [interest, setInterest] = useState(transaction?.interest || 0);
  const [installmentsRemaining, setInstallmentsRemaining] = useState(transaction?.installmentsRemaining || installments);
  const [errors, setErrors] = useState({});
  const toast = useRef(null);

  const isCurrentMonth = (selectedDate) => {
    const currentDate = new Date();
    return selectedDate.getFullYear() === currentDate.getFullYear() && selectedDate.getMonth() === currentDate.getMonth();
  };

  const validateFields = () => {
    const newErrors = {};
    if (!amount) newErrors.amount = "El monto es obligatorio.";
    if (!category) newErrors.category = "La categoría es obligatoria.";
    if (!description.trim()) newErrors.description = "La descripción es obligatoria.";
    if (!date) newErrors.date = "La fecha es obligatoria.";
    if (!isCurrentMonth(date)) newErrors.date = "Solo puedes editar transacciones del mes actual.";
    if (category === "tarjeta-credito") {
      if (!installments || installments < 1) newErrors.installments = "El número de cuotas debe ser mayor a 0.";
      if (interest < 0) newErrors.interest = "El interés no puede ser negativo.";
    }
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
      ...(category === "tarjeta-credito" && {
        installments,
        interest,
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
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow">
      <Toast ref={toast} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Tipo</label>
          <Dropdown
            value={type}
            options={[
              { label: "Ingreso", value: "income" },
              { label: "Gasto", value: "expense" },
            ]}
            onChange={(e) => {
              setType(e.value);
              setCategory("");
            }}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Monto</label>
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
          <label className="font-medium">Categoría</label>
          <Dropdown
            value={category}
            options={categories[type]?.map((c) => ({ label: c.label, value: c.value }))}
            onChange={(e) => setCategory(e.value)}
            className="w-full"
            placeholder="Selecciona una categoría"
          />
          {errors.category && <Message severity="error" text={errors.category} />}
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Fecha</label>
          <Calendar value={date} onChange={(e) => setDate(e.value)} showIcon className="w-full" dateFormat="dd/mm/yy" locale="es" />
          {errors.date && <Message severity="error" text={errors.date} />}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="font-medium">Descripción</label>
          <InputText
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
            placeholder="Ingrese una descripción"
          />
          {errors.description && <Message severity="error" text={errors.description} />}
        </div>

        {category === "tarjeta-credito" && (
          <>
            <div className="flex flex-col gap-2">
              <label className="font-medium">Cuotas</label>
              <InputNumber
                value={installments}
                onValueChange={(e) => {
                  setInstallments(e.value);
                  setInstallmentsRemaining(e.value);
                }}
                min={1}
                className="w-full"
              />
              {errors.installments && <Message severity="error" text={errors.installments} />}
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium">Interés (%)</label>
              <InputNumber value={interest} onValueChange={(e) => setInterest(e.value)} min={0} mode="decimal" className="w-full" />
              {errors.interest && <Message severity="error" text={errors.interest} />}
            </div>
          </>
        )}
      </div>

      <Button
        type="submit"
        label="Guardar Cambios"
        className="mt-4 w-full sm:w-auto"
        disabled={!amount || !category || !description.trim() || !date}
      />
    </form>
  );
};
