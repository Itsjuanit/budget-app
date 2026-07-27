import { useMemo } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { formatCurrency } from "@/utils/format";

/** Lee el valor computado de una variable CSS del tema activo. */
const readToken = (name, fallback) => {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

/**
 * Opciones de Chart.js alineadas al tema activo.
 *
 * Chart.js dibuja sobre canvas, así que no hereda CSS: los colores hay que
 * pasárselos explícitamente. El hook depende de `theme` para que al cambiarlo
 * se genere un objeto nuevo y los gráficos se repinten.
 */
export const useChartTheme = () => {
  const { theme } = useTheme();

  return useMemo(() => {
    const text = readToken("--text", "#e2e8f0");
    const muted = readToken("--text-muted", "#94a3b8");
    const surface = readToken("--surface", "#1e1e3a");
    const border = readToken("--border", "#2a2a4a");
    const grid = readToken("--grid-line", "#2a2a4a80");

    const palette = {
      income: readToken("--income", "#34d399"),
      expense: readToken("--expense", "#f87171"),
      savings: readToken("--savings", "#60a5fa"),
    };

    const tooltip = {
      backgroundColor: surface,
      titleColor: text,
      bodyColor: text,
      borderColor: border,
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
    };

    const legend = {
      display: true,
      position: "top",
      labels: {
        color: text,
        padding: 20,
        usePointStyle: true,
        pointStyleWidth: 10,
        font: { size: 12 },
      },
    };

    const scales = {
      x: {
        grid: { color: grid },
        ticks: { color: muted, font: { size: 11 } },
      },
      y: {
        grid: { color: grid },
        ticks: { color: muted, font: { size: 11 }, callback: (v) => formatCurrency(v) },
        beginAtZero: true,
      },
    };

    return { theme, text, muted, surface, border, grid, palette, tooltip, legend, scales };
  }, [theme]);
};

/** Convierte un color sólido en su versión translúcida para el relleno de las líneas. */
export const withAlpha = (color, alpha) => {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
