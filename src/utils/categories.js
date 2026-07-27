import categoryData from "../../shared/categories.json";
import { assignColorsToCategories, CATEGORY_PALETTE } from "./colors";
import { toSlug } from "./slug";

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
 * Colador español reutilizable: ordena "Ñ" y los acentos como corresponde
 * ("Ámbar" antes que "Bebida") y trata mayúsculas y minúsculas por igual.
 * Se crea una sola vez porque instanciar Intl.Collator es caro.
 */
const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

const byLabel = (a, b) => collator.compare(a.label, b.label);

/**
 * Categorías por defecto de un tipo más las personalizadas del usuario,
 * ordenadas alfabéticamente en conjunto.
 *
 * Antes las personalizadas se concatenaban al final, así que una categoría
 * nueva que empezara con "A" aparecía después de "YouTube Premium".
 *
 * @param {"income"|"expense"|"savings"} type
 * @param {{income: Array, expense: Array, savings: Array}} customCategories
 */
export const getCategoriesForType = (type, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  [...(categories[type] || []), ...(customCategories?.[type] || [])].sort(byLabel);

/**
 * Lista plana de todas las categorías, sin ordenar.
 *
 * Es sólo para buscar por `value`, y se llama una vez por celda al pintar las
 * tablas: ordenarla acá sería pagar el costo del colador miles de veces sin que
 * el orden se vea en ningún lado.
 */
const getAllCategoriesUnsorted = (customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  TRANSACTION_TYPES.flatMap((type) => [
    ...(categories[type] || []),
    ...(customCategories?.[type] || []),
  ]);

/** Lista plana de todas las categorías (default + personalizadas), ordenada. */
export const getAllCategories = (customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  getAllCategoriesUnsorted(customCategories).sort(byLabel);

/**
 * Label legible de una categoría. Si no la encuentra devuelve el value crudo
 * en vez de quedar vacío.
 */
export const getCategoryLabel = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  getAllCategoriesUnsorted(customCategories).find((c) => c.value === value)?.label || value;

/** Color de una categoría, con un gris neutro como fallback. */
export const getCategoryColor = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  getAllCategoriesUnsorted(customCategories).find((c) => c.value === value)?.color || "#94a3b8";

/**
 * Busca una categoría ya existente del mismo tipo que choque con el nombre dado.
 *
 * Compara por slug, así que ignora mayúsculas, acentos, espacios de más y
 * signos: "Gimnasio", "gimnasio" y "GIMNASIO " se consideran la misma.
 * Devuelve la categoría encontrada (para poder nombrarla en el mensaje) o null.
 */
export const findDuplicateCategory = (label, type, customCategories = EMPTY_CUSTOM_CATEGORIES) => {
  const slug = toSlug(label);
  if (!slug) return null;
  return getCategoriesForType(type, customCategories).find((c) => c.value === slug) || null;
};

/**
 * Asigna un color de la paleta a una categoría nueva, en base a cuántas
 * existen ya de ese tipo, para que no se repitan.
 */
export const pickColorForNewCategory = (type, customCategories = EMPTY_CUSTOM_CATEGORIES) => {
  const existing = getCategoriesForType(type, customCategories).length;
  return CATEGORY_PALETTE[existing % CATEGORY_PALETTE.length];
};
