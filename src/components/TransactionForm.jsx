import React, { useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { useFinanceStore } from "../store/useFinanceStore";
import { db } from "@/firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

export const TransactionForm = () => {
  const { addTransaction } = useFinanceStore();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());

  const categories = {
    income: [
      { label: "Salario", value: "salario" },
      { label: "Freelance", value: "freelance" },
      { label: "Inversiones", value: "inversiones" },
      { label: "Otros ingresos", value: "otros-ingresos" },
    ],
    expense: [
      { label: "Servicios (Luz, Gas, Agua)", value: "servicios" },
      { label: "Internet", value: "internet" },
      { label: "Celulares", value: "celulares" },
      { label: "Netflix", value: "netflix" },
      { label: "YouTube Premium", value: "youtube-premium" },
      { label: "Disney+", value: "disney-plus" },
      { label: "Spotify", value: "spotify" },
      { label: "Alquiler", value: "alquiler" },
      { label: "Tarjeta de crédito", value: "tarjeta-credito" },
      { label: "Supermercado", value: "supermercado" },
      { label: "Transporte", value: "transporte" },
      { label: "Combustible", value: "combustible" },
      { label: "Educación", value: "educacion" },
      { label: "Salud", value: "salud" },
      { label: "Hobbies", value: "hobbies" },
      { label: "Otros gastos", value: "otros-gastos" },
      { label: "Prestamos", value: "prestamos" },
      { label: "Dibujo", value: "dibujo" },
      { label: "Rugby", value: "rugby" },
      { label: "Circulo", value: "circulo" },
    ],
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      console.error("Usuario no autenticado");
      return;
    }

    if (amount && category && date) {
      // Generar el campo monthYear
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      const transaction = {
        userId: user.uid,
        type,
        amount,
        category,
        description,
        date: date.toISOString(), // Fecha completa en formato ISO
        monthYear, // Campo nuevo para filtrar por mes y año
      };

      try {
        const docRef = await addDoc(collection(db, "transactions"), transaction);
        console.log("Transacción agregada con ID:", docRef.id);
        setAmount(null);
        setCategory("");
        setDescription("");
        setDate(new Date());
      } catch (error) {
        console.error("Error guardando la transacción:", error);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow">
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

        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="font-medium">Descripción</label>
          <InputText value={description} onChange={(e) => setDescription(e.target.value)} className="w-full" />
        </div>
      </div>

      <Button type="submit" label="Agregar" className="mt-4 w-full" disabled={!amount || !category || !date} />
    </form>
  );
};
