import { useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { InputNumber } from "primereact/inputnumber";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { InputSwitch } from "primereact/inputswitch";
import { Toast } from "primereact/toast";
import { useTransactions } from "@/context/TransactionsProvider";
import { formatCurrency } from "@/utils/format";
import { getCategoriesForType, getCategoryLabel } from "@/utils/categories";
import { ConfirmDialog } from "../ConfirmDialog";

/**
 * Alta y gestión de los gastos fijos: qué se repite todos los meses.
 * El monto vive acá sólo como valor inicial; al cargarlos se sugiere el del
 * último mes real, porque el alquiler y las suscripciones cambian seguido.
 */
export const RecurringManager = ({ visible, onHide }) => {
  const {
    recurringTemplates,
    customCategories,
    archivedCategories,
    addRecurringTemplate,
    updateRecurringTemplate,
    deleteRecurringTemplate,
  } = useTransactions();

  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [defaultAmount, setDefaultAmount] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useRef(null);

  const categoryOptions = getCategoriesForType("expense", customCategories, archivedCategories).map(
    (c) => ({ label: c.label, value: c.value })
  );

  const templates = [...recurringTemplates].sort((a, b) =>
    a.description.localeCompare(b.description, "es")
  );

  const canSubmit = Boolean(description.trim() && category);

  const handleAdd = async () => {
    if (!canSubmit || saving) return;

    setSaving(true);
    try {
      await addRecurringTemplate({
        description: description.trim(),
        category,
        defaultAmount: defaultAmount || null,
        paused: false,
      });
      setDescription("");
      setCategory("");
      setDefaultAmount(null);
    } catch (error) {
      console.error("Error creando el gasto fijo:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo crear el gasto fijo.",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async (template) => {
    try {
      await updateRecurringTemplate(template.id, { paused: !template.paused });
    } catch (error) {
      console.error("Error pausando el gasto fijo:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo cambiar el estado.",
        life: 3000,
      });
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteRecurringTemplate(toDelete.id);
      setToDelete(null);
    } catch (error) {
      console.error("Error eliminando el gasto fijo:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar.",
        life: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />

      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-replay text-brand"></i>
            <span>Gastos fijos</span>
          </div>
        }
        visible={visible}
        onHide={onHide}
        style={{ width: "94vw", maxWidth: "620px" }}
        breakpoints={{ "640px": "96vw" }}
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
        <div className="flex flex-col gap-5 pt-1">
          <p className="text-muted text-sm">
            Lo que pagás todos los meses. Después los cargás todos juntos con un botón, ajustando
            sólo lo que cambió.
          </p>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-strong">Agregar</h4>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
              <InputText
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Ej: Alquiler, Netflix..."
                aria-label="Descripción del gasto fijo"
              />
              <Dropdown
                value={category}
                options={categoryOptions}
                onChange={(e) => setCategory(e.value)}
                placeholder="Categoría"
                aria-label="Categoría del gasto fijo"
              />
              <InputNumber
                value={defaultAmount}
                onValueChange={(e) => setDefaultAmount(e.value)}
                mode="currency"
                currency="ARS"
                locale="es-AR"
                placeholder="$ 0"
                className="sm:w-36"
                aria-label="Monto de referencia"
              />
            </div>
            <Button
              label="Agregar gasto fijo"
              icon="pi pi-plus"
              className="p-button-sm self-start"
              severity="success"
              onClick={handleAdd}
              loading={saving}
              disabled={!canSubmit}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-semibold text-strong">
              Tus fijos{" "}
              {templates.length > 0 && <span className="text-muted">({templates.length})</span>}
            </h4>

            {templates.length > 0 ? (
              <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto pr-1">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={`flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 ${
                      template.paused ? "opacity-60" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-strong truncate">{template.description}</p>
                      <p className="text-xs text-muted truncate">
                        {getCategoryLabel(template.category, customCategories)}
                        {template.defaultAmount
                          ? ` · ${formatCurrency(template.defaultAmount)}`
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <InputSwitch
                        checked={!template.paused}
                        onChange={() => handleTogglePause(template)}
                        aria-label={template.paused ? "Reanudar" : "Pausar"}
                        tooltip={template.paused ? "Pausado" : "Activo"}
                      />
                      <Button
                        icon="pi pi-trash"
                        className="p-button-rounded p-button-text p-button-sm"
                        severity="danger"
                        aria-label={`Eliminar ${template.description}`}
                        onClick={() => setToDelete(template)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm text-center py-6">
                Todavía no definiste ningún gasto fijo.
              </p>
            )}
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        visible={Boolean(toDelete)}
        loading={deleting}
        onHide={() => setToDelete(null)}
        onConfirm={handleDelete}
        message={`¿Eliminar el gasto fijo "${toDelete?.description}"? Los movimientos que ya cargaste no se tocan.`}
      />
    </>
  );
};
