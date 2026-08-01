import { ProgressBar } from "primereact/progressbar";
import { CalendarClock } from "lucide-react";
import { formatCurrency } from "@/utils/format";

/**
 * Proyección de cierre del mes en curso.
 *
 * El README documentaba esta pantalla desde hacía tiempo (con un
 * MonthProjection.jsx que nunca existió); el cálculo vive en useMonthProjection.
 */
export const MonthProjection = ({ projection }) => {
  if (!projection) return null;

  const { elapsedDays, totalDays, remainingDays, dailyPace, projectedTotal, safeDailyBudget } =
    projection;

  const monthProgress = Math.round((elapsedDays / totalDays) * 100);

  return (
    <div
      className={`rounded-xl border p-5 mb-6 ${
        projection.willOverspend
          ? "border-ring-expense bg-tint-expense"
          : "border-ring-income bg-tint-income"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock
          className={`w-5 h-5 flex-shrink-0 ${
            projection.willOverspend ? "text-expense" : "text-income"
          }`}
        />
        <h3 className="text-lg font-semibold text-strong">Proyección de fin de mes</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-muted text-xs mb-1">Vas a cerrar en</p>
          <p
            className={`text-xl font-bold ${
              projection.willOverspend ? "text-expense" : "text-strong"
            }`}
          >
            {formatCurrency(projectedTotal)}
          </p>
          <p className="text-subtle text-xs mt-0.5">a {formatCurrency(dailyPace)} por día</p>
        </div>

        <div>
          <p className="text-muted text-xs mb-1">Podés gastar por día</p>
          <p className="text-xl font-bold text-strong">{formatCurrency(safeDailyBudget)}</p>
          <p className="text-subtle text-xs mt-0.5">
            {remainingDays > 0 ? `en los ${remainingDays} días que quedan` : "último día del mes"}
          </p>
        </div>

        <div>
          <p className="text-muted text-xs mb-1">Avance del mes</p>
          <p className="text-xl font-bold text-strong">{monthProgress}%</p>
          <p className="text-subtle text-xs mt-0.5">
            día {elapsedDays} de {totalDays}
          </p>
        </div>
      </div>

      <ProgressBar
        value={monthProgress}
        showValue={false}
        style={{ height: "5px" }}
        color={projection.willOverspend ? "var(--expense)" : "var(--income)"}
      />

      <p
        className={`text-xs mt-3 ${
          projection.willOverspend ? "text-expense font-medium" : "text-muted"
        }`}
      >
        {projection.willOverspend
          ? `A este ritmo te pasás por ${formatCurrency(projection.projectedOverspend)}. Bajá a ${formatCurrency(safeDailyBudget)} por día para llegar.`
          : "A este ritmo cerrás el mes en verde."}
      </p>
    </div>
  );
};
