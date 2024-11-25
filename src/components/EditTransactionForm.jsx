import React, { useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { categories } from "../utils/categories";

export const EditTransactionForm = ({ transaction, onClose, onTransactionUpdated }) => {
  const [type, setType] = useState(transaction?.type || "expense");
  const [amount, setAmount] = useState(transaction?.amount || null);
  const [category, setCategory] = useState(transaction?.category || "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!transaction) {
      console.error("No se proporcionó ninguna transacción para editar.");
      return;
    }

    const updatedTransaction = {
      ...transaction,
      type,
      amount,
      category,
      description,
      date: date.toISOString(),
    };

    try {
      const transactionRef = doc(db, "transactions", transaction.id);
      await updateDoc(transactionRef, updatedTransaction);
      console.log("Transacción actualizada:", transaction.id);

      // Notificar al componente padre sobre la actualización
      if (onTransactionUpdated) {
        onTransactionUpdated(updatedTransaction);
      }

      onClose(); // Cerrar el modal después de guardar
    } catch (error) {
      console.error("Error actualizando la transacción:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow">
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
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Fecha</label>
          <Calendar value={date} onChange={(e) => setDate(e.value)} showIcon className="w-full" />
        </div>

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="font-medium">Descripción</label>
          <InputText value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" />
        </div>
      </div>

      <Button type="submit" label="Guardar Cambios" className="mt-4 w-full sm:w-auto" disabled={!amount || !category || !date} />
    </form>
  );
};
