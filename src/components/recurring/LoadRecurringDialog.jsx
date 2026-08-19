import { useEffect, useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { InputNumber } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Toast } from "primereact/toast";
import { Message } from "primereact/message";
import { useTransactions } from "@/context/TransactionsProvider";
import { formatCurrency } from "@/utils/format";
import { getCategoryLabel } from "@/utils/categories";
import { formatMonth } from "@/utils/months";

/**
 * Revisión previa a cargar los fijos del mes.
 *
 * Nunca crea nada sin mostrar antes qué va a crear y con qué monto: son varias
 * transacciones de una, y equivocarse implicaría borrarlas una por una.
 * Las que ya se cargaron este mes vienen destildadas para no duplicarlas.
 */
export const LoadRecurringDialog = ({ visible, month, onHide }) => {
  const { customCategories, buildRecurringPlan, createRecurringTransactions } = useTransactions();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useRef(null);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    setLoading(true);

    buildRecurringPlan(month)
      .then((plan) => {
        if (cancelled) return;
        setRows(
          plan.map((item) => ({
            ...item,
            // Las ya cargadas arrancan destildadas: el caso normal es no repetirlas.
            selected: !item.alreadyLoaded,
            amount: item.suggestedAmount,
          }))
        );
      })
      .catch((error) => {
        console.error("Error armando el plan de gastos fijos:", error);
        if (!cancelled) setRows([]);
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [visible, month, buildRecurringPlan]);

  const patchRow = (id, changes) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...changes } : r)));

  const selectedRows = rows.filter((r) => r.selected && r.amount > 0);
  const total = selectedRows.reduce((sum, r) => sum + r.amount, 0);

  const handleConfirm = async () => {
    if (selectedRows.length === 0 || saving) return;

    setSaving(true);
    try {
      const count = await createRecurringTransactions(
        month,
        selectedRows.map((r) => ({
          description: r.description,
          category: r.category,
          amount: r.amount,
        }))
      );
      toast.current?.show({
        severity: "success",
        summary: "Fijos cargados",
        detail: `Se agregaron ${count} movimientos por ${formatCurrency(total)}.`,
        life: 4000,
      });
      onHide();
    } catch (error) {
      console.error("Error cargando los gastos fijos:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudieron cargar los gastos fijos.",
        life: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Toast ref={toast} />

      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-replay text-brand"></i>
            <span>Cargar los fijos de {formatMonth(month)}</span>
          </div>
        }
        visible={visible}
        onHide={onHide}
        style={{ width: "94vw", maxWidth: "640px" }}
        breakpoints={{ "640px": "96vw" }}
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">
              {selectedRows.length > 0 ? (
                <>
                  {selectedRows.length} por{" "}
                  <span className="font-bold text-strong">{formatCurrency(total)}</span>
                </>
              ) : (
                "Nada seleccionado"
              )}
            </span>
            <div className="flex gap-2">
              <Button
                label="Cancelar"
                icon="pi pi-times"
                className="p-button-outlined p-button-sm"
                severity="secondary"
                onClick={onHide}
                disabled={saving}
              />
              <Button
                label="Cargar"
                icon="pi pi-check"
                className="p-button-sm"
                severity="success"
                onClick={handleConfirm}
                loading={saving}
                disabled={selectedRows.length === 0}
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <i className="pi pi-spin pi-spinner text-muted text-2xl" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10">
            <i className="pi pi-replay text-3xl text-border mb-3" />
            <p className="text-muted text-sm">No tenés gastos fijos activos.</p>
            <p className="text-subtle text-xs mt-1">Definilos primero desde el botón de gestión.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 pt-1">
            <p className="text-muted text-sm">
              Revisá los montos antes de cargar. Se sugiere el del último mes en que apareció cada
              uno.
            </p>

            {rows.some((r) => r.alreadyLoaded) && (
              <Message
                severity="info"
                className="w-full"
                text="Los que ya cargaste este mes vienen destildados."
              />
            )}

            <div className="flex flex-col gap-2 max-h-[46vh] overflow-y-auto pr-1">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className={`flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 ${
                    row.selected ? "" : "opacity-60"
                  }`}
                >
                  <Checkbox
                    inputId={`fijo-${row.id}`}
                    checked={row.selected}
                    onChange={(e) => patchRow(row.id, { selected: e.checked })}
                    className="flex-shrink-0"
                  />

                  <label htmlFor={`fijo-${row.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <p className="text-sm text-strong truncate">{row.description}</p>
                    <p className="text-xs text-muted truncate">
                      {getCategoryLabel(row.category, customCategories)}
                      {row.alreadyLoaded && " · ya cargado este mes"}
                      {!row.alreadyLoaded &&
                        row.lastSeenMonth &&
                        ` · último: ${formatMonth(row.lastSeenMonth)}`}
                    </p>
                  </label>

                  <InputNumber
                    value={row.amount}
                    onValueChange={(e) => patchRow(row.id, { amount: e.value })}
                    mode="currency"
                    currency="ARS"
                    locale="es-AR"
                    placeholder="$ 0"
                    inputClassName="text-right text-sm"
                    className="w-32 flex-shrink-0"
                    disabled={!row.selected}
                    aria-label={`Monto de ${row.description}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};
