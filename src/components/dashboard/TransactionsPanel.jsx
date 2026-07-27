import { useEffect, useMemo, useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Paginator } from "primereact/paginator";
import { Tag } from "primereact/tag";
import { format } from "date-fns";
import { formatCurrency } from "@/utils/format";
import { getCategoryLabel } from "@/utils/categories";
import { getTypeConfig } from "@/utils/transactionDisplay";

const TYPE_FILTER_OPTIONS = [
  { label: "Todos", value: null },
  { label: "Ingreso", value: "income" },
  { label: "Ahorro", value: "savings" },
  { label: "Gasto", value: "expense" },
];

const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(query.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
};

const formatDate = (value) => {
  const date = new Date(value);
  return isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy");
};

/** Listado de transacciones del mes, con filtros. Tabla en desktop, cards en mobile. */
export const TransactionsPanel = ({ transactions, customCategories, onEdit, onDelete }) => {
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(10);

  const filteredTransactions = useMemo(() => {
    const search = filterText.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filterType && t.type !== filterType) return false;
      if (search && !(t.description || "").toLowerCase().includes(search)) return false;
      return true;
    });
  }, [transactions, filterType, filterText]);

  const hasActiveFilters = Boolean(filterType || filterText);

  const clearFilters = () => {
    setFilterType(null);
    setFilterText("");
    setFirst(0);
  };

  const renderAmount = (transaction) => {
    const config = getTypeConfig(transaction.type);
    return (
      <span className={`text-sm font-bold ${config.amountClass}`}>
        {config.sign}
        {formatCurrency(transaction.amount)}
      </span>
    );
  };

  const renderActions = (transaction, size = "p-button-sm") => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-pencil"
        className={`p-button-rounded p-button-text ${size}`}
        tooltip="Editar"
        tooltipOptions={{ position: "top" }}
        aria-label="Editar transacción"
        onClick={() => onEdit(transaction)}
      />
      <Button
        icon="pi pi-trash"
        className={`p-button-rounded p-button-text ${size}`}
        tooltip="Eliminar"
        tooltipOptions={{ position: "top" }}
        aria-label="Eliminar transacción"
        onClick={() => onDelete(transaction)}
        severity="danger"
      />
    </div>
  );

  const renderCards = () => (
    <div className="flex flex-col gap-3">
      {filteredTransactions.slice(first, first + rows).map((transaction) => {
        const config = getTypeConfig(transaction.type);
        return (
          <div key={transaction.id} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-strong font-medium text-sm">{transaction.description}</p>
                  <Tag value={config.label} severity={config.severity} className="text-xs" />
                </div>
                <p className="text-muted text-xs">
                  {formatDate(transaction.date)} ·{" "}
                  {getCategoryLabel(transaction.category, customCategories)}
                </p>
              </div>
              {renderAmount(transaction)}
            </div>
            <div className="flex gap-2 justify-end">{renderActions(transaction)}</div>
          </div>
        );
      })}
      <Paginator
        first={first}
        rows={rows}
        totalRecords={filteredTransactions.length}
        rowsPerPageOptions={[5, 10, 20]}
        onPageChange={(event) => {
          setFirst(event.first);
          setRows(event.rows);
        }}
        className="mt-2"
      />
    </div>
  );

  const renderTable = () => (
    <DataTable
      value={filteredTransactions}
      paginator
      rows={10}
      rowsPerPageOptions={[5, 10, 25, 50]}
      className="p-datatable-sm"
      emptyMessage="No hay transacciones este mes."
      stripedRows
    >
      <Column
        field="date"
        header="Fecha"
        body={(row) => <span className="text-secondary text-sm">{formatDate(row.date)}</span>}
        sortable
      />
      <Column
        field="description"
        header="Descripción"
        body={(row) => <span className="text-strong text-sm font-medium">{row.description}</span>}
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
        field="type"
        header="Tipo"
        body={(row) => {
          const config = getTypeConfig(row.type);
          return <Tag value={config.label} severity={config.severity} className="text-xs" />;
        }}
        sortable
      />
      <Column field="amount" header="Monto" body={renderAmount} sortable />
      <Column header="Acciones" body={(row) => renderActions(row)} />
    </DataTable>
  );

  return (
    <div className="rounded-xl border border-border bg-surface-raised p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-strong">
          Transacciones recientes
          {hasActiveFilters && (
            <span className="text-xs text-muted font-normal ml-2">
              ({filteredTransactions.length} de {transactions.length})
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button
              icon="pi pi-filter-slash"
              className="p-button-rounded p-button-text p-button-sm"
              tooltip="Limpiar filtros"
              tooltipOptions={{ position: "top" }}
              aria-label="Limpiar filtros"
              onClick={clearFilters}
              severity="secondary"
            />
          )}
          <Button
            icon="pi pi-filter"
            className={`p-button-rounded p-button-text p-button-sm ${
              showFilters ? "text-brand" : ""
            }`}
            tooltip="Filtros"
            tooltipOptions={{ position: "top" }}
            aria-label="Mostrar filtros"
            onClick={() => setShowFilters((visible) => !visible)}
          />
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4 p-3 rounded-lg border border-border bg-surface">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-xs text-subtle" htmlFor="filter-text">
              Buscar
            </label>
            <span className="p-input-icon-left w-full">
              <i className="pi pi-search text-subtle" />
              <InputText
                id="filter-text"
                value={filterText}
                onChange={(e) => {
                  setFilterText(e.target.value);
                  setFirst(0);
                }}
                placeholder="Buscar por descripción..."
                className="w-full p-inputtext-sm"
              />
            </span>
          </div>
          <div className="flex flex-col gap-1 sm:w-48">
            <label className="text-xs text-subtle" htmlFor="filter-type">
              Tipo
            </label>
            <Dropdown
              inputId="filter-type"
              value={filterType}
              options={TYPE_FILTER_OPTIONS}
              onChange={(e) => {
                setFilterType(e.value);
                setFirst(0);
              }}
              placeholder="Todos"
              className="w-full p-inputtext-sm"
            />
          </div>
        </div>
      )}

      {filteredTransactions.length > 0 ? (
        isMobile ? (
          renderCards()
        ) : (
          renderTable()
        )
      ) : (
        <p className="text-muted text-sm text-center py-8">
          {hasActiveFilters
            ? "No hay transacciones que coincidan con los filtros."
            : "No hay transacciones este mes."}
        </p>
      )}
    </div>
  );
};
