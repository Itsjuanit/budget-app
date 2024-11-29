import React, { useState, useRef } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast"; // Importa Toast
import { db } from "@/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories } from "../utils/categories";

export const TransactionForm = () => {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [installments, setInstallments] = useState(1); // Cuotas
  const [interest, setInterest] = useState(0); // Interés
  const [errors, setErrors] = useState({});
  const toast = useRef(null);

  const validateFields = () => {
    const newErrors = {};
    if (!amount) newErrors.amount = "El monto es obligatorio.";
    if (!category) newErrors.category = "La categoría es obligatoria.";
    if (!description.trim()) newErrors.description = "La descripción es obligatoria.";
    if (!date) newErrors.date = "La fecha es obligatoria.";
    if (category === "tarjeta-credito" && installments < 1) newErrors.installments = "Las cuotas deben ser al menos 1.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No estás autenticado. Por favor, inicia sesión.",
        life: 3000,
      });
      return;
    }

    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    const transaction = {
      userId: user.uid,
      type,
      amount,
      category,
      description,
      date: date.toISOString(),
      monthYear,
      installments: category === "tarjeta-credito" ? installments : 0,
      interest: category === "tarjeta-credito" ? interest : 0,
      installmentsRemaining: category === "tarjeta-credito" ? installments : 0,
    };

    try {
      const docRef = await addDoc(collection(db, "transactions"), transaction);
      console.log("Transacción agregada con ID:", docRef.id);
      setAmount(null);
      setCategory("");
      setDescription("");
      setDate(new Date());
      setInstallments(1);
      setInterest(0);
      setErrors({});
      toast.current.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción agregada correctamente.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error guardando la transacción:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "Hubo un problema al guardar la transacción.",
        life: 3000,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow">
      <Toast ref={toast} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {category === "tarjeta-credito" && (
          <>
            <div className="flex flex-col gap-2">
              <label className="font-medium">Cuotas</label>
              <InputNumber value={installments} onValueChange={(e) => setInstallments(e.value)} min={1} className="w-full" />
              {errors.installments && <Message severity="error" text={errors.installments} />}
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-medium">Interés (%)</label>
              <InputNumber
                value={interest}
                onValueChange={(e) => setInterest(e.value)}
                min={0}
                mode="decimal"
                suffix="%"
                className="w-full"
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium">Descripción</label>
          <InputText
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
            placeholder="Ingrese una descripción"
          />
          {errors.description && <Message severity="error" text={errors.description} />}
        </div>
      </div>

      <Button type="submit" label="Agregar" className="mt-4 w-full" />
    </form>
  );
};
