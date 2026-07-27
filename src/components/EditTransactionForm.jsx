import { useRef, useState } from "react";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { Toast } from "primereact/toast";
import { useTransactions } from "@/context/TransactionsProvider";
import { getCategoriesForType } from "@/utils/categories";
import { toMonthKey } from "@/utils/months";

const TYPE_OPTIONS = [
  { label: "Ingreso", value: "income" },
  { label: "Gasto", value: "expense" },
  { label: "Ahorro", value: "savings" },
];

const MAX_DATE = new Date(new Date().getFullYear(), new Date().getMonth() + 3, 0);

export const EditTransactionForm = ({ transaction, onClose }) => {
  const { updateTransaction, customCategories } = useTransactions();

  const [type, setType] = useState(transaction?.type || "expense");
  const [amount, setAmount] = useState(transaction?.amount ?? null);
  const [category, setCategory] = useState(transaction?.category || "");
  const [description, setDescription] = useState(transaction?.description || "");
  const [date, setDate] = useState(transaction ? new Date(transaction.date) : new Date());
  const [installments, setInstallments] = useState(transaction?.installments || 0);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  // Incluye las categorías personalizadas y soporta los tres tipos: antes "savings"
  // no estaba contemplado y el desplegable quedaba vacío al elegir "Ahorro".
  const categoryOptions = getCategoriesForType(type, customCategories).map((c) => ({
    label: c.label,
    value: c.value,
  }));

  const isCreditCard = category === "tarjeta-credito";

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
    const updatedTransaction = {
      ...transaction,
      type,
      amount,
      category,
      description: description.trim(),
      date: date.toISOString(),
      monthYear: toMonthKey(date),
      // Si la transacción deja de ser de tarjeta, las cuotas se limpian en vez de
      // quedar arrastradas del valor anterior.
      installments: isCreditCard ? installments : 0,
      installmentsRemaining: isCreditCard ? installments : 0,
    };

    try {
      await updateTransaction(updatedTransaction);
      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción actualizada correctamente.",
        life: 3000,
      });
      onClose();
    } catch (error) {
      console.error("Error actualizando la transacción:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "Hubo un problema al actualizar la transacción.",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Toast ref={toast} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="edit-type">
            Tipo
          </label>
          <Dropdown
            inputId="edit-type"
            value={type}
            options={TYPE_OPTIONS}
            onChange={(e) => {
              setType(e.value);
              setCategory("");
            }}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="edit-amount">
            Monto
          </label>
          <InputNumber
            inputId="edit-amount"
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
          <label className="text-sm font-medium text-muted" htmlFor="edit-category">
            Categoría
          </label>
          <Dropdown
            inputId="edit-category"
            value={category}
            options={categoryOptions}
            onChange={(e) => setCategory(e.value)}
            className="w-full"
            placeholder="Selecciona una categoría"
          />
          {errors.category && <Message severity="error" text={errors.category} />}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="edit-date">
            Fecha
          </label>
          <Calendar
            inputId="edit-date"
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

        <div className="flex flex-col gap-2 sm:col-span-2">
          <label className="text-sm font-medium text-muted" htmlFor="edit-description">
            Descripción
          </label>
          <InputText
            id="edit-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full"
            placeholder="Ingrese una descripción"
          />
          {errors.description && <Message severity="error" text={errors.description} />}
        </div>

        {isCreditCard && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted" htmlFor="edit-installments">
              Cuotas
            </label>
            <InputNumber
              inputId="edit-installments"
              value={installments}
              onValueChange={(e) => setInstallments(e.value || 0)}
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
          disabled={saving}
        />
        <Button
          type="submit"
          label="Guardar cambios"
          icon="pi pi-check"
          className="p-button-sm"
          severity="success"
          loading={saving}
          disabled={!amount || !category || !description.trim() || !date}
        />
      </div>
    </form>
  );
};
