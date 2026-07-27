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

/**
 * Grupos ("paraguas") para agrupar categorías en el análisis.
 * El grupo vive en la definición de la categoría, no en la transacción: Spotify
 * siempre pertenece a Suscripciones, así que guardarlo en cada movimiento sería
 * repetir el mismo dato miles de veces (y obligaría a migrar el historial).
 */
export const groups = categoryData.groups;

/** Grupo virtual para las categorías que no pertenecen a ninguno. */
export const UNGROUPED = { value: "sin-grupo", label: "Sin agrupar", color: "#94a3b8" };

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

/** Todas las categorías de un tipo, incluidas las archivadas, sin ordenar. */
const rawCategoriesForType = (type, customCategories = EMPTY_CUSTOM_CATEGORIES) => [
  ...(categories[type] || []),
  ...(customCategories?.[type] || []),
];

/**
 * Categorías de un tipo listas para elegir: por defecto + personalizadas,
 * ordenadas alfabéticamente en conjunto y sin las archivadas.
 *
 * @param {"income"|"expense"|"savings"} type
 * @param {object} customCategories
 * @param {Set<string>|Array<string>} archived identificadores archivados
 */
export const getCategoriesForType = (
  type,
  customCategories = EMPTY_CUSTOM_CATEGORIES,
  archived = null
) => {
  const hidden = archived instanceof Set ? archived : new Set(archived || []);
  return rawCategoriesForType(type, customCategories)
    .filter((c) => !hidden.has(c.value))
    .sort(byLabel);
};

/**
 * Todas las categorías de todos los tipos, incluidas las archivadas y sin ordenar.
 *
 * Las búsquedas por `value` usan esta versión: se llaman una vez por celda al
 * pintar las tablas (ordenar ahí sería pagar el colador miles de veces), y deben
 * seguir resolviendo las archivadas para que el historial no muestre el
 * identificador crudo.
 */
const allCategoriesRaw = (customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  TRANSACTION_TYPES.flatMap((type) => rawCategoriesForType(type, customCategories));

/** Lista plana de todas las categorías activas, ordenada. */
export const getAllCategories = (customCategories = EMPTY_CUSTOM_CATEGORIES, archived = null) => {
  const hidden = archived instanceof Set ? archived : new Set(archived || []);
  return allCategoriesRaw(customCategories)
    .filter((c) => !hidden.has(c.value))
    .sort(byLabel);
};

/** Busca la definición de una categoría por su identificador, esté archivada o no. */
export const findCategory = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  allCategoriesRaw(customCategories).find((c) => c.value === value) || null;

/**
 * Label legible de una categoría. Si no la encuentra devuelve el value crudo
 * en vez de quedar vacío.
 */
export const getCategoryLabel = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  findCategory(value, customCategories)?.label || value;

/** Color de una categoría, con un gris neutro como fallback. */
export const getCategoryColor = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) =>
  findCategory(value, customCategories)?.color || "#94a3b8";

/**
 * Grupo al que pertenece una categoría, ya resuelto a {value, label, color}.
 * Las categorías sin grupo caen en el grupo virtual "Sin agrupar".
 */
export const getCategoryGroup = (value, customCategories = EMPTY_CUSTOM_CATEGORIES) => {
  const groupValue = findCategory(value, customCategories)?.group;
  const group = groupValue && groups[groupValue];
  return group ? { value: groupValue, ...group } : UNGROUPED;
};

/** Opciones de grupo para un desplegable, ordenadas y con la opción "sin grupo". */
export const getGroupOptions = () => [
  { label: "Sin agrupar", value: null },
  ...Object.entries(groups)
    .map(([value, { label }]) => ({ label, value }))
    .sort(byLabel),
];

/**
 * Busca una categoría ya existente del mismo tipo que choque con el nombre dado.
 *
 * Compara por slug, así que ignora mayúsculas, acentos, espacios de más y
 * signos: "Gimnasio", "gimnasio" y "GIMNASIO " se consideran la misma.
 * Incluye las archivadas: reutilizar su nombre crearía dos categorías con el
 * mismo identificador. Devuelve la categoría encontrada o null.
 */
export const findDuplicateCategory = (label, type, customCategories = EMPTY_CUSTOM_CATEGORIES) => {
  const slug = toSlug(label);
  if (!slug) return null;
  return rawCategoriesForType(type, customCategories).find((c) => c.value === slug) || null;
};

/** True si la categoría viene con la app (no se puede borrar, sólo archivar). */
export const isDefaultCategory = (value) =>
  TRANSACTION_TYPES.some((type) => categories[type].some((c) => c.value === value));

/**
 * Asigna un color de la paleta a una categoría nueva, en base a cuántas
 * existen ya de ese tipo, para que no se repitan.
 */
export const pickColorForNewCategory = (type, customCategories = EMPTY_CUSTOM_CATEGORIES) => {
  const existing = rawCategoriesForType(type, customCategories).length;
  return CATEGORY_PALETTE[existing % CATEGORY_PALETTE.length];
};
