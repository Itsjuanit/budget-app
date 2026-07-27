import { useEffect, useRef, useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { useTransactions } from "@/context/TransactionsProvider";
import { getCategoriesForType, pickColorForNewCategory } from "@/utils/categories";
import { fetchDolarRate, convertUsdToArs, dolarTypeOptions } from "@/utils/dolarService";
import { toMonthKey } from "@/utils/months";
import { toSlug } from "@/utils/slug";

const TYPE_OPTIONS = [
  { label: "Ingreso", value: "income" },
  { label: "Gasto", value: "expense" },
  { label: "Ahorro", value: "savings" },
];

const TYPE_LABELS = { income: "ingreso", savings: "ahorro", expense: "gasto" };

const MAX_DATE = new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0);

export const TransactionForm = () => {
  const { addTransaction, addCustomCategory, customCategories } = useTransactions();

  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState(null);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date());
  const [installments, setInstallments] = useState(0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const [showNewCatDialog, setShowNewCatDialog] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [usdMode, setUsdMode] = useState(false);
  const [usdAmount, setUsdAmount] = useState(null);
  const [dolarType, setDolarType] = useState("cripto");
  const [dolarRate, setDolarRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);

  const toast = useRef(null);
  // Espejo del monto en USD para poder recalcular al cambiar de cotización sin
  // meter usdAmount en las dependencias (haría re-fetch en cada tecla).
  const usdAmountRef = useRef(null);

  // Cotización del dólar, sólo mientras el modo USD está activo.
  useEffect(() => {
    if (!usdMode) return;

    let cancelled = false;

    const loadRate = async () => {
      setLoadingRate(true);
      try {
        const rate = await fetchDolarRate(dolarType);
        if (cancelled) return;
        setDolarRate(rate);
        if (usdAmountRef.current) {
          setAmount(convertUsdToArs(usdAmountRef.current, rate.venta));
        }
      } catch (error) {
        if (cancelled) return;
        console.error("Error cargando cotización:", error);
        toast.current?.show({
          severity: "error",
          summary: "Error",
          detail: "No se pudo obtener la cotización del dólar.",
          life: 3000,
        });
      } finally {
        if (!cancelled) setLoadingRate(false);
      }
    };

    loadRate();
    return () => {
      cancelled = true;
    };
  }, [usdMode, dolarType]);

  const categoryOptions = getCategoriesForType(type, customCategories).map((c) => ({
    label: c.label,
    value: c.value,
  }));

  const isCreditCard = category === "tarjeta-credito";

  const exitUsdMode = () => {
    setUsdMode(false);
    setUsdAmount(null);
    usdAmountRef.current = null;
    setDolarRate(null);
  };

  const resetForm = () => {
    setAmount(null);
    setCategory("");
    setDescription("");
    setDate(new Date());
    setInstallments(0);
    setErrors({});
    exitUsdMode();
  };

  const validateFields = () => {
    const newErrors = {};
    if (!amount || amount <= 0) newErrors.amount = "El monto debe ser mayor a cero.";
    if (!category) newErrors.category = "La categoría es obligatoria.";
    if (!description.trim()) newErrors.description = "La descripción es obligatoria.";
    if (!date) newErrors.date = "La fecha es obligatoria.";
    if (isCreditCard && installments < 0)
      newErrors.installments = "Las cuotas no pueden ser negativas.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields() || saving) return;

    setSaving(true);
    try {
      await addTransaction({
        type,
        amount,
        category,
        description: description.trim(),
        date: date.toISOString(),
        monthYear: toMonthKey(date),
        installments: isCreditCard ? installments : 0,
        installmentsRemaining: isCreditCard ? installments : 0,
      });
      resetForm();
      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción agregada correctamente.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error guardando la transacción:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Hubo un problema al guardar la transacción.",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNewCategory = async () => {
    const label = newCatName.trim();
    if (!label || creatingCategory) return;

    const value = toSlug(label);

    if (getCategoriesForType(type, customCategories).some((c) => c.value === value)) {
      toast.current?.show({
        severity: "warn",
        summary: "Ya existe",
        detail: "Ya tenés una categoría con ese nombre.",
        life: 3000,
      });
      return;
    }

    setCreatingCategory(true);
    try {
      await addCustomCategory({
        type,
        label,
        value,
        color: pickColorForNewCategory(type, customCategories),
      });
      // El listener del provider trae la categoría nueva; acá sólo se la deja seleccionada.
      setCategory(value);
      setNewCatName("");
      setShowNewCatDialog(false);
      toast.current?.show({
        severity: "success",
        summary: "Categoría creada",
        detail: "La nueva categoría ha sido agregada.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error creando categoría:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear la categoría.",
        life: 3000,
      });
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleUsdChange = (value) => {
    setUsdAmount(value);
    usdAmountRef.current = value;
    setAmount(value && dolarRate ? convertUsdToArs(value, dolarRate.venta) : null);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface-raised p-5"
      >
        <Toast ref={toast} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="new-type">
              Tipo
            </label>
            <Dropdown
              inputId="new-type"
              value={type}
              options={TYPE_OPTIONS}
              onChange={(e) => {
                if (e.value === type) return;
                setType(e.value);
                setCategory("");
                exitUsdMode();
              }}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="new-amount">
              Monto
            </label>
            <InputNumber
              inputId="new-amount"
              value={amount}
              onValueChange={(e) => {
                setAmount(e.value);
                // Escribir el monto a mano descarta la conversión desde USD.
                if (usdMode) exitUsdMode();
              }}
              mode="currency"
              currency="ARS"
              locale="es-AR"
              className="w-full"
            />
            {!usdMode && (
              <button
                type="button"
                className="text-xs text-brand hover:text-brand-hover text-left transition-colors"
                onClick={() => setUsdMode(true)}
              >
                <i className="pi pi-dollar mr-1" style={{ fontSize: "0.65rem" }} />
                Convertir desde USD
              </button>
            )}
            {usdMode && (
              <div className="rounded-lg border border-ring-primary bg-tint-primary p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-brand">Conversión USD → ARS</span>
                  <button
                    type="button"
                    className="text-subtle hover:text-muted transition-colors"
                    onClick={exitUsdMode}
                    aria-label="Cerrar conversión USD"
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
                {loadingRate && (
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <i className="pi pi-spin pi-spinner" />
                    Buscando cotización...
                  </div>
                )}
                {dolarRate && !loadingRate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-subtle">
                      {dolarRate.nombre}: ${dolarRate.venta.toLocaleString("es-AR")}
                    </span>
                    {usdAmount > 0 && (
                      <span className="font-bold text-income">
                        ={" "}
                        {new Intl.NumberFormat("es-AR", {
                          style: "currency",
                          currency: "ARS",
                        }).format(convertUsdToArs(usdAmount, dolarRate.venta))}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            {errors.amount && <Message severity="error" text={errors.amount} />}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="new-category">
              Categoría
            </label>
            <div className="flex gap-2">
              <Dropdown
                inputId="new-category"
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
                aria-label="Crear categoría"
                onClick={() => setShowNewCatDialog(true)}
              />
            </div>
            {errors.category && <Message severity="error" text={errors.category} />}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="new-date">
              Fecha
            </label>
            <Calendar
              inputId="new-date"
              value={date}
              onChange={(e) => setDate(e.value)}
              showIcon
              className="w-full"
              dateFormat="dd/mm/yy"
              locale="es"
              maxDate={MAX_DATE}
            />
            {errors.date && <Message severity="error" text={errors.date} />}
          </div>

          {isCreditCard && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-muted" htmlFor="new-installments">
                Cuotas
              </label>
              <InputNumber
                inputId="new-installments"
                value={installments}
                onValueChange={(e) => setInstallments(e.value || 0)}
                min={0}
                className="w-full"
              />
              {errors.installments && <Message severity="error" text={errors.installments} />}
            </div>
          )}

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-muted" htmlFor="new-description">
              Descripción
            </label>
            <InputText
              id="new-description"
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
            loading={saving}
            disabled={!amount || !category || !description.trim() || !date}
          />
        </div>
      </form>

      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-tag text-brand"></i>
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
              disabled={creatingCategory}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              className="p-button-sm"
              severity="success"
              onClick={handleSaveNewCategory}
              loading={creatingCategory}
              disabled={!newCatName.trim()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2">
          <label className="text-sm font-medium text-muted" htmlFor="new-cat-name">
            Nombre de la categoría
          </label>
          <InputText
            id="new-cat-name"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Ej: Mascota, Gimnasio..."
            className="w-full"
            autoFocus
          />
          <p className="text-xs text-subtle">
            Se creará como categoría de{" "}
            <span className="font-medium text-muted">{TYPE_LABELS[type]}</span>
          </p>
        </div>
      </Dialog>
    </>
  );
};
