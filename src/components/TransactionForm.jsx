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
import { fetchDolarRate, convertUsdToArs, dolarTypeOptions } from "../utils/dolarService";
import { ToggleButton } from "primereact/togglebutton";

export const TransactionForm = () => {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [installments, setInstallments] = useState(0);
  const [errors, setErrors] = useState({});
  const [customCategories, setCustomCategories] = useState({
    income: [],
    expense: [],
    savings: [],
  });
  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [usdMode, setUsdMode] = useState(false);
  const [usdAmount, setUsdAmount] = useState(null);
  const [dolarType, setDolarType] = useState("cripto");
  const [dolarRate, setDolarRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const toast = useRef(null);
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
        const savings = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.type === "income") income.push({ label: data.label, value: data.value });
          else if (data.type === "expense") expense.push({ label: data.label, value: data.value });
          else if (data.type === "savings") savings.push({ label: data.label, value: data.value });
        });
        setCustomCategories({ income, expense, savings });
      } catch (error) {
        console.error("Error cargando categorías personalizadas:", error);
      }
    };
    fetchCustomCategories();
  }, [user]);

  // Cargar cotización del dólar
  useEffect(() => {
    if (!usdMode) return;

    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const rate = await fetchDolarRate(dolarType);
        setDolarRate(rate);
        // Recalcular si ya hay un monto en USD
        if (usdAmount) {
          setAmount(convertUsdToArs(usdAmount, rate.venta));
        }
      } catch (error) {
        console.error("Error cargando cotización:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "No se pudo obtener la cotización del dólar.",
          life: 3000,
        });
      } finally {
        setLoadingRate(false);
      }
    };

    loadRate();
  }, [usdMode, dolarType]);

  const mergedCategories = {
    income: [...defaultCategories.income, ...customCategories.income],
    expense: [...defaultCategories.expense, ...customCategories.expense],
    savings: [...(defaultCategories.savings || []), ...customCategories.savings],
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

    if (!user) {
      toast.current.show({
        severity: "error",
        summary: "Error",
        detail: "No estás autenticado. Por favor, iniciá sesión.",
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
      await addDoc(collection(db, "transactions"), transaction);
      setAmount(null);
      setCategory("");
      setDescription("");
      setDate(new Date());
      setInstallments(0);
      setErrors({});
      setUsdMode(false);
      setUsdAmount(null);
      setDolarRate(null);
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

  const categoryOptions = mergedCategories[type]?.map((c) => ({
    label: c.label,
    value: c.value,
  }));

  const handleUsdChange = (value) => {
    setUsdAmount(value);
    if (value && dolarRate) {
      setAmount(convertUsdToArs(value, dolarRate.venta));
    } else {
      setAmount(null);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5"
      >
        <Toast ref={toast} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                if (e.value !== type) {
                  setUsdMode(false);
                  setUsdAmount(null);
                  setDolarRate(null);
                }
              }}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#94a3b8]">Monto</label>
            <InputNumber
              value={amount}
              onValueChange={(e) => {
                setAmount(e.value);
                if (usdMode) {
                  setUsdMode(false);
                  setUsdAmount(null);
                }
              }}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              className="w-full"
            />
            {!usdMode && (
              <button
                type="button"
                className="text-xs text-purple-400 hover:text-purple-300 text-left transition-colors"
                onClick={() => setUsdMode(true)}
              >
                <i className="pi pi-dollar mr-1" style={{ fontSize: "0.65rem" }} />
                Convertir desde USD
              </button>
            )}
            {usdMode && (
              <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-400">Conversión USD → ARS</span>
                  <button
                    type="button"
                    className="text-[#64748b] hover:text-[#94a3b8] transition-colors"
                    onClick={() => {
                      setUsdMode(false);
                      setUsdAmount(null);
                      setDolarRate(null);
                    }}
                  >
                    <i className="pi pi-times" style={{ fontSize: "0.7rem" }} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <InputNumber
                    value={usdAmount}
                    onValueChange={(e) => handleUsdChange(e.value)}
                    mode="currency"
                    currency="USD"
                    locale="en-US"
                    className="w-full"
                    placeholder="USD"
                  />
                  <Dropdown
                    value={dolarType}
                    options={dolarTypeOptions}
                    onChange={(e) => setDolarType(e.value)}
                    className="w-36 flex-shrink-0"
                  />
                </div>
                {dolarRate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748b]">
                      {dolarRate.nombre}: ${dolarRate.venta.toLocaleString("es-AR")}
                    </span>
                    {usdAmount > 0 && (
                      <span className="font-bold text-emerald-400">
                        ={" "}
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(convertUsdToArs(usdAmount, dolarRate.venta))}
                      </span>
                    )}
                    {loadingRate && <i className="pi pi-spin pi-spinner text-[#94a3b8]" />}
                  </div>
                )}
              </div>
            )}
            {errors.amount && <Message severity="error" text={errors.amount} />}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#94a3b8]">Categoría</label>
            <div className="flex gap-2">
              <Dropdown
                value={category}
                options={categoryOptions}
                onChange={(e) => setCategory(e.value)}
                className="w-full"
                placeholder="Selecciona una categoría"
              />
              <Button
                type="button"
                icon="pi pi-plus"
                className="p-button-outlined p-button-sm flex-shrink-0"
                severity="secondary"
                tooltip="Crear categoría"
                tooltipOptions={{ position: "top" }}
                onClick={() => setShowNewCatDialog(true)}
              />
            </div>
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

          {category === "tarjeta-credito" && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#94a3b8]">Cuotas</label>
              <InputNumber
                value={installments}
                onValueChange={(e) => setInstallments(e.value)}
                min={0}
                className="w-full"
              />
              {errors.installments && <Message severity="error" text={errors.installments} />}
            </div>
          )}

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-[#94a3b8]">Descripción</label>
            <InputText
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full"
              placeholder="Ingrese una descripción"
            />
            {errors.description && <Message severity="error" text={errors.description} />}
          </div>
        </div>

        <div className="flex justify-end mt-5 [&>button]:w-full [&>button]:sm:w-auto">
          <Button
            type="submit"
            label="Agregar transacción"
            icon="pi pi-plus"
            className="p-button-sm"
            severity="success"
            disabled={!amount || !category || !description.trim() || !date}
          />
        </div>
      </form>

      {/* Dialog nueva categoría */}
      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-tag text-purple-400"></i>
            <span>Crear nueva categoría</span>
          </div>
        }
        visible={showNewCatDialog}
        onHide={() => setShowNewCatDialog(false)}
        style={{ width: "90vw", maxWidth: "400px" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancelar"
              icon="pi pi-times"
              className="p-button-outlined p-button-sm"
              severity="secondary"
              onClick={() => setShowNewCatDialog(false)}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              className="p-button-sm"
              severity="success"
              onClick={handleSaveNewCategory}
              disabled={!newCatName.trim()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2">
          <label className="text-sm font-medium text-[#94a3b8]">Nombre de la categoría</label>
          <InputText
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Ej: Mascota, Gimnasio..."
            className="w-full"
            autoFocus
          />
          <p className="text-xs text-[#64748b]">
            Se creará como categoría de{" "}
            <span className="font-medium text-[#94a3b8]">
              {type === "income" ? "ingreso" : type === "savings" ? "ahorro" : "gasto"}
            </span>
          </p>
        </div>
      </Dialog>
    </>
  );
};
