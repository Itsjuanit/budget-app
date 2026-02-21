import React, { useState, useEffect } from "react";
import { Chart } from "primereact/chart";
import { ProgressBar } from "primereact/progressbar";
import { formatCurrency } from "../utils/format";
import { db } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { categories as defaultCategories } from "../utils/categories";

/**
 * Genera un array de los últimos N meses en formato "YYYY-MM".
 */
const getLastNMonths = (n) => {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
};

const formatMonthLabel = (monthYear) => {
  const [year, month] = monthYear.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const label = format(date, "MMM yy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getCategoryLabel = (value) => {
  const allCategories = [
    ...defaultCategories.income,
    ...defaultCategories.savings,
    ...defaultCategories.expense,
  ];
  return allCategories.find((c) => c.value === value)?.label || value;
};

const getCategoryColor = (value) => {
  const cat = defaultCategories.expense.find((c) => c.value === value);
  return cat?.color || "#94a3b8";
};

// Opciones comunes para tooltips
const commonTooltip = {
  backgroundColor: "#1e1e3a",
  titleColor: "#e2e8f0",
  bodyColor: "#e2e8f0",
  borderColor: "#2a2a4a",
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
};

export const StatsDashboard = () => {
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const last12 = getLastNMonths(12);

      try {
        const transactionsRef = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          where("monthYear", ">=", last12[0]),
          where("monthYear", "<=", last12[last12.length - 1])
        );

        const snapshot = await getDocs(transactionsRef);

        // Agrupar por mes
        const byMonth = {};
        last12.forEach((m) => {
          byMonth[m] = { income: 0, expenses: 0, savings: 0, transactions: [] };
        });

        snapshot.docs.forEach((doc) => {
          const t = doc.data();
          if (!byMonth[t.monthYear]) return;

          byMonth[t.monthYear].transactions.push(t);

          if (t.type === "income") byMonth[t.monthYear].income += t.amount;
          else if (t.type === "expense") byMonth[t.monthYear].expenses += t.amount;
          else if (t.type === "savings") byMonth[t.monthYear].savings += t.amount;
        });

        setMonthlyData({ months: last12, byMonth });
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="pi pi-spin pi-spinner text-[#94a3b8] text-3xl" />
      </div>
    );
  }

  if (!monthlyData) {
    return (
      <p className="text-[#94a3b8] text-sm text-center py-12">
        No hay datos para mostrar estadísticas.
      </p>
    );
  }

  const { months, byMonth } = monthlyData;
  const labels = months.map(formatMonthLabel);

  // --- Datos derivados ---
  const currentMonth = months[months.length - 1];
  const currentData = byMonth[currentMonth];

  // Meses con actividad (para promedios)
  const activeMonths = months.filter(
    (m) => byMonth[m].income > 0 || byMonth[m].expenses > 0 || byMonth[m].savings > 0
  );
  const activeCount = Math.max(activeMonths.length, 1);

  const avgExpenses = activeMonths.reduce((sum, m) => sum + byMonth[m].expenses, 0) / activeCount;

  // Top 5 categorías de gasto (acumulado últimos 12 meses)
  const expenseByCategory = {};
  months.forEach((m) => {
    byMonth[m].transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
      });
  });

  const top5Categories = Object.entries(expenseByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, amount]) => ({
      category,
      label: getCategoryLabel(category),
      color: getCategoryColor(category),
      amount,
    }));

  const topCategoryMax = top5Categories.length > 0 ? top5Categories[0].amount : 1;

  // Totales para doughnut
  const total12Income = months.reduce((s, m) => s + byMonth[m].income, 0);
  const total12Expenses = months.reduce((s, m) => s + byMonth[m].expenses, 0);
  const total12Savings = months.reduce((s, m) => s + byMonth[m].savings, 0);

  // ============================================================
  // 1. EVOLUCIÓN MENSUAL (líneas)
  // ============================================================
  const evolutionData = {
    labels,
    datasets: [
      {
        label: "Ingresos",
        data: months.map((m) => byMonth[m].income),
        borderColor: "#34d399",
        backgroundColor: "rgba(52, 211, 153, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#34d399",
        borderWidth: 2,
      },
      {
        label: "Gastos",
        data: months.map((m) => byMonth[m].expenses),
        borderColor: "#f87171",
        backgroundColor: "rgba(248, 113, 113, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#f87171",
        borderWidth: 2,
      },
      {
        label: "Ahorros",
        data: months.map((m) => byMonth[m].savings),
        borderColor: "#60a5fa",
        backgroundColor: "rgba(96, 165, 250, 0.1)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "#60a5fa",
        borderWidth: 2,
      },
    ],
  };

  const evolutionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#e2e8f0",
          padding: 20,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
      tooltip: {
        ...commonTooltip,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(42, 42, 74, 0.5)" },
        ticks: { color: "#94a3b8", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(42, 42, 74, 0.5)" },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          callback: (v) => formatCurrency(v),
        },
        beginAtZero: true,
      },
    },
  };

  // ============================================================
  // 2. BARRAS COMPARATIVAS
  // ============================================================
  const barsData = {
    labels,
    datasets: [
      {
        label: "Ingresos",
        data: months.map((m) => byMonth[m].income),
        backgroundColor: "#34d399",
        borderRadius: 4,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
      {
        label: "Gastos",
        data: months.map((m) => byMonth[m].expenses),
        backgroundColor: "#f87171",
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
      legend: {
        display: true,
        position: "top",
        labels: {
          color: "#e2e8f0",
          padding: 20,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
      tooltip: {
        ...commonTooltip,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(42, 42, 74, 0.5)" },
        ticks: { color: "#94a3b8", font: { size: 11 } },
      },
      y: {
        grid: { color: "rgba(42, 42, 74, 0.5)" },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          callback: (v) => formatCurrency(v),
        },
        beginAtZero: true,
      },
    },
  };

  // ============================================================
  // 3. DOUGHNUT DISTRIBUCIÓN
  // ============================================================
  const distributionData = {
    labels: ["Ingresos", "Gastos", "Ahorros"],
    datasets: [
      {
        data: [total12Income, total12Expenses, total12Savings],
        backgroundColor: ["#34d399", "#f87171", "#60a5fa"],
        borderColor: "transparent",
        hoverBorderColor: "#ffffff33",
        hoverBorderWidth: 2,
      },
    ],
  };

  const distributionOptions = {
    cutout: "65%",
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#e2e8f0",
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12 },
        },
      },
      tooltip: {
        ...commonTooltip,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
            return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
          },
        },
      },
    },
  };

  // ============================================================
  // 4. PROMEDIO VS MES ACTUAL
  // ============================================================
  const currentVsAvgPercentage =
    avgExpenses > 0 ? Math.round((currentData.expenses / avgExpenses) * 100) : 0;
  const isOverAvg = currentData.expenses > avgExpenses;

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold text-white">Estadísticas</h2>

      {/* Fila 1: Evolución + Barras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolución mensual */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">Evolución mensual</h3>
          <div style={{ height: "300px" }}>
            <Chart type="line" data={evolutionData} options={evolutionOptions} />
          </div>
        </div>

        {/* Barras comparativas */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">Ingresos vs Gastos</h3>
          <div style={{ height: "300px" }}>
            <Chart type="bar" data={barsData} options={barsOptions} />
          </div>
        </div>
      </div>

      {/* Fila 2: Doughnut + Top 5 + Promedio */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">Distribución (12 meses)</h3>
          <Chart type="doughnut" data={distributionData} options={distributionOptions} />
        </div>

        {/* Top 5 categorías */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">Top 5 categorías de gasto</h3>
          {top5Categories.length > 0 ? (
            <div className="flex flex-col gap-4">
              {top5Categories.map((cat, index) => (
                <div key={cat.category}>
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#64748b] w-4">{index + 1}</span>
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-white">{cat.label}</span>
                    </div>
                    <span className="text-sm font-bold text-red-400">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.round((cat.amount / topCategoryMax) * 100)}
                    showValue={false}
                    style={{ height: "5px" }}
                    color={cat.color}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#94a3b8] text-sm text-center py-8">No hay gastos registrados.</p>
          )}
        </div>

        {/* Promedio vs mes actual */}
        <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5">
          <h3 className="text-lg font-semibold mb-4 text-white">Gasto actual vs promedio</h3>
          <div className="flex flex-col items-center justify-center py-4 gap-6">
            {/* Indicador circular simulado */}
            <div className="relative">
              <div
                className={`w-32 h-32 rounded-full border-8 flex items-center justify-center ${
                  isOverAvg ? "border-red-500/40" : "border-emerald-500/40"
                }`}
              >
                <div className="text-center">
                  <p
                    className={`text-2xl font-bold ${
                      isOverAvg ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {currentVsAvgPercentage}%
                  </p>
                  <p className="text-[#64748b] text-xs">del promedio</p>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <div className="flex justify-between items-center rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] px-4 py-3">
                <span className="text-sm text-[#94a3b8]">Mes actual</span>
                <span
                  className={`text-sm font-bold ${isOverAvg ? "text-red-400" : "text-emerald-400"}`}
                >
                  {formatCurrency(currentData.expenses)}
                </span>
              </div>
              <div className="flex justify-between items-center rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] px-4 py-3">
                <span className="text-sm text-[#94a3b8]">Promedio mensual</span>
                <span className="text-sm font-bold text-[#e2e8f0]">
                  {formatCurrency(avgExpenses)}
                </span>
              </div>
              <div className="flex justify-between items-center rounded-lg border border-[#2a2a4a] bg-[#1e1e3a] px-4 py-3">
                <span className="text-sm text-[#94a3b8]">Diferencia</span>
                <span
                  className={`text-sm font-bold ${isOverAvg ? "text-red-400" : "text-emerald-400"}`}
                >
                  {isOverAvg ? "+" : "-"}
                  {formatCurrency(Math.abs(currentData.expenses - avgExpenses))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
