import { useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Calendar } from "primereact/calendar";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { ProgressBar } from "primereact/progressbar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useTransactions } from "@/context/TransactionsProvider";
import { formatCurrency } from "@/utils/format";
import { monthKeyToDate } from "@/utils/months";
import { ConfirmDialog } from "../ConfirmDialog";

const formatDate = (value) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy");
};

const monthLabel = (monthYear) => {
  const label = format(monthKeyToDate(monthYear), "MMMM yyyy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const ProjectDetail = ({ project, onHide }) => {
  const { getProjectExpenses, addProjectExpense, deleteProjectExpense } = useTransactions();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(null);
  const [date, setDate] = useState(new Date());
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useRef(null);

  if (!project) return null;

  const expenses = getProjectExpenses(project.id);
  const canSubmit = Boolean(description.trim() && amount && amount > 0 && date);

  const handleAdd = async () => {
    if (!canSubmit || saving) return;

    setSaving(true);
    try {
      await addProjectExpense(project.id, { description, amount, date });
      setDescription("");
      setAmount(null);
      setDate(new Date());
    } catch (error) {
      console.error("Error agregando gasto al proyecto:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo agregar el gasto.",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProjectExpense(toDelete.id);
      setToDelete(null);
    } catch (error) {
      console.error("Error eliminando gasto del proyecto:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar el gasto.",
        life: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />

      <Dialog
        header={
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <i className="pi pi-folder-open text-brand"></i>
              <span className="truncate">{project.name}</span>
            </div>
            <p className="text-xs text-muted font-normal mt-0.5">
              {monthLabel(project.monthYear)}
              {project.includeInBalance
                ? " · impacta en el balance"
                : " · no impacta en el balance"}
            </p>
          </div>
        }
        visible={Boolean(project)}
        onHide={onHide}
        style={{ width: "94vw", maxWidth: "620px" }}
        breakpoints={{ "640px": "96vw" }}
      >
        <div className="flex flex-col gap-5 pt-1">
          {/* Resumen: total y, si hay presupuesto, cuánto queda */}
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-strong">
                {formatCurrency(project.spent)}
              </span>
              {project.hasPlan && (
                <span className="text-sm text-muted">de {formatCurrency(project.planned)}</span>
              )}
            </div>

            {project.hasPlan && (
              <div className="mt-3">
                <ProgressBar
                  value={Math.min(project.progress, 100)}
                  showValue={false}
                  style={{ height: "6px" }}
                  color={project.overBudget ? "var(--expense)" : "var(--income)"}
                />
                <p
                  className={`text-xs mt-1.5 ${
                    project.overBudget ? "text-expense font-medium" : "text-subtle"
                  }`}
                >
                  {project.overBudget
                    ? `Te pasaste ${formatCurrency(Math.abs(project.remaining))}`
                    : `Te quedan ${formatCurrency(project.remaining)}`}
                </p>
              </div>
            )}
          </div>

          {/* Alta rápida de gastos */}
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-strong">Agregar gasto</h4>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <InputText
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Ej: Hotel, pasajes..."
                className="w-full"
                aria-label="Descripción del gasto"
              />
              <InputNumber
                value={amount}
                onValueChange={(e) => setAmount(e.value)}
                mode="currency"
                currency="ARS"
                locale="es-AR"
                placeholder="$ 0"
                className="sm:w-36"
                aria-label="Monto del gasto"
              />
              <Calendar
                value={date}
                onChange={(e) => setDate(e.value)}
                dateFormat="dd/mm/yy"
                locale="es"
                showIcon
                className="sm:w-44"
                aria-label="Fecha del gasto"
              />
            </div>
            <Button
              label="Agregar"
              icon="pi pi-plus"
              className="p-button-sm self-start"
              severity="success"
              onClick={handleAdd}
              loading={saving}
              disabled={!canSubmit}
            />
          </div>

          {/* Listado */}
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-strong">
              Gastos{" "}
              {expenses.length > 0 && <span className="text-muted">({expenses.length})</span>}
            </h4>

            {expenses.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[38vh] overflow-y-auto pr-1">
                {expenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-strong truncate">{expense.description}</p>
                      <p className="text-xs text-muted">{formatDate(expense.date)}</p>
                    </div>
                    <span className="text-sm font-bold text-expense whitespace-nowrap flex-shrink-0">
                      {formatCurrency(expense.amount)}
                    </span>
                    <Button
                      icon="pi pi-trash"
                      className="p-button-rounded p-button-text p-button-sm flex-shrink-0"
                      severity="danger"
                      aria-label={`Eliminar ${expense.description}`}
                      onClick={() => setToDelete(expense)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-6">
                Todavía no cargaste gastos en este proyecto.
              </p>
            )}
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        visible={Boolean(toDelete)}
        loading={deleting}
        onHide={() => setToDelete(null)}
        onConfirm={handleDelete}
        message={`¿Eliminar el gasto "${toDelete?.description}" de este proyecto?`}
      />
    </>
  );
};
