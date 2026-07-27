/**
 * Tonos de color para las tarjetas de resumen.
 *
 * Son literales a propósito: Tailwind escanea el código buscando strings de clase
 * completos, así que armar el nombre por interpolación (`text-${tono}-400`) haría
 * que la clase nunca se genere.
 */
export const CARD_TONES = {
  green: {
    color: "text-income",
    borderColor: "border-ring-income",
    bgGlow: "bg-tint-income",
  },
  red: { color: "text-expense", borderColor: "border-ring-expense", bgGlow: "bg-tint-expense" },
  blue: { color: "text-savings", borderColor: "border-ring-savings", bgGlow: "bg-tint-savings" },
  purple: {
    color: "text-brand",
    borderColor: "border-ring-primary",
    bgGlow: "bg-tint-primary",
  },
};

/** Verde si el saldo da positivo, rojo si está en rojo. */
export const balanceTone = (value, positiveTone = "green") =>
  value >= 0 ? CARD_TONES[positiveTone] : CARD_TONES.red;

/**
 * Grilla de tarjetas de resumen. La usan el Dashboard y el Reporte mensual,
 * que antes duplicaban el mismo markup.
 *
 * @param {Array<{icon, label, value, color, borderColor, bgGlow}>} cards
 */
export const SummaryCards = ({ cards }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    {cards.map((card) => (
      <div key={card.label} className={`rounded-xl border ${card.borderColor} ${card.bgGlow} p-5`}>
        <div className="flex items-center gap-4">
          <div className={`${card.color} opacity-80`}>{card.icon}</div>
          <div>
            <p className="text-muted text-sm">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value}</p>
          </div>
        </div>
      </div>
    ))}
  </div>
);
