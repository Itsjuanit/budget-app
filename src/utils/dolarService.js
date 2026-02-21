const BASE_URL = "https://dolarapi.com/v1/dolares";

const DOLAR_TYPES = {
  cripto: { label: "Dólar Cripto", endpoint: "cripto" },
  blue: { label: "Dólar Blue", endpoint: "blue" },
  bolsa: { label: "Dólar MEP", endpoint: "bolsa" },
  tarjeta: { label: "Dólar Tarjeta", endpoint: "tarjeta" },
};

/**
 * Obtiene la cotización de un tipo de dólar.
 * Retorna { compra, venta, nombre, fechaActualizacion }
 */
export const fetchDolarRate = async (type = "cripto") => {
  const dolarType = DOLAR_TYPES[type];
  if (!dolarType) throw new Error(`Tipo de dólar no soportado: ${type}`);

  const response = await fetch(`${BASE_URL}/${dolarType.endpoint}`);
  if (!response.ok) throw new Error("Error obteniendo cotización");

  const data = await response.json();
  return {
    compra: data.compra,
    venta: data.venta,
    nombre: dolarType.label,
    fechaActualizacion: data.fechaActualizacion,
  };
};

/**
 * Obtiene todas las cotizaciones.
 */
export const fetchAllDolarRates = async () => {
  const response = await fetch(BASE_URL);
  if (!response.ok) throw new Error("Error obteniendo cotizaciones");
  return response.json();
};

/**
 * Convierte USD a ARS usando la cotización de venta.
 */
export const convertUsdToArs = (usdAmount, ventaRate) => {
  return Math.round(usdAmount * ventaRate * 100) / 100;
};

/**
 * Opciones para el dropdown de tipo de dólar.
 */
export const dolarTypeOptions = Object.entries(DOLAR_TYPES).map(([value, { label }]) => ({
  label,
  value,
}));
