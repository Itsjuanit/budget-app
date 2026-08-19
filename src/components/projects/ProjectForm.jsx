import { useEffect, useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Message } from "primereact/message";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getCurrentMonth, monthKeyToDate, addMonths, generateMonthRange } from "@/utils/months";

/**
 * Meses elegibles: dos años para atrás y uno para adelante desde hoy.
 * El proyecto puede apuntar a un mes pasado (un viaje que ya hiciste) o futuro
 * (uno que estás planeando), así que el rango va para los dos lados.
 */
const buildMonthOptions = () => {
  const current = getCurrentMonth();
  return generateMonthRange(addMonths(current, -24), addMonths(current, 12))
    .reverse()
    .map((monthYear) => {
      const label = format(monthKeyToDate(monthYear), "MMMM yyyy", { locale: es });
      return { value: monthYear, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
};

const MONTH_OPTIONS = buildMonthOptions();

export const ProjectForm = ({ visible, project, onHide, onSubmit }) => {
  const isEdit = Boolean(project);

  const [name, setName] = useState("");
  const [monthYear, setMonthYear] = useState(getCurrentMonth());
  const [plannedAmount, setPlannedAmount] = useState(null);
  const [includeInBalance, setIncludeInBalance] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Al abrir se parte de los valores del proyecto (o de los de un proyecto nuevo).
  useEffect(() => {
    if (!visible) return;
    setName(project?.name || "");
    setMonthYear(project?.monthYear || getCurrentMonth());
    setPlannedAmount(project?.plannedAmount ?? null);
    setIncludeInBalance(project ? Boolean(project.includeInBalance) : true);
    setError("");
  }, [visible, project]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Poné un nombre al proyecto.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSubmit({
        name: name.trim(),
        monthYear,
        plannedAmount: plannedAmount || null,
        includeInBalance,
      });
      onHide();
    } catch (submitError) {
      console.error("Error guardando el proyecto:", submitError);
      setError("No se pudo guardar el proyecto. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      header={
        <div className="flex items-center gap-2">
          <i className="pi pi-folder text-brand"></i>
          <span>{isEdit ? "Editar proyecto" : "Nuevo proyecto"}</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: "92vw", maxWidth: "460px" }}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            label="Cancelar"
            icon="pi pi-times"
            className="p-button-outlined p-button-sm"
            severity="secondary"
            onClick={onHide}
            disabled={saving}
          />
          <Button
            label={isEdit ? "Guardar" : "Crear"}
            icon="pi pi-check"
            className="p-button-sm"
            severity="success"
            onClick={handleSubmit}
            loading={saving}
            disabled={!name.trim()}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="project-name">
            Nombre
          </label>
          <InputText
            id="project-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ej: Viaje agosto, Mudanza..."
            className="w-full"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="project-month">
            Mes asignado
          </label>
          <Dropdown
            inputId="project-month"
            value={monthYear}
            options={MONTH_OPTIONS}
            onChange={(e) => setMonthYear(e.value)}
            className="w-full"
            filter
          />
          <p className="text-xs text-subtle">
            Es el mes cuyo balance puede afectar, sin importar cuándo cargues cada gasto.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-muted" htmlFor="project-planned">
            Presupuesto <span className="text-subtle font-normal">(opcional)</span>
          </label>
          <InputNumber
            inputId="project-planned"
            value={plannedAmount}
            onValueChange={(e) => setPlannedAmount(e.value)}
            mode="currency"
            currency="ARS"
            locale="es-AR"
            placeholder="$ 0"
            className="w-full"
          />
          <p className="text-xs text-subtle">
            Sólo de referencia, para ver cuánto llevás gastado contra lo que planeabas.
          </p>
        </div>

        <label
          htmlFor="project-include"
          className="flex items-start gap-2 cursor-pointer select-none rounded-lg border border-border p-3"
        >
          <Checkbox
            inputId="project-include"
            checked={includeInBalance}
            onChange={(e) => setIncludeInBalance(e.checked)}
          />
          <span className="text-xs text-muted">
            <span className="text-strong font-medium block mb-0.5">Impacta en el balance</span>
            Lo gastado se descuenta del disponible del mes asignado. Lo podés cambiar cuando
            quieras.
          </span>
        </label>

        {error && <Message severity="error" text={error} />}
      </div>
    </Dialog>
  );
};
