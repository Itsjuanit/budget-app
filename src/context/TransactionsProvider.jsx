import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  setDoc,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/auth/AuthContext";
import { EMPTY_CUSTOM_CATEGORIES } from "@/utils/categories";
import { CATEGORY_PALETTE } from "@/utils/colors";
import { getCurrentMonth, generateMonthRange, addMonths, compareMonths } from "@/utils/months";

const TransactionsContext = createContext(null);

/**
 * Fuente única de datos de la app: transacciones del mes seleccionado, meses
 * disponibles, categorías personalizadas y presupuestos.
 *
 * Todo se lee con onSnapshot (tiempo real) y se comparte entre las pestañas, así
 * el Dashboard y el Reporte mensual nunca muestran datos distintos.
 */
export const TransactionsProvider = ({ children }) => {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [monthBounds, setMonthBounds] = useState({ first: null, last: null });
  const [customCategories, setCustomCategories] = useState(EMPTY_CUSTOM_CATEGORIES);
  const [budgets, setBudgets] = useState({});
  const [archivedCategories, setArchivedCategories] = useState([]);

  // --- Transacciones del mes seleccionado (tiempo real) ---
  useEffect(() => {
    if (!uid || !selectedMonth) {
      setTransactions([]);
      setLoadingTransactions(false);
      return;
    }

    setLoadingTransactions(true);
    const monthQuery = query(
      collection(db, "transactions"),
      where("userId", "==", uid),
      where("monthYear", "==", selectedMonth)
    );

    const unsubscribe = onSnapshot(
      monthQuery,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(data);
        setLoadingTransactions(false);
      },
      (error) => {
        console.error("Error escuchando transacciones del mes:", error);
        setLoadingTransactions(false);
      }
    );

    return () => unsubscribe();
  }, [uid, selectedMonth]);

  // --- Primer y último mes con transacciones (para armar el selector de reportes) ---
  useEffect(() => {
    if (!uid) {
      setMonthBounds({ first: null, last: null });
      return;
    }

    const boundQuery = (direction) =>
      query(
        collection(db, "transactions"),
        where("userId", "==", uid),
        orderBy("monthYear", direction),
        limit(1)
      );

    const onError = (error) => console.error("Error cargando meses disponibles:", error);

    // Se escuchan sólo los extremos (1 doc cada uno) en vez de traer todo el historial.
    const unsubOldest = onSnapshot(
      boundQuery("asc"),
      (snap) =>
        setMonthBounds((prev) => ({ ...prev, first: snap.docs[0]?.data().monthYear ?? null })),
      onError
    );
    const unsubNewest = onSnapshot(
      boundQuery("desc"),
      (snap) =>
        setMonthBounds((prev) => ({ ...prev, last: snap.docs[0]?.data().monthYear ?? null })),
      onError
    );

    return () => {
      unsubOldest();
      unsubNewest();
    };
  }, [uid]);

  // --- Categorías personalizadas (tiempo real) ---
  useEffect(() => {
    if (!uid) {
      setCustomCategories(EMPTY_CUSTOM_CATEGORIES);
      return;
    }

    const categoriesQuery = query(collection(db, "customCategories"), where("userId", "==", uid));

    const unsubscribe = onSnapshot(
      categoriesQuery,
      (snapshot) => {
        const grouped = { income: [], expense: [], savings: [] };
        snapshot.docs.forEach((d, index) => {
          const data = d.data();
          if (!grouped[data.type]) return;
          grouped[data.type].push({
            id: d.id,
            label: data.label,
            value: data.value,
            group: data.group || null,
            color: data.color || CATEGORY_PALETTE[index % CATEGORY_PALETTE.length],
          });
        });
        setCustomCategories(grouped);
      },
      (error) => console.error("Error cargando categorías personalizadas:", error)
    );

    return () => unsubscribe();
  }, [uid]);

  // --- Categorías archivadas (tiempo real) ---
  // Un único documento por usuario, así funciona igual para las categorías
  // por defecto (que no se pueden modificar) y para las personalizadas.
  useEffect(() => {
    if (!uid) {
      setArchivedCategories([]);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "categoryPrefs", uid),
      (docSnap) => setArchivedCategories(docSnap.exists() ? docSnap.data().archived || [] : []),
      (error) => console.error("Error cargando preferencias de categorías:", error)
    );

    return () => unsubscribe();
  }, [uid]);

  // --- Presupuestos (tiempo real) ---
  useEffect(() => {
    if (!uid) {
      setBudgets({});
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "budgets", uid),
      // Si el documento se borra, los presupuestos vuelven a vacío en vez de quedar viejos.
      (docSnap) => setBudgets(docSnap.exists() ? docSnap.data().categories || {} : {}),
      (error) => console.error("Error cargando presupuestos:", error)
    );

    return () => unsubscribe();
  }, [uid]);

  // --- Meses disponibles en el selector ---
  const availableMonths = useMemo(() => {
    const currentMonth = getCurrentMonth();
    const candidates = [monthBounds.first, monthBounds.last, currentMonth, selectedMonth].filter(
      Boolean
    );
    const first = candidates.reduce((a, b) => (compareMonths(a, b) <= 0 ? a : b));
    const last = candidates.reduce((a, b) => (compareMonths(a, b) >= 0 ? a : b));
    return generateMonthRange(first, last);
  }, [monthBounds, selectedMonth]);

  // --- Navegación de meses ---
  // Se permite mirar hasta 2 meses hacia adelante (para cargar gastos futuros ya
  // conocidos) comparando meses absolutos, así el tope funciona también en nov/dic.
  const maxMonth = useMemo(() => addMonths(getCurrentMonth(), 2), []);
  const canGoToNextMonth = compareMonths(selectedMonth, maxMonth) < 0;
  const isCurrentMonth = selectedMonth === getCurrentMonth();

  const goToPreviousMonth = useCallback(() => {
    setSelectedMonth((month) => addMonths(month, -1));
  }, []);

  const goToNextMonth = useCallback(() => {
    setSelectedMonth((month) => (compareMonths(month, maxMonth) < 0 ? addMonths(month, 1) : month));
  }, [maxMonth]);

  const goToCurrentMonth = useCallback(() => setSelectedMonth(getCurrentMonth()), []);

  // --- Mutaciones ---
  // Todas propagan el error para que el componente pueda mostrar el toast correcto.
  // (Antes se tragaban el error y siempre se mostraba "Éxito").
  const addTransaction = useCallback(
    async (transaction) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      return addDoc(collection(db, "transactions"), { ...transaction, userId: uid });
    },
    [uid]
  );

  const updateTransaction = useCallback(async (updatedTransaction) => {
    const { id, ...dataToUpdate } = updatedTransaction;
    await updateDoc(doc(db, "transactions", id), dataToUpdate);
    // No se toca el estado local: el onSnapshot del mes ya refleja el cambio, y si la
    // transacción se movió a otro mes desaparece de la lista como corresponde.
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    await deleteDoc(doc(db, "transactions", id));
  }, []);

  const addCustomCategory = useCallback(
    async (category) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      return addDoc(collection(db, "customCategories"), { ...category, userId: uid });
    },
    [uid]
  );

  /** Edita una categoría propia (por ahora sólo se usa para reasignarle el grupo). */
  const updateCustomCategory = useCallback(async (categoryId, changes) => {
    if (!categoryId) throw new Error("Sólo se pueden editar categorías propias.");
    await updateDoc(doc(db, "customCategories", categoryId), changes);
  }, []);

  /**
   * Cuenta cuántas transacciones usan una categoría, mirando sólo si existe
   * al menos una: alcanza para decidir entre borrar y archivar, y evita traer
   * todo el historial.
   */
  const countCategoryUsage = useCallback(
    async (categoryValue) => {
      if (!uid) return 0;
      const snapshot = await getDocs(
        query(
          collection(db, "transactions"),
          where("userId", "==", uid),
          where("category", "==", categoryValue),
          limit(1)
        )
      );
      return snapshot.size;
    },
    [uid]
  );

  /** Guarda la lista de archivadas, creando el documento si no existía. */
  const saveArchived = useCallback(
    async (nextArchived) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      await setDoc(
        doc(db, "categoryPrefs", uid),
        { userId: uid, archived: nextArchived, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    },
    [uid]
  );

  /**
   * Archiva una categoría: desaparece de los desplegables pero el historial la
   * sigue mostrando con su nombre y color. También se le saca el presupuesto,
   * que dejaría de tener sentido.
   */
  const archiveCategory = useCallback(
    async (categoryValue) => {
      if (archivedCategories.includes(categoryValue)) return;
      await saveArchived([...archivedCategories, categoryValue]);

      if (budgets[categoryValue] !== undefined) {
        const { [categoryValue]: _removed, ...rest } = budgets;
        await setDoc(
          doc(db, "budgets", uid),
          { userId: uid, categories: rest, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    },
    [archivedCategories, saveArchived, budgets, uid]
  );

  const unarchiveCategory = useCallback(
    async (categoryValue) => {
      await saveArchived(archivedCategories.filter((v) => v !== categoryValue));
    },
    [archivedCategories, saveArchived]
  );

  /**
   * Borra definitivamente una categoría personalizada.
   *
   * Sólo debe llamarse cuando no hay transacciones que la usen: si las hubiera,
   * quedarían mostrando el identificador crudo en el historial. La UI resuelve
   * cuál corresponde con countCategoryUsage, pero se revalida acá porque entre
   * el chequeo y el borrado pudo entrar un movimiento desde el bot.
   */
  const deleteCustomCategory = useCallback(
    async (category) => {
      if (!category?.id) throw new Error("Sólo se pueden borrar categorías propias.");

      const enUso = await countCategoryUsage(category.value);
      if (enUso > 0) {
        const error = new Error("La categoría tiene transacciones asociadas.");
        error.code = "category/in-use";
        throw error;
      }

      await deleteDoc(doc(db, "customCategories", category.id));

      // Se limpia lo que quedaría colgando: el archivado y el presupuesto.
      if (archivedCategories.includes(category.value)) {
        await saveArchived(archivedCategories.filter((v) => v !== category.value));
      }
      if (budgets[category.value] !== undefined) {
        const { [category.value]: _removed, ...rest } = budgets;
        await setDoc(
          doc(db, "budgets", uid),
          { userId: uid, categories: rest, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      }
    },
    [countCategoryUsage, archivedCategories, saveArchived, budgets, uid]
  );

  const value = useMemo(
    () => ({
      transactions,
      loadingTransactions,
      selectedMonth,
      setSelectedMonth,
      availableMonths,
      canGoToNextMonth,
      isCurrentMonth,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
      customCategories,
      archivedCategories,
      budgets,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCustomCategory,
      updateCustomCategory,
      archiveCategory,
      unarchiveCategory,
      deleteCustomCategory,
      countCategoryUsage,
    }),
    [
      transactions,
      loadingTransactions,
      selectedMonth,
      availableMonths,
      canGoToNextMonth,
      isCurrentMonth,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
      customCategories,
      archivedCategories,
      budgets,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      addCustomCategory,
      updateCustomCategory,
      archiveCategory,
      unarchiveCategory,
      deleteCustomCategory,
      countCategoryUsage,
    ]
  );

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>;
};

export const useTransactions = () => {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error("useTransactions debe usarse dentro de TransactionsProvider");
  }
  return context;
};
