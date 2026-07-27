import { useRef, useState } from "react";
import { Dialog } from "primereact/dialog";
import { Toast } from "primereact/toast";
import { Wallet, TrendingUp, PiggyBank, Landmark } from "lucide-react";
import { useTransactions } from "@/context/TransactionsProvider";
import { useMonthlyTotals } from "@/hooks/useMonthlyTotals";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { formatCurrency } from "@/utils/format";
import { EditTransactionForm } from "./EditTransactionForm";
import { ConfirmDialog } from "./ConfirmDialog";
import { BudgetProgress } from "./BudgetProgress";
import { MonthNavigator } from "./dashboard/MonthNavigator";
import { SummaryCards, CARD_TONES, balanceTone } from "./dashboard/SummaryCards";
import { SavingsBreakdown } from "./dashboard/SavingsBreakdown";
import { ExpensesChart } from "./dashboard/ExpensesChart";
import { TransactionsPanel } from "./dashboard/TransactionsPanel";

export const Dashboard = () => {
  const {
    transactions,
    customCategories,
    budgets,
    selectedMonth,
    canGoToNextMonth,
    isCurrentMonth,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    deleteTransaction,
  } = useTransactions();

  const totals = useMonthlyTotals(transactions, customCategories);
  const toast = useRef(null);

  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useBudgetAlerts({
    transactions,
    budgets,
    customCategories,
    month: selectedMonth,
    toastRef: toast,
  });

  const handleDelete = async () => {
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
        detail: "Hubo un problema al eliminar la transacción.",
        life: 3000,
      });
    } finally {
      setDeleting(false);
    }
  };

  const summaryCards = [
    {
      icon: <Wallet className="w-8 h-8" />,
      label: "Gastos mensuales",
      value: formatCurrency(totals.totalExpenses),
      ...CARD_TONES.red,
    },
    {
      icon: <PiggyBank className="w-8 h-8" />,
      label: "Ahorro depositado",
      value: formatCurrency(totals.totalSavings),
      ...CARD_TONES.blue,
    },
    {
      icon: <Landmark className="w-8 h-8" />,
      label: "Disponible",
      value: formatCurrency(totals.available),
      ...balanceTone(totals.available),
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      label: "% destinado a ahorro",
      value: `${totals.savingsPercentage}%`,
      ...CARD_TONES.purple,
    },
  ];

  return (
    <div>
      <Toast ref={toast} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <h1 className="text-2xl font-bold text-strong">Análisis del gasto</h1>
        <MonthNavigator
          month={selectedMonth}
          canGoNext={canGoToNextMonth}
          isCurrentMonth={isCurrentMonth}
          onPrevious={goToPreviousMonth}
          onNext={goToNextMonth}
          onToday={goToCurrentMonth}
        />
      </div>

      <SummaryCards cards={summaryCards} />

      <BudgetProgress transactions={transactions} />

      <SavingsBreakdown
        totalSavings={totals.totalSavings}
        totalIncome={totals.totalIncome}
        savingsPercentage={totals.savingsPercentage}
        byCategory={totals.savingsByCategory}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ExpensesChart
          expensesByCategory={totals.expensesByCategory}
          expensesByGroup={totals.expensesByGroup}
        />
        <TransactionsPanel
          transactions={transactions}
          customCategories={customCategories}
          onEdit={setTransactionToEdit}
          onDelete={setTransactionToDelete}
        />
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
        onConfirm={handleDelete}
        message={`¿Estás seguro de que deseas eliminar la transacción "${transactionToDelete?.description}"?`}
      />
    </div>
  );
};
