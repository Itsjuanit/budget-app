import { useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Tag } from "primereact/tag";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Wallet, TrendingDown, PiggyBank, Landmark } from "lucide-react";
import { useTransactions } from "@/context/TransactionsProvider";
import { useMonthlyTotals } from "@/hooks/useMonthlyTotals";
import { formatCurrency, formatDate, getTypeConfig } from "@/utils/format";
import { getCategoryLabel } from "@/utils/categories";
import { getCurrentMonth, monthKeyToDate } from "@/utils/months";
import { EditTransactionForm } from "./EditTransactionForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { SummaryCards, CARD_TONES, balanceTone } from "./dashboard/SummaryCards";
import { ProjectsImpact } from "./projects/ProjectsImpact";

export const MonthlyReports = () => {
  const {
    transactions,
    customCategories,
    availableMonths,
    selectedMonth,
    setSelectedMonth,
    deleteTransaction,
    monthProjects,
    monthProjectsTotal,
  } = useTransactions();

  const totals = useMonthlyTotals(transactions, customCategories, monthProjectsTotal);
  const toast = useRef(null);

  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Sólo se permite tocar el mes en curso, para no reescribir el histórico.
  const canModify = selectedMonth === getCurrentMonth();

  const monthOptions = availableMonths.map((monthYear) => ({
    value: monthYear,
    label: format(monthKeyToDate(monthYear), "MMMM yyyy", { locale: es }),
  }));

  const handleDeleteConfirmed = async () => {
    if (!transactionToDelete) return;
    setDeleting(true);
    try {
      await deleteTransaction(transactionToDelete.id);
      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Transacción eliminada correctamente.",
        life: 3000,
      });
      setTransactionToDelete(null);
    } catch (error) {
      console.error("Error eliminando transacción:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo eliminar la transacción.",
        life: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!transactions.length || !selectedMonth) return;

    setGeneratingPdf(true);
    try {
      // jsPDF y sus dependencias pesan ~370 KB: se cargan recién al pedir el reporte.
      const { generatePDF } = await import("@/utils/pdfGenerator");

      generatePDF(
        {
          transactions: transactions.filter((t) => t.date && !isNaN(new Date(t.date).getTime())),
          income: totals.totalIncome,
          expenses: totals.totalExpenses,
          savings: totals.totalSavings,
        },
        selectedMonth,
        customCategories
      );

      toast.current?.show({
        severity: "success",
        summary: "Éxito",
        detail: "Reporte descargado correctamente.",
        life: 3000,
      });
    } catch (error) {
      console.error("Error generando el PDF:", error);
      toast.current?.show({
        severity: "error",
        summary: "Error",
        detail: "No se pudo generar el reporte.",
        life: 3000,
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const summaryCards = [
    {
      icon: <Wallet className="w-8 h-8" />,
      label: "Total ingresado",
      value: formatCurrency(totals.totalIncome),
      ...CARD_TONES.green,
    },
    {
      icon: <TrendingDown className="w-8 h-8" />,
      label: "Total gastado",
      value: formatCurrency(totals.totalExpenses),
      ...CARD_TONES.red,
    },
    {
      icon: <PiggyBank className="w-8 h-8" />,
      label: "Total ahorrado",
      value: formatCurrency(totals.totalSavings),
      ...CARD_TONES.blue,
    },
    {
      icon: <Landmark className="w-8 h-8" />,
      label: "Disponible",
      value: formatCurrency(totals.available),
      ...balanceTone(totals.available, "purple"),
    },
  ];

  const renderActions = (row) => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-pencil"
        className="p-button-rounded p-button-text p-button-sm"
        tooltip={canModify ? "Editar" : "Sólo se puede editar el mes en curso"}
        tooltipOptions={{ position: "top", showOnDisabled: true }}
        aria-label="Editar transacción"
        onClick={() => setTransactionToEdit(row)}
        disabled={!canModify}
      />
      <Button
        icon="pi pi-trash"
        className="p-button-rounded p-button-text p-button-sm"
        tooltip={canModify ? "Eliminar" : "Sólo se puede eliminar del mes en curso"}
        tooltipOptions={{ position: "top", showOnDisabled: true }}
        aria-label="Eliminar transacción"
        onClick={() => setTransactionToDelete(row)}
        disabled={!canModify}
        severity="danger"
      />
    </div>
  );

  return (
    <div>
      <Toast ref={toast} />

      <h1 className="text-2xl font-bold mb-6 text-strong">Reporte mensual</h1>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <Dropdown
          value={selectedMonth}
          options={monthOptions}
          onChange={(e) => setSelectedMonth(e.value)}
          placeholder="Seleccionar un mes"
          className="w-full sm:w-auto"
          aria-label="Mes del reporte"
        />
        <Button
          label="Descargar PDF"
          icon="pi pi-file-pdf"
          className="p-button-sm p-button-outlined"
          severity="danger"
          onClick={handleDownloadPDF}
          loading={generatingPdf}
          disabled={!transactions.length || !selectedMonth}
        />
      </div>

      <SummaryCards cards={summaryCards} />

      <ProjectsImpact projects={monthProjects} total={totals.projectsTotal} />

      <div className="rounded-xl border border-border bg-surface-raised p-5">
        <h3 className="text-lg font-semibold mb-4 text-strong">Detalle de transacciones</h3>

        {transactions.length > 0 ? (
          <DataTable
            value={transactions}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            sortField="date"
            sortOrder={-1}
            className="p-datatable-sm"
            emptyMessage="No hay transacciones para este mes."
            stripedRows
          >
            <Column
              field="date"
              header="Fecha"
              body={(row) => <span className="text-secondary text-sm">{formatDate(row.date)}</span>}
              sortable
            />
            <Column
              field="type"
              header="Tipo"
              body={(row) => {
                const config = getTypeConfig(row.type);
                return <Tag value={config.label} severity={config.severity} className="text-xs" />;
              }}
              sortable
            />
            <Column
              field="category"
              header="Categoría"
              body={(row) => (
                <span className="text-muted text-sm">
                  {getCategoryLabel(row.category, customCategories)}
                </span>
              )}
              sortable
            />
            <Column
              field="description"
              header="Descripción"
              body={(row) => (
                <span className="text-strong text-sm font-medium">{row.description}</span>
              )}
              sortable
            />
            <Column
              field="amount"
              header="Monto"
              body={(row) => {
                const config = getTypeConfig(row.type);
                return (
                  <span className={`text-sm font-bold ${config.amountClass}`}>
                    {config.sign}
                    {formatCurrency(row.amount)}
                  </span>
                );
              }}
              sortable
            />
            <Column header="Acciones" body={renderActions} />
          </DataTable>
        ) : (
          <p className="text-muted text-sm text-center py-8">No hay transacciones para este mes.</p>
        )}
      </div>

      <Dialog
        header="Editar Transacción"
        visible={Boolean(transactionToEdit)}
        style={{ width: "45vw" }}
        onHide={() => setTransactionToEdit(null)}
        breakpoints={{ "960px": "75vw", "640px": "90vw" }}
      >
        {transactionToEdit && (
          <EditTransactionForm
            transaction={transactionToEdit}
            onClose={() => setTransactionToEdit(null)}
          />
        )}
      </Dialog>

      <ConfirmDialog
        visible={Boolean(transactionToDelete)}
        loading={deleting}
        onHide={() => setTransactionToDelete(null)}
        onConfirm={handleDeleteConfirmed}
        message={`¿Estás seguro de que deseas eliminar la transacción "${transactionToDelete?.description}"?`}
      />
    </div>
  );
};
