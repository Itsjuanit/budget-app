import { create } from "zustand";

// Definir colores únicos
const uniqueColors = [
  "#22c55e",
  "#16a34a",
  "#15803d",
  "#166534",
  "#f87171",
  "#ef4444",
  "#dc2626",
  "#f59e0b",
  "#d97706",
  "#c2410c",
  "#a16207",
  "#eab308",
  "#facc15",
  "#a3e635",
  "#4ade80",
  "#059669",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
  "#de6277",
  "#a35d69",
  "#4a1e25",
];

// Asignar colores únicos a cada categoría
const categories = [
  { id: "1", name: "Salario", value: "salario", type: "income", color: uniqueColors[0] },
  { id: "2", name: "Freelance", value: "freelance", type: "income", color: uniqueColors[1] },
  { id: "3", name: "Inversiones", value: "inversiones", type: "income", color: uniqueColors[2] },
  { id: "4", name: "Alquiler Claudio", value: "alquiler-claudios", type: "income", color: uniqueColors[3] },
  { id: "5", name: "Servicios (Luz, Gas, Agua)", value: "servicios", type: "expense", color: uniqueColors[4] },
  { id: "6", name: "Internet", value: "internet", type: "expense", color: uniqueColors[5] },
  { id: "7", name: "Celulares", value: "celulares", type: "expense", color: uniqueColors[6] },
  { id: "8", name: "Netflix", value: "netflix", type: "expense", color: uniqueColors[7] },
  { id: "9", name: "YouTube Premium", value: "youtube-premium", type: "expense", color: uniqueColors[8] },
  { id: "10", name: "Disney+", value: "disney-plus", type: "expense", color: uniqueColors[9] },
  { id: "11", name: "Spotify", value: "spotify", type: "expense", color: uniqueColors[10] },
  { id: "12", name: "Alquiler", value: "alquiler", type: "expense", color: uniqueColors[11] },
  { id: "13", name: "Tarjeta de crédito", value: "tarjeta-credito", type: "expense", color: uniqueColors[12] },
  { id: "14", name: "Supermercado", value: "supermercado", type: "expense", color: uniqueColors[13] },
  { id: "15", name: "Transporte", value: "transporte", type: "expense", color: uniqueColors[14] },
  { id: "16", name: "Combustible", value: "combustible", type: "expense", color: uniqueColors[15] },
  { id: "17", name: "Educación", value: "educacion", type: "expense", color: uniqueColors[16] },
  { id: "18", name: "Salud", value: "salud", type: "expense", color: uniqueColors[17] },
  { id: "19", name: "Hobbies", value: "hobbies", type: "expense", color: uniqueColors[18] },
  { id: "20", name: "Otros gastos", value: "otros-gastos", type: "expense", color: uniqueColors[19] },
  { id: "21", name: "Prestamos", value: "prestamos", type: "expense", color: uniqueColors[20] },
  { id: "22", name: "Dibujo", value: "dibujo", type: "expense", color: uniqueColors[21] },
  { id: "23", name: "Rugby", value: "rugby", type: "expense", color: uniqueColors[22] },
  { id: "24", name: "Circulo", value: "circulo", type: "expense", color: uniqueColors[23] },
];

export const useFinanceStore = create((set, get) => ({
  transactions: [],
  categories, // Usa la lista de categorías definida arriba
  budget: {
    income: 0,
    savingsGoal: 0,
    categories: {},
  },
  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [
        ...state.transactions,
        { ...transaction, date: new Date(transaction.date) }, // Asegura que la fecha sea una instancia de Date
      ],
    })),
  addCategory: (category) =>
    set((state) => ({
      categories: [...state.categories, category],
    })),
  updateBudget: (budget) => set({ budget }),
  getMonthlyExpenses: () => {
    const { transactions } = get();
    const currentMonth = new Date().getMonth();
    return transactions
      .filter((t) => t.type === "expense" && new Date(t.date).getMonth() === currentMonth)
      .reduce((sum, t) => sum + t.amount, 0);
  },
  getMonthlySavings: () => {
    const { transactions } = get();
    const currentMonth = new Date().getMonth();
    const monthlyTransactions = transactions.filter((t) => new Date(t.date).getMonth() === currentMonth);
    const income = monthlyTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
    const expenses = monthlyTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
    return income - expenses;
  },
  getExpensesByCategory: () => {
    const { transactions, categories } = get();
    const expenseCategories = categories.filter((c) => c.type === "expense");

    return expenseCategories.map((category) => ({
      category: category.name, // Nombre amigable para mostrar
      amount: transactions
        .filter((t) => t.category === category.value && t.type === "expense") // Comparación por `value`
        .reduce((sum, t) => sum + t.amount, 0),
      color: category.color, // Colores para el gráfico
    }));
  },
}));
