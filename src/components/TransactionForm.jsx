import React, { useState, useRef, useEffect } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { db } from "@/firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { categories as defaultCategories } from "../utils/categories";

export const TransactionForm = () => {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [installments, setInstallments] = useState(0);
  const [errors, setErrors] = useState({});
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const toast = useRef(null);
  const auth = getAuth();
  const user = auth.currentUser;

  // Cargar las categorías personalizadas del usuario (cada categoría se asigna al userId)
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

  // Fusionar categorías predefinidas con las personalizadas del usuario
  const mergedCategories = {
    income: [...defaultCategories.income, ...customCategories.income],
    expense: [...defaultCategories.expense, ...customCategories.expense],
  };

  const isSameMonthAndYear = (selectedDate) => {
    const currentDate = new Date();
    return selectedDate.getFullYear() === currentDate.getFullYear() && selectedDate.getMonth() === currentDate.getMonth();
  };

  const validateFields = () => {
    const newErrors = {};
    if (!amount) newErrors.amount = "El monto es obligatorio.";
    if (!category) newErrors.category = "La categoría es obligatoria.";
    if (!description.trim()) newErrors.description = "La descripción es obligatoria.";
    if (!date) newErrors.date = "La fecha es obligatoria.";
    if (!isSameMonthAndYear(date)) newErrors.date = "Solo puedes registrar transacciones en el mes y año actual.";
    if (category === "tarjeta-credito" && installments < 0) newErrors.installments = "Las cuotas no pueden ser negativas.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;

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
      installmentsRemaining: category === "tarjeta-credito" ? installments : 0,
    };

    try {
      const docRef = await addDoc(collection(db, "transactions"), transaction);
      console.log("Transacción agregada con ID:", docRef.id);
      setAmount(null);
      setCategory("");
      setDescription("");
      setDate(new Date());
      setInstallments(0);
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

  // Función para guardar una nueva categoría personalizada, asignada al usuario
  const handleSaveNewCategory = async () => {
    if (!newCatName.trim()) return;

    try {
      const newCategory = {
        userId: user.uid,
        type,
        label: newCatName,
        value: newCatName.toLowerCase().replace(/\s+/g, "-"),
      };

      await addDoc(collection(db, "customCategories"), newCategory);
      setCustomCategories((prev) => ({
        ...prev,
        [type]: [...prev[type], { label: newCategory.label, value: newCategory.value }],
      }));
      setCategory(newCategory.value);
      setNewCatName("");
      setShowNewCatDialog(false);
      toast.current.show({
        severity: "success",
        summary: "Categoría creada",
        detail: "La nueva categoría ha sido agregada.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error creando categoría:", error);
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear la categoría.",
        life: 3000,
      });
    }
  };

  // Opciones para el Dropdown (sólo las categorías existentes)
  const categoryOptions = mergedCategories[type]?.map((c) => ({ label: c.label, value: c.value }));

  const secondaryButtonStyles = {
    background: "#fff",
    color: "#6b6e72",
    border: "1px solid #cbd5e0",
    padding: "1rem",
    width: "40%",
    fontWeight: 100,
    transition: "transform 0.2s, box-shadow 0.2s",
  };

  return (
    <>
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
              options={categoryOptions}
              onChange={(e) => setCategory(e.value)}
              className="w-full"
              placeholder="Selecciona una categoría"
            />
            {errors.category && <Message severity="error" text={errors.category} />}
            <div className="mt-2">
              <Button
                label="Crear nueva categoría"
                className="p-button-text p-button-sm"
                onClick={() => setShowNewCatDialog(true)}
                style={secondaryButtonStyles}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-medium">Fecha</label>
            <Calendar value={date} onChange={(e) => setDate(e.value)} showIcon className="w-full" dateFormat="dd/mm/yy" locale="es" />
            {errors.date && <Message severity="error" text={errors.date} />}
          </div>

          {category === "tarjeta-credito" && (
            <div className="flex flex-col gap-2">
              <label className="font-medium">Cuotas</label>
              <InputNumber value={installments} onValueChange={(e) => setInstallments(e.value)} min={0} className="w-full" />
              {errors.installments && <Message severity="error" text={errors.installments} />}
            </div>
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

      {/* Diálogo responsive para crear una nueva categoría */}
      <Dialog
        header="Crear nueva categoría"
        visible={showNewCatDialog}
        onHide={() => setShowNewCatDialog(false)}
        style={{ width: "90vw", maxWidth: "400px" }}
      >
        <div className="flex flex-col gap-4">
          <InputText value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Nombre de la categoría" />
          <Button label="Guardar categoría" onClick={handleSaveNewCategory} />
        </div>
      </Dialog>
    </>
  );
};
