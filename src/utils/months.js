import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Utilidades para meses en formato "YYYY-MM".
 *
 * Se trabaja siempre con el string y con aritmética de meses absolutos
 * (año * 12 + mes) en vez de con objetos Date, porque `new Date("2025-07")`
 * se interpreta como UTC y en Argentina (UTC-3) cae en junio.
 */

/** Mes actual en formato "YYYY-MM". */
export const getCurrentMonth = () => toMonthKey(new Date());

/** Convierte un Date al formato "YYYY-MM" usando la hora local. */
export const toMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

/** Convierte "YYYY-MM" a un índice absoluto de meses, para poder comparar y sumar. */
const toAbsoluteMonth = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return year * 12 + (month - 1);
};

/** Operación inversa de toAbsoluteMonth. */
const fromAbsoluteMonth = (absolute) => {
  const year = Math.floor(absolute / 12);
  const month = (absolute % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
};

/** Suma (o resta, con delta negativo) meses. Cruza años correctamente. */
export const addMonths = (monthKey, delta) => fromAbsoluteMonth(toAbsoluteMonth(monthKey) + delta);

/** Comparador al estilo de Array.sort: <0 si a es anterior, 0 si son iguales, >0 si a es posterior. */
export const compareMonths = (a, b) => toAbsoluteMonth(a) - toAbsoluteMonth(b);

/**
 * Genera todos los meses entre dos extremos, inclusive.
 * generateMonthRange("2025-03", "2025-06") → ["2025-03", "2025-04", "2025-05", "2025-06"]
 */
export const generateMonthRange = (startMonth, endMonth) => {
  const start = toAbsoluteMonth(startMonth);
  const end = toAbsoluteMonth(endMonth);
  if (end < start) return [];

  return Array.from({ length: end - start + 1 }, (_, i) => fromAbsoluteMonth(start + i));
};

/** Convierte "YYYY-MM" a un Date local en el día 1, seguro para formatear con date-fns. */
export const monthKeyToDate = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

/**
 * Nombre legible de un mes, en castellano y con la inicial en mayúscula.
 *
 *   formatMonth("2026-08")            → "Agosto 2026"
 *   formatMonth("2026-08", "MMMM")    → "Agosto"
 *   formatMonth("2026-08", "MMM yy")  → "Ago 26"
 *
 * Estaba duplicada en cinco componentes con las mismas tres líneas.
 */
export const formatMonth = (monthKey, pattern = "MMMM yyyy") => {
  const label = format(monthKeyToDate(monthKey), pattern, { locale: es });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

/** Últimos N meses en formato "YYYY-MM", terminando en el mes actual. */
export const getLastNMonths = (n) => {
  const current = getCurrentMonth();
  return generateMonthRange(addMonths(current, -(n - 1)), current);
};
