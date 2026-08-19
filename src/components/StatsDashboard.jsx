import { useEffect, useMemo, useState } from "react";
import { Chart } from "primereact/chart";
import { ProgressBar } from "primereact/progressbar";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/auth/AuthContext";
import { useTransactions } from "@/context/TransactionsProvider";
import { formatCurrency } from "@/utils/format";
import { getCategoryLabel, getCategoryColor } from "@/utils/categories";
import { formatMonth, getCurrentMonth, getLastNMonths } from "@/utils/months";
import { useChartTheme, withAlpha } from "@/hooks/useChartTheme";

const MONTHS_TO_SHOW = 12;

export const StatsDashboard = () => {
  const { user } = useAuth();
  const { customCategories } = useTransactions();
  // Los colores de los gráficos salen del tema activo (canvas no hereda CSS).
  const chartTheme = useChartTheme();

  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const months = getLastNMonths(MONTHS_TO_SHOW);

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const snapshot = await getDocs(
          query(
            collection(db, "transactions"),
            where("userId", "==", user.uid),
            where("monthYear", ">=", months[0]),
            where("monthYear", "<=", months[months.length - 1])
          )
        );
        if (cancelled) return;

        const byMonth = Object.fromEntries(
          months.map((m) => [m, { income: 0, expenses: 0, savings: 0, transactions: [] }])
        );

        snapshot.docs.forEach((docSnap) => {
          const t = docSnap.data();
          const bucket = byMonth[t.monthYear];
          if (!bucket) return;

          bucket.transactions.push(t);
          const amount = Number(t.amount) || 0;
          if (t.type === "income") bucket.income += amount;
          else if (t.type === "expense") bucket.expenses += amount;
          else if (t.type === "savings") bucket.savings += amount;
        });

        setMonthlyData({ months, byMonth });
      } catch (err) {
        if (cancelled) return;
        console.error("Error cargando estadísticas:", err);
        // Antes este error dejaba la pantalla en "no hay datos" sin explicar nada.
        setError("No se pudieron cargar las estadísticas. Revisá tu conexión e intentá de nuevo.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    if (!monthlyData) return null;
    const { months, byMonth } = monthlyData;

    const currentMonth = getCurrentMonth();
    const currentData = byMonth[currentMonth] ?? {
      income: 0,
      expenses: 0,
      savings: 0,
      transactions: [],
    };

    // El promedio excluye el mes en curso: compararlo contra un promedio que se
    // incluye a sí mismo hacía que el indicador siempre tendiera al 100%.
    const previousActiveMonths = months.filter(
      (m) =>
        m !== currentMonth &&
        (byMonth[m].income > 0 || byMonth[m].expenses > 0 || byMonth[m].savings > 0)
    );
    const avgExpenses = previousActiveMonths.length
      ? previousActiveMonths.reduce((sum, m) => sum + byMonth[m].expenses, 0) /
        previousActiveMonths.length
      : 0;

    const expenseByCategory = {};
    months.forEach((m) => {
      byMonth[m].transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          expenseByCategory[t.category] =
            (expenseByCategory[t.category] || 0) + (Number(t.amount) || 0);
        });
    });

    const top5Categories = Object.entries(expenseByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        label: getCategoryLabel(category, customCategories),
        color: getCategoryColor(category, customCategories),
        amount,
      }));

    return {
      months,
      byMonth,
      labels: months.map((m) => formatMonth(m, "MMM yy")),
      currentData,
      avgExpenses,
      hasAverage: previousActiveMonths.length > 0,
      top5Categories,
      topCategoryMax: top5Categories[0]?.amount || 1,
      total12Income: months.reduce((s, m) => s + byMonth[m].income, 0),
      total12Expenses: months.reduce((s, m) => s + byMonth[m].expenses, 0),
      total12Savings: months.reduce((s, m) => s + byMonth[m].savings, 0),
    };
  }, [monthlyData, customCategories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="pi pi-spin pi-spinner text-muted text-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-ring-expense bg-tint-expense p-6 text-center">
        <i className="pi pi-exclamation-triangle text-expense text-2xl mb-3" />
        <p className="text-body text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <p className="text-muted text-sm text-center py-12">
        No hay datos para mostrar estadísticas.
      </p>
    );
  }

  const { months, byMonth, labels, currentData, avgExpenses, hasAverage } = stats;

  const { palette } = chartTheme;

  const lineDataset = (label, key, color) => ({
    label,
    data: months.map((m) => byMonth[m][key]),
    borderColor: color,
    backgroundColor: withAlpha(color, 0.1),
    fill: true,
    tension: 0.3,
    pointRadius: 4,
    pointHoverRadius: 6,
    pointBackgroundColor: color,
    borderWidth: 2,
  });

  const evolutionData = {
    labels,
    datasets: [
      lineDataset("Ingresos", "income", palette.income),
      lineDataset("Gastos", "expenses", palette.expense),
      lineDataset("Ahorros", "savings", palette.savings),
    ],
  };

  const evolutionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: chartTheme.legend,
      tooltip: {
        ...chartTheme.tooltip,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
      },
    },
    scales: chartTheme.scales,
  };

  const barsData = {
    labels,
    datasets: [
      {
        label: "Ingresos",
        data: months.map((m) => byMonth[m].income),
        backgroundColor: palette.income,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
      {
        label: "Gastos",
        data: months.map((m) => byMonth[m].expenses),
        backgroundColor: palette.expense,
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  const barsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: chartTheme.legend,
      tooltip: {
        ...chartTheme.tooltip,
        callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` },
      },
    },
    scales: chartTheme.scales,
  };

  const distributionData = {
    labels: ["Ingresos", "Gastos", "Ahorros"],
    datasets: [
      {
        data: [stats.total12Income, stats.total12Expenses, stats.total12Savings],
        backgroundColor: [palette.income, palette.expense, palette.savings],
        borderColor: chartTheme.surface,
        hoverBorderColor: chartTheme.text,
        hoverBorderWidth: 2,
      },
    ],
  };

  const distributionOptions = {
    cutout: "65%",
    plugins: {
      legend: {
        ...chartTheme.legend,
        position: "bottom",
        labels: { ...chartTheme.legend.labels, padding: 16 },
      },
      tooltip: {
        ...chartTheme.tooltip,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : "0.0";
            return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  const currentVsAvgPercentage =
    avgExpenses > 0 ? Math.round((currentData.expenses / avgExpenses) * 100) : 0;
  const isOverAvg = currentData.expenses > avgExpenses;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="text-lg font-semibold mb-4 text-strong">Evolución mensual</h3>
          <div style={{ height: "300px" }}>
            <Chart type="line" data={evolutionData} options={evolutionOptions} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="text-lg font-semibold mb-4 text-strong">Ingresos vs Gastos</h3>
          <div style={{ height: "300px" }}>
            <Chart type="bar" data={barsData} options={barsOptions} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="text-lg font-semibold mb-4 text-strong">Distribución (12 meses)</h3>
          <Chart type="doughnut" data={distributionData} options={distributionOptions} />
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="text-lg font-semibold mb-4 text-strong">Top 5 categorías de gasto</h3>
          {stats.top5Categories.length > 0 ? (
            <div className="flex flex-col gap-4">
              {stats.top5Categories.map((cat, index) => (
                <div key={cat.category}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-subtle w-4">{index + 1}</span>
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-strong">{cat.label}</span>
                    </div>
                    <span className="text-sm font-bold text-expense">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.round((cat.amount / stats.topCategoryMax) * 100)}
                    showValue={false}
                    style={{ height: "5px" }}
                    color={cat.color}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm text-center py-8">No hay gastos registrados.</p>
          )}
        </div>

        <div className="rounded-xl border border-border bg-surface-raised p-5">
          <h3 className="text-lg font-semibold mb-4 text-strong">Gasto actual vs promedio</h3>
          {hasAverage ? (
            <div className="flex flex-col items-center justify-center py-4 gap-6">
              <div
                className={`w-32 h-32 rounded-full border-8 flex items-center justify-center ${
                  isOverAvg ? "border-ring-expense" : "border-ring-income"
                }`}
              >
                <div className="text-center">
                  <p className={`text-2xl font-bold ${isOverAvg ? "text-expense" : "text-income"}`}>
                    {currentVsAvgPercentage}%
                  </p>
                  <p className="text-subtle text-xs">del promedio</p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3">
                <div className="flex justify-between items-center rounded-lg border border-border bg-surface px-4 py-3">
                  <span className="text-sm text-muted">Mes actual</span>
                  <span
                    className={`text-sm font-bold ${isOverAvg ? "text-expense" : "text-income"}`}
                  >
                    {formatCurrency(currentData.expenses)}
                  </span>
                </div>
                <div className="flex justify-between items-center rounded-lg border border-border bg-surface px-4 py-3">
                  <span className="text-sm text-muted">Promedio de meses anteriores</span>
                  <span className="text-sm font-bold text-body">{formatCurrency(avgExpenses)}</span>
                </div>
                <div className="flex justify-between items-center rounded-lg border border-border bg-surface px-4 py-3">
                  <span className="text-sm text-muted">Diferencia</span>
                  <span
                    className={`text-sm font-bold ${isOverAvg ? "text-expense" : "text-income"}`}
                  >
                    {isOverAvg ? "+" : "-"}
                    {formatCurrency(Math.abs(currentData.expenses - avgExpenses))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted text-sm text-center py-8">
              Todavía no hay meses anteriores para comparar.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
