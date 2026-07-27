import categoryData from "../../shared/categories.json";
import { assignColorsToCategories, CATEGORY_PALETTE } from "./colors";

/**
 * Categorías por defecto, con un color fijo asignado a cada una.
 * La lista vive en shared/categories.json porque el bot de Telegram usa la misma.
 */
export const categories = {
  income: assignColorsToCategories(categoryData.income),
  savings: assignColorsToCategories(categoryData.savings),
  expense: assignColorsToCategories(categoryData.expense),
};

export const TRANSACTION_TYPES = ["income", "expense", "savings"];

/** Forma vacía de las categorías personalizadas — evita repetir el literal por todos lados. */
export const EMPTY_CUSTOM_CATEGORIES = { income: [], expense: [], savings: [] };

/**
 * Devuelve las categorías por defecto de un tipo más las personalizadas del usuario.
 * @param {"income"|"expense"|"savings"} type
 * @param {{income: Array, expense: Array, savings: Array}} customCategories
 */
export const getCategoriesForType = (type, customCategories = EMPTY_CUSTOM_CATEGORIES) => [
  ...(categories[type] || []),
  ...(customCategories?.[type] || []),
];

/** Lista plana de todas las categorías (default + personalizadas), sin importar el tipo. */
export const getAllCategories = (customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  TRANSACTION_TYPES.flatMap((type) => getCategoriesForType(type, customCategories));

/**
 * Label legible de una categoría. Si no la encuentra devuelve el value crudo
 * en vez de quedar vacío.
 */
export const getCategoryLabel = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  getAllCategories(customCategories).find((c) => c.value === value)?.label || value;

/** Color de una categoría, con un gris neutro como fallback. */
export const getCategoryColor = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  getAllCategories(customCategories).find((c) => c.value === value)?.color || "#94a3b8";

/**
 * Asigna un color de la paleta a una categoría nueva, en base a cuántas
 * existen ya de ese tipo, para que no se repitan.
 */
export const pickColorForNewCategory = (type, customCategories = EMPTY_CUSTOM_CATEGORIES) => {
  const existing = getCategoriesForType(type, customCategories).length;
  return CATEGORY_PALETTE[existing % CATEGORY_PALETTE.length];
};
