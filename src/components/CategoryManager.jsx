import { useMemo, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { useTransactions } from "@/context/TransactionsProvider";
import {
  categories as defaultCategories,
  getCategoriesForType,
  getGroupOptions,
  groups as GROUPS,
  isDefaultCategory,
} from "@/utils/categories";
import { ConfirmDialog } from "./ConfirmDialog";

const TYPE_OPTIONS = [
  { label: "Gastos", value: "expense" },
  { label: "Ingresos", value: "income" },
  { label: "Ahorros", value: "savings" },
];

/** Punto de color + nombre, compartido por las filas activas y archivadas. */
const CategoryName = ({ category, dimmed = false }) => (
  <div className={`flex items-center gap-2 min-w-0 ${dimmed ? "opacity-60" : ""}`}>
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: category.color }}
    />
    <span className="text-sm text-strong truncate">{category.label}</span>
    {!isDefaultCategory(category.value) && (
      <span className="text-[10px] uppercase tracking-wide text-subtle flex-shrink-0">propia</span>
    )}
  </div>
);

export const CategoryManager = ({ visible, onHide }) => {
  const {
    customCategories,
    archivedCategories,
    archiveCategory,
    unarchiveCategory,
    deleteCustomCategory,
    updateCustomCategory,
    countCategoryUsage,
  } = useTransactions();

  const [type, setType] = useState("expense");
  const [busyValue, setBusyValue] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useRef(null);

  const archivedSet = useMemo(() => new Set(archivedCategories), [archivedCategories]);

  const active = getCategoriesForType(type, customCategories, archivedSet);

  // Las archivadas se listan aparte para poder restaurarlas.
  const archived = useMemo(
    () =>
      [...(defaultCategories[type] || []), ...(customCategories?.[type] || [])].filter((c) =>
        archivedSet.has(c.value)
      ),
    [type, customCategories, archivedSet]
  );

  const notify = (severity, summary, detail, life = 3500) =>
    toast.current?.show({ severity, summary, detail, life });

  const runAction = async (categoryValue, action, onError) => {
    setBusyValue(categoryValue);
    try {
      await action();
    } catch (error) {
      console.error(error);
      onError(error);
    } finally {
      setBusyValue(null);
    }
  };

  const handleArchive = (category) =>
    runAction(
      category.value,
      async () => {
        await archiveCategory(category.value);
        notify(
          "success",
          "Categoría archivada",
          `«${category.label}» ya no aparece al cargar movimientos. Tu historial no cambia.`
        );
      },
      () => notify("error", "Error", "No se pudo archivar la categoría.")
    );

  const handleUnarchive = (category) =>
    runAction(
      category.value,
      async () => {
        await unarchiveCategory(category.value);
        notify("success", "Categoría restaurada", `«${category.label}» vuelve a estar disponible.`);
      },
      () => notify("error", "Error", "No se pudo restaurar la categoría.")
    );

  /**
   * Antes de ofrecer el borrado se mira si la categoría tiene movimientos.
   * Si los tiene no se borra: el historial quedaría mostrando el identificador
   * crudo. En ese caso se sugiere archivarla, que logra lo mismo sin romper nada.
   */
  const handleDeleteRequest = (category) =>
    runAction(
      category.value,
      async () => {
        const enUso = await countCategoryUsage(category.value);
        if (enUso > 0) {
          notify(
            "warn",
            "Tiene movimientos",
            `«${category.label}» está usada en transacciones. Archivala para dejar de verla sin perder el historial.`,
            5000
          );
          return;
        }
        setToDelete(category);
      },
      () => notify("error", "Error", "No se pudo verificar la categoría.")
    );

  const handleDeleteConfirmed = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteCustomCategory(toDelete);
      notify("success", "Categoría eliminada", `«${toDelete.label}» se eliminó definitivamente.`);
      setToDelete(null);
    } catch (error) {
      console.error(error);
      notify(
        "error",
        "Error",
        error.code === "category/in-use"
          ? "La categoría pasó a tener movimientos. Archivala en vez de borrarla."
          : "No se pudo eliminar la categoría."
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleGroupChange = (category, group) =>
    runAction(
      category.value,
      () => updateCustomCategory(category.id, { group }),
      () => notify("error", "Error", "No se pudo cambiar el grupo.")
    );

  const renderActiveRow = (category) => {
    const isOwn = Boolean(category.id);
    const busy = busyValue === category.value;

    return (
      <div
        key={category.value}
        className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
      >
        <div className="flex-1 min-w-0">
          <CategoryName category={category} />
        </div>

        {/* Sólo los gastos se agrupan; el grupo de las predefinidas viene fijo. */}
        {type === "expense" &&
          (isOwn ? (
            <Dropdown
              value={category.group || null}
              options={getGroupOptions()}
              onChange={(e) => handleGroupChange(category, e.value)}
              className="w-36 flex-shrink-0 p-inputtext-sm"
              disabled={busy}
              aria-label={`Grupo de ${category.label}`}
            />
          ) : (
            <span className="w-36 flex-shrink-0 text-xs text-subtle text-center">
              {category.group ? GROUPS[category.group]?.label : "Sin agrupar"}
            </span>
          ))}

        <div className="flex gap-1 flex-shrink-0">
          <Button
            icon="pi pi-inbox"
            className="p-button-rounded p-button-text p-button-sm"
            tooltip="Archivar"
            tooltipOptions={{ position: "top" }}
            aria-label={`Archivar ${category.label}`}
            onClick={() => handleArchive(category)}
            loading={busy}
          />
          {isOwn && (
            <Button
              icon="pi pi-trash"
              className="p-button-rounded p-button-text p-button-sm"
              tooltip="Eliminar"
              tooltipOptions={{ position: "top" }}
              aria-label={`Eliminar ${category.label}`}
              severity="danger"
              onClick={() => handleDeleteRequest(category)}
              disabled={busy}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Toast ref={toast} />

      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-tags text-brand"></i>
            <span>Gestionar categorías</span>
          </div>
        }
        visible={visible}
        onHide={onHide}
        style={{ width: "92vw", maxWidth: "720px" }}
        breakpoints={{ "640px": "95vw" }}
        footer={
          <Button
            label="Cerrar"
            icon="pi pi-times"
            className="p-button-outlined p-button-sm"
            severity="secondary"
            onClick={onHide}
          />
        }
      >
        <div className="flex flex-col gap-4 pt-1">
          <div className="flex items-center gap-3">
            <Dropdown
              value={type}
              options={TYPE_OPTIONS}
              onChange={(e) => setType(e.value)}
              className="w-40"
              aria-label="Tipo de categoría"
            />
            <p className="text-xs text-subtle">
              Archivar oculta la categoría al cargar movimientos, sin tocar el historial.
            </p>
          </div>

          <div className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto overflow-x-hidden pr-2">
            {active.length > 0 ? (
              active.map(renderActiveRow)
            ) : (
              <p className="text-muted text-sm text-center py-6">
                No te queda ninguna categoría activa de este tipo.
              </p>
            )}
          </div>

          {archived.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-muted">Archivadas ({archived.length})</h4>
              <div className="flex flex-col gap-2 max-h-[25vh] overflow-y-auto overflow-x-hidden pr-2">
                {archived.map((category) => (
                  <div
                    key={category.value}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <CategoryName category={category} dimmed />
                    </div>
                    <Button
                      icon="pi pi-replay"
                      label="Restaurar"
                      className="p-button-text p-button-sm flex-shrink-0"
                      onClick={() => handleUnarchive(category)}
                      loading={busyValue === category.value}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Dialog>

      <ConfirmDialog
        visible={Boolean(toDelete)}
        loading={deleting}
        onHide={() => setToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        message={`«${toDelete?.label}» no tiene movimientos asociados. ¿Eliminarla definitivamente?`}
      />
    </>
  );
};
