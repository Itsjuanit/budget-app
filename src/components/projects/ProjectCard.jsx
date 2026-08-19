import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { ProgressBar } from "primereact/progressbar";
import { formatCurrency } from "@/utils/format";
import { formatMonth } from "@/utils/months";

const progressColor = (project) => {
  if (project.overBudget) return "var(--expense)";
  if (project.progress >= 80) return "var(--warning)";
  return "var(--income)";
};

export const ProjectCard = ({ project, onOpen, onEdit, onDelete, onToggleBalance, busy }) => {
  const checkboxId = `include-${project.id}`;

  return (
    <div className="rounded-xl border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="btn-plain text-left min-w-0 flex-1 group"
          onClick={() => onOpen(project)}
        >
          <p className="text-strong font-semibold truncate group-hover:text-brand transition-colors">
            {project.name}
          </p>
          <p className="text-muted text-xs mt-0.5">{formatMonth(project.monthYear)}</p>
        </button>

        <div className="flex gap-1 flex-shrink-0">
          <Button
            icon="pi pi-pencil"
            className="p-button-rounded p-button-text p-button-sm"
            tooltip="Editar proyecto"
            tooltipOptions={{ position: "top" }}
            aria-label={`Editar ${project.name}`}
            onClick={() => onEdit(project)}
          />
          <Button
            icon="pi pi-trash"
            className="p-button-rounded p-button-text p-button-sm"
            tooltip="Eliminar proyecto"
            tooltipOptions={{ position: "top" }}
            aria-label={`Eliminar ${project.name}`}
            severity="danger"
            onClick={() => onDelete(project)}
          />
        </div>
      </div>

      {/* Gastado contra lo presupuestado. El presupuesto es opcional: sin él
          sólo se muestra el total acumulado, sin barra ni porcentaje. */}
      <div>
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-lg font-bold text-strong">{formatCurrency(project.spent)}</span>
          {project.hasPlan && (
            <span className="text-xs text-muted">de {formatCurrency(project.planned)}</span>
          )}
        </div>

        {project.hasPlan && (
          <>
            <ProgressBar
              value={Math.min(project.progress, 100)}
              showValue={false}
              style={{ height: "6px" }}
              color={progressColor(project)}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-subtle">{project.progress}% usado</span>
              <span
                className={`text-xs ${
                  project.overBudget ? "text-expense font-medium" : "text-subtle"
                }`}
              >
                {project.overBudget
                  ? `Excedido ${formatCurrency(Math.abs(project.remaining))}`
                  : `Quedan ${formatCurrency(project.remaining)}`}
              </span>
            </div>
          </>
        )}
      </div>

      {/* El checkbox decide si el total real entra al balance del mes asignado.
          Se puede cambiar en cualquier momento, incluso de meses ya pasados. */}
      <label
        htmlFor={checkboxId}
        className="flex items-center gap-2 pt-3 border-t border-border cursor-pointer select-none"
      >
        <Checkbox
          inputId={checkboxId}
          checked={Boolean(project.includeInBalance)}
          onChange={(e) => onToggleBalance(project, e.checked)}
          disabled={busy}
        />
        <span className="text-xs text-muted">
          Impacta en el balance de {formatMonth(project.monthYear)}
        </span>
      </label>
    </div>
  );
};
