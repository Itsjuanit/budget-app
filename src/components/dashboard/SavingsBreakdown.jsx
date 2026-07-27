import { ProgressBar } from "primereact/progressbar";
import { formatCurrency } from "@/utils/format";

/** Detalle del ahorro del mes: % del ingreso y desglose por categoría. */
export const SavingsBreakdown = ({ totalSavings, totalIncome, savingsPercentage, byCategory }) => {
  if (totalSavings <= 0) return null;

  return (
    <div className="rounded-xl border border-ring-savings bg-tint-savings p-5 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-strong">Detalle de ahorro</h3>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted">{savingsPercentage}% del ingreso destinado a ahorro</span>
          <span className="text-savings font-medium">
            {formatCurrency(totalSavings)} / {formatCurrency(totalIncome)}
          </span>
        </div>
        <ProgressBar
          value={Math.min(savingsPercentage, 100)}
          showValue={false}
          style={{ height: "8px" }}
          color="var(--savings)"
        />
      </div>

      {byCategory.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {byCategory.map((item) => (
            <div
              key={item.value}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <div>
                <p className="text-xs text-muted">{item.category}</p>
                <p className="text-sm font-bold text-savings">{formatCurrency(item.amount)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
