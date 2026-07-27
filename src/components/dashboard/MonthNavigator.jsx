import { Button } from "primereact/button";
import { monthKeyToDate } from "@/utils/months";

/** Navegador de mes: ← [Julio 2026] → [Hoy] */
export const MonthNavigator = ({
  month,
  canGoNext,
  isCurrentMonth,
  onPrevious,
  onNext,
  onToday,
}) => (
  <div className="flex items-center gap-2">
    <Button
      icon="pi pi-chevron-left"
      className="p-button-rounded p-button-text p-button-sm"
      onClick={onPrevious}
      aria-label="Mes anterior"
      tooltip="Mes anterior"
      tooltipOptions={{ position: "top" }}
    />
    <span className="text-strong font-medium min-w-[150px] text-center capitalize">
      {monthKeyToDate(month).toLocaleDateString("es-AR", { month: "long", year: "numeric" })}
    </span>
    <Button
      icon="pi pi-chevron-right"
      className="p-button-rounded p-button-text p-button-sm"
      onClick={onNext}
      disabled={!canGoNext}
      aria-label="Mes siguiente"
      tooltip={canGoNext ? "Mes siguiente" : "No se puede avanzar más"}
      tooltipOptions={{ position: "top" }}
    />
    {!isCurrentMonth && (
      <Button label="Hoy" className="p-button-text p-button-sm text-brand" onClick={onToday} />
    )}
  </div>
);
