// Rango Unicode de marcas diacríticas combinantes (los acentos que quedan sueltos
// al normalizar con NFD). Se define por código para no dejar caracteres invisibles
// dentro de una expresión regular en el código.
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g"
);

/**
 * Convierte un nombre de categoría en un identificador estable.
 * "Acción Física" → "accion-fisica"
 */
export const toSlug = (text) =>
  text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
