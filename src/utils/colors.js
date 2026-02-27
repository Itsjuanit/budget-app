// colors.js

/**
 * Paleta fija de colores con buen contraste para Lara Dark.
 * Diseñada para hasta 30 categorías sin repetición.
 */
export const CATEGORY_PALETTE = [
  "#818CF8", // indigo
  "#34D399", // emerald
  "#F472B6", // pink
  "#FBBF24", // amber
  "#60A5FA", // blue
  "#A78BFA", // violet
  "#F87171", // red
  "#2DD4BF", // teal
  "#FB923C", // orange
  "#38BDF8", // sky
  "#E879F9", // fuchsia
  "#4ADE80", // green
  "#FACC15", // yellow
  "#C084FC", // purple
  "#F97316", // deep orange
  "#22D3EE", // cyan
  "#FB7185", // rose
  "#A3E635", // lime
  "#67E8F9", // light cyan
  "#D946EF", // magenta
  "#FCA5A5", // light red
  "#86EFAC", // light green
  "#FDE68A", // light amber
  "#93C5FD", // light blue
  "#C4B5FD", // light violet
  "#5EEAD4", // light teal
  "#FDBA74", // light orange
  "#7DD3FC", // light sky
  "#F0ABFC", // light fuchsia
  "#BEF264", // light lime
];

/**
 * Asigna colores fijos de la paleta a cada categoría.
 * @param {Array} categories Lista de categorías.
 * @returns {Array} Lista de categorías con colores asignados.
 */
export const assignColorsToCategories = (categories) => {
  return categories.map((category, index) => ({
    ...category,
    color: CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
  }));
};
