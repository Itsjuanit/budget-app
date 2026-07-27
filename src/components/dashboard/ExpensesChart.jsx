import { useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import { SelectButton } from "primereact/selectbutton";
import { formatCurrency } from "@/utils/format";
import { useChartTheme } from "@/hooks/useChartTheme";

const VIEW_OPTIONS = [
  { label: "Categoría", value: "category" },
  { label: "Grupo", value: "group" },
];

/**
 * Doughnut de gastos del mes, con dos niveles de detalle.
 *
 * Con 25 categorías el gráfico por categoría se vuelve ilegible; la vista por
 * grupo junta las relacionadas (Spotify + Netflix + Disney+ → Suscripciones)
 * sin tocar cómo se cargan los movimientos.
 */
export const ExpensesChart = ({ expensesByCategory, expensesByGroup }) => {
  const chartTheme = useChartTheme();
  const [view, setView] = useState("category");

  const items = view === "group" ? expensesByGroup : expensesByCategory;

  const { data, options } = useMemo(
    () => ({
      data: {
        labels: items.map((item) => item.category),
        datasets: [
          {
            data: items.map((item) => item.amount),
            backgroundColor: items.map((item) => item.color),
            borderColor: chartTheme.surface,
            hoverBorderColor: chartTheme.text,
            hoverBorderWidth: 2,
          },
        ],
      },
      options: {
        cutout: "60%",
        plugins: {
          legend: {
            ...chartTheme.legend,
            position: "bottom",
            labels: { ...chartTheme.legend.labels, padding: 16 },
          },
          tooltip: {
            ...chartTheme.tooltip,
            callbacks: {
              label: (context) => {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : "0.0";
                return ` ${context.label}: ${formatCurrency(context.parsed)} (${percentage}%)`;
              },
            },
          },
        },
      },
    }),
    [items, chartTheme]
  );

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-strong">Gastos por categoría</h3>
        <SelectButton
          value={view}
          options={VIEW_OPTIONS}
          onChange={(e) => e.value && setView(e.value)}
          className="text-xs"
          aria-label="Nivel de detalle del gráfico"
        />
      </div>

      {items.length > 0 ? (
        <Chart type="doughnut" data={data} options={options} className="w-full" />
      ) : (
        <p className="text-muted text-sm text-center py-8">No hay gastos registrados este mes.</p>
      )}
    </div>
  );
};
