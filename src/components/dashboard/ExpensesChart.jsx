import { useMemo } from "react";
import { Chart } from "primereact/chart";
import { formatCurrency } from "@/utils/format";
import { useChartTheme } from "@/hooks/useChartTheme";

/** Doughnut de gastos por categoría del mes. */
export const ExpensesChart = ({ expensesByCategory }) => {
  const chartTheme = useChartTheme();

  const { data, options } = useMemo(
    () => ({
      data: {
        labels: expensesByCategory.map((item) => item.category),
        datasets: [
          {
            data: expensesByCategory.map((item) => item.amount),
            backgroundColor: expensesByCategory.map((item) => item.color),
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
    [expensesByCategory, chartTheme]
  );

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <h3 className="text-lg font-semibold mb-4 text-strong">Gastos por categoría</h3>
      {expensesByCategory.length > 0 ? (
        <Chart type="doughnut" data={data} options={options} className="w-full" />
      ) : (
        <p className="text-muted text-sm text-center py-8">No hay gastos registrados este mes.</p>
      )}
    </div>
  );
};
