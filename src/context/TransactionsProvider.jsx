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
  writeBatch,
  limit,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/auth/AuthContext";
import { EMPTY_CUSTOM_CATEGORIES } from "@/utils/categories";
import { CATEGORY_PALETTE } from "@/utils/colors";
import {
  getCurrentMonth,
  monthKeyToDate,
  addMonths,
  compareMonths,
  generateMonthRange,
} from "@/utils/months";

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
  const [projects, setProjects] = useState([]);
  const [projectExpenses, setProjectExpenses] = useState([]);
  const [recurringTemplates, setRecurringTemplates] = useState([]);

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

  // --- Proyectos de gasto y sus gastos (tiempo real) ---
  //
  // Los gastos de un proyecto NO son transacciones: viven aparte porque
  // pertenecen sólo al proyecto y porque el mes que impacta es el asignado al
  // proyecto, no la fecha de cada gasto (un pasaje comprado en junio para el
  // viaje de agosto tiene que pesar en agosto). Así tampoco se cuentan dos veces.
  //
  // Se escuchan completos, sin filtrar por mes: el Dashboard necesita el total
  // del mes elegido y la pestaña de Proyectos los necesita todos.
  //
  // ponytail: trae TODOS los gastos de proyecto sin paginar. Techo: unos cientos
  // de documentos, que es de sobra para uso personal. Si algún día molesta, la
  // salida es guardar el total en el doc del proyecto y actualizarlo por
  // transacción, o escuchar sólo los proyectos del mes visible.
  useEffect(() => {
    if (!uid) {
      setProjects([]);
      setProjectExpenses([]);
      return;
    }

    const unsubProjects = onSnapshot(
      query(collection(db, "expenseProjects"), where("userId", "==", uid)),
      (snapshot) => setProjects(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Error cargando proyectos:", error)
    );

    const unsubExpenses = onSnapshot(
      query(collection(db, "projectExpenses"), where("userId", "==", uid)),
      (snapshot) => setProjectExpenses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Error cargando gastos de proyectos:", error)
    );

    return () => {
      unsubProjects();
      unsubExpenses();
    };
  }, [uid]);

  // --- Plantillas de gastos fijos (tiempo real) ---
  useEffect(() => {
    if (!uid) {
      setRecurringTemplates([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, "recurringTemplates"), where("userId", "==", uid)),
      (snapshot) => setRecurringTemplates(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (error) => console.error("Error cargando gastos fijos:", error)
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

  // --- Proyectos con su total gastado ---
  // El total sale de sumar sus gastos, así el checkbox de impacto sólo decide
  // si ese total entra o no al balance: nunca hay un total guardado que se
  // pueda desincronizar de los gastos reales.
  const projectsWithTotals = useMemo(() => {
    const spentByProject = new Map();
    projectExpenses.forEach((e) => {
      spentByProject.set(
        e.projectId,
        (spentByProject.get(e.projectId) || 0) + (Number(e.amount) || 0)
      );
    });

    return projects
      .map((project) => {
        const spent = spentByProject.get(project.id) || 0;
        const planned = Number(project.plannedAmount) || 0;
        return {
          ...project,
          spent,
          planned,
          hasPlan: planned > 0,
          remaining: planned - spent,
          overBudget: planned > 0 && spent > planned,
          progress: planned > 0 ? Math.round((spent / planned) * 100) : 0,
        };
      })
      .sort(
        (a, b) => compareMonths(b.monthYear, a.monthYear) || a.name.localeCompare(b.name, "es")
      );
  }, [projects, projectExpenses]);

  /** Total de los proyectos de un mes que están marcados para impactar el balance. */
  const getProjectsTotalForMonth = useCallback(
    (month) =>
      projectsWithTotals
        .filter((p) => p.monthYear === month && p.includeInBalance)
        .reduce((sum, p) => sum + p.spent, 0),
    [projectsWithTotals]
  );

  const monthProjects = useMemo(
    () => projectsWithTotals.filter((p) => p.monthYear === selectedMonth),
    [projectsWithTotals, selectedMonth]
  );

  const monthProjectsTotal = useMemo(
    () => getProjectsTotalForMonth(selectedMonth),
    [getProjectsTotalForMonth, selectedMonth]
  );

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

  // --- Proyectos: CRUD ---
  const addProject = useCallback(
    async ({ name, monthYear, plannedAmount, includeInBalance }) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      return addDoc(collection(db, "expenseProjects"), {
        userId: uid,
        name: name.trim(),
        monthYear,
        plannedAmount: plannedAmount || null,
        includeInBalance: Boolean(includeInBalance),
        createdAt: new Date().toISOString(),
      });
    },
    [uid]
  );

  const updateProject = useCallback(async (projectId, changes) => {
    await updateDoc(doc(db, "expenseProjects", projectId), changes);
  }, []);

  /** Atajo del checkbox: al cambiarlo, el balance del mes se recalcula solo. */
  const setProjectIncludeInBalance = useCallback(
    async (projectId, include) =>
      updateDoc(doc(db, "expenseProjects", projectId), { includeInBalance: Boolean(include) }),
    []
  );

  /** Borra el proyecto y todos sus gastos, para no dejar documentos huérfanos. */
  const deleteProject = useCallback(
    async (projectId) => {
      const snapshot = await getDocs(
        query(
          collection(db, "projectExpenses"),
          where("userId", "==", uid),
          where("projectId", "==", projectId)
        )
      );

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, "expenseProjects", projectId));
      await batch.commit();
    },
    [uid]
  );

  const addProjectExpense = useCallback(
    async (projectId, { description, amount, date }) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      return addDoc(collection(db, "projectExpenses"), {
        userId: uid,
        projectId,
        description: description.trim(),
        amount,
        date: (date || new Date()).toISOString(),
        createdAt: new Date().toISOString(),
      });
    },
    [uid]
  );

  const updateProjectExpense = useCallback(async (expenseId, changes) => {
    await updateDoc(doc(db, "projectExpenses", expenseId), changes);
  }, []);

  const deleteProjectExpense = useCallback(async (expenseId) => {
    await deleteDoc(doc(db, "projectExpenses", expenseId));
  }, []);

  /** Gastos de un proyecto, del más reciente al más viejo. */
  const getProjectExpenses = useCallback(
    (projectId) =>
      projectExpenses
        .filter((e) => e.projectId === projectId)
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [projectExpenses]
  );

  // --- Gastos fijos ---
  const addRecurringTemplate = useCallback(
    async (template) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      return addDoc(collection(db, "recurringTemplates"), {
        userId: uid,
        ...template,
        createdAt: new Date().toISOString(),
      });
    },
    [uid]
  );

  const updateRecurringTemplate = useCallback(async (templateId, changes) => {
    await updateDoc(doc(db, "recurringTemplates", templateId), changes);
  }, []);

  const deleteRecurringTemplate = useCallback(async (templateId) => {
    await deleteDoc(doc(db, "recurringTemplates", templateId));
  }, []);

  /**
   * Arma la propuesta de fijos para un mes: qué plantillas faltan cargar y con
   * qué monto sugerido.
   *
   * El monto sale del último movimiento real de esa categoría (mirando hasta 6
   * meses atrás) y no del guardado en la plantilla, porque el alquiler y las
   * suscripciones cambian seguido. La plantilla sólo aporta el valor inicial.
   *
   * Las que ya se cargaron este mes se marcan para no duplicarlas.
   */
  const buildRecurringPlan = useCallback(
    async (month) => {
      if (!uid || recurringTemplates.length === 0) return [];

      const activos = recurringTemplates.filter((t) => !t.paused);
      if (activos.length === 0) return [];

      // Un único rango de meses en vez de una consulta por plantilla.
      const desde = addMonths(month, -6);
      const snapshot = await getDocs(
        query(
          collection(db, "transactions"),
          where("userId", "==", uid),
          where("monthYear", ">=", desde),
          where("monthYear", "<=", month)
        )
      );

      const historial = snapshot.docs.map((d) => d.data());

      return activos
        .map((template) => {
          const delMes = historial.filter(
            (t) => t.monthYear === month && t.category === template.category
          );

          // El más reciente antes de este mes marca el monto sugerido.
          const anteriores = historial
            .filter((t) => t.monthYear !== month && t.category === template.category)
            .sort((a, b) => compareMonths(b.monthYear, a.monthYear));

          const ultimoMonto = anteriores[0]?.amount;

          return {
            ...template,
            alreadyLoaded: delMes.length > 0,
            suggestedAmount: Number(ultimoMonto) || Number(template.defaultAmount) || null,
            lastSeenMonth: anteriores[0]?.monthYear || null,
          };
        })
        .sort((a, b) => a.description.localeCompare(b.description, "es"));
    },
    [uid, recurringTemplates]
  );

  /** Crea de una sola vez las transacciones elegidas en el diálogo de fijos. */
  const createRecurringTransactions = useCallback(
    async (month, items) => {
      if (!uid) throw new Error("No hay usuario autenticado.");
      if (items.length === 0) return 0;

      const batch = writeBatch(db);
      // Se fechan el día 1 del mes destino: son cargos del mes, no de hoy.
      const date = monthKeyToDate(month).toISOString();

      items.forEach((item) => {
        batch.set(doc(collection(db, "transactions")), {
          userId: uid,
          type: "expense",
          amount: item.amount,
          category: item.category,
          description: item.description,
          date,
          monthYear: month,
          installments: 0,
          installmentsRemaining: 0,
          source: "recurring",
        });
      });

      await batch.commit();
      return items.length;
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
      recurringTemplates,
      addRecurringTemplate,
      updateRecurringTemplate,
      deleteRecurringTemplate,
      buildRecurringPlan,
      createRecurringTransactions,
      projects: projectsWithTotals,
      monthProjects,
      monthProjectsTotal,
      getProjectsTotalForMonth,
      getProjectExpenses,
      addProject,
      updateProject,
      setProjectIncludeInBalance,
      deleteProject,
      addProjectExpense,
      updateProjectExpense,
      deleteProjectExpense,
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
      recurringTemplates,
      addRecurringTemplate,
      updateRecurringTemplate,
      deleteRecurringTemplate,
      buildRecurringPlan,
      createRecurringTransactions,
      projectsWithTotals,
      monthProjects,
      monthProjectsTotal,
      getProjectsTotalForMonth,
      getProjectExpenses,
      addProject,
      updateProject,
      setProjectIncludeInBalance,
      deleteProject,
      addProjectExpense,
      updateProjectExpense,
      deleteProjectExpense,
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
