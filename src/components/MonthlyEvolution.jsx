import React, { useState, useEffect } from "react";
import { Chart } from "primereact/chart";
import { formatCurrency } from "../utils/format";
import { db } from "@/firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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

/**
 * Convierte "YYYY-MM" a label legible: "Feb 26", "Ene 26"
 */
const formatMonthLabel = (monthYear) => {
  const [year, month] = monthYear.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  const label = format(date, "MMM yy", { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const MonthlyEvolution = () => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvolutionData = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;

      const last12 = getLastNMonths(12);

      try {
        // Una sola query para los últimos 12 meses
        const transactionsRef = query(
          collection(db, "transactions"),
          where("userId", "==", user.uid),
          where("monthYear", ">=", last12[0]),
          where("monthYear", "<=", last12[last12.length - 1])
        );

        const snapshot = await getDocs(transactionsRef);

        // Agrupar por mes
        const monthlyData = {};
        last12.forEach((m) => {
          monthlyData[m] = { income: 0, expenses: 0, savings: 0 };
        });

        snapshot.docs.forEach((doc) => {
          const t = doc.data();
          if (!monthlyData[t.monthYear]) return;

          if (t.type === "income") {
            monthlyData[t.monthYear].income += t.amount;
          } else if (t.type === "expense") {
            monthlyData[t.monthYear].expenses += t.amount;
          } else if (t.type === "savings") {
            monthlyData[t.monthYear].savings += t.amount;
          }
        });

        const labels = last12.map(formatMonthLabel);
        const incomeData = last12.map((m) => monthlyData[m].income);
        const expensesData = last12.map((m) => monthlyData[m].expenses);
        const savingsData = last12.map((m) => monthlyData[m].savings);

        setChartData({
          labels,
          datasets: [
            {
              label: "Ingresos",
              data: incomeData,
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
              data: expensesData,
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
              data: savingsData,
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
        });
      } catch (error) {
        console.error("Error cargando evolución mensual:", error);
      } finally {
        setLoading(false);
      }
    };

    loadEvolutionData();
  }, []);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
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
        backgroundColor: "#1e1e3a",
        titleColor: "#e2e8f0",
        bodyColor: "#e2e8f0",
        borderColor: "#2a2a4a",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) =>
            ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(42, 42, 74, 0.5)",
        },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
        },
      },
      y: {
        grid: {
          color: "rgba(42, 42, 74, 0.5)",
        },
        ticks: {
          color: "#94a3b8",
          font: { size: 11 },
          callback: (value) => formatCurrency(value),
        },
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5 mb-6">
        <div className="flex items-center justify-center py-12">
          <i className="pi pi-spin pi-spinner text-[#94a3b8] text-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2a2a4a] bg-[#1e1e3a]/50 p-5 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-white">
        Evolución mensual
      </h3>

      {chartData ? (
        <div style={{ height: "350px" }}>
          <Chart type="line" data={chartData} options={chartOptions} />
        </div>
      ) : (
        <p className="text-[#94a3b8] text-sm text-center py-8">
          No hay datos suficientes para mostrar la evolución.
        </p>
      )}
    </div>
  );
};