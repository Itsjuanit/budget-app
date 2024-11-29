/**
 * Genera un color hexadecimal aleatorio.
 * @returns {string} Un color en formato hexadecimal.
 */
const generateRandomColor = () => {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

/**
 * Asigna colores únicos a cada categoría.
 * @param {Array} categories Lista de categorías.
 * @returns {Array} Lista de categorías con colores asignados.
 */
export const assignColorsToCategories = (categories) => {
  const usedColors = new Set(); // Evitar colores repetidos

  return categories.map((category) => {
    let color;
    do {
      color = generateRandomColor();
    } while (usedColors.has(color)); // Asegura que el color sea único

    usedColors.add(color);
    return { ...category, color };
  });
};
