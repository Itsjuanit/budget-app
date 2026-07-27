import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Menu } from "primereact/menu";
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

/** Cuántas tarjetas se muestran por página en mobile. */
const MOBILE_PAGE_SIZE = 10;

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
  const [page, setPage] = useState(0);

  // Menú de acciones de las tarjetas: uno solo para toda la lista, apuntando a
  // la transacción del botón que se tocó. La referencia evita que el menú abra
  // con la transacción anterior por el batching de React.
  const menuRef = useRef(null);
  const menuTargetRef = useRef(null);

  const filteredTransactions = useMemo(() => {
    const search = filterText.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filterType && t.type !== filterType) return false;
      if (search && !(t.description || "").toLowerCase().includes(search)) return false;
      return true;
    });
  }, [transactions, filterType, filterText]);

  const hasActiveFilters = Boolean(filterType || filterText);

  // Si un filtro deja menos páginas de las que había, se vuelve a la última válida
  // en vez de quedar en una página vacía.
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / MOBILE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  const clearFilters = () => {
    setFilterType(null);
    setFilterText("");
    setPage(0);
  };

  const menuItems = [
    {
      label: "Editar",
      icon: "pi pi-pencil",
      command: () => onEdit(menuTargetRef.current),
    },
    {
      label: "Eliminar",
      icon: "pi pi-trash",
      command: () => onDelete(menuTargetRef.current),
    },
  ];

  const openMenu = (event, transaction) => {
    menuTargetRef.current = transaction;
    menuRef.current?.toggle(event);
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

  const renderActions = (transaction) => (
    <div className="flex gap-1">
      <Button
        icon="pi pi-pencil"
        className="p-button-rounded p-button-text p-button-sm"
        tooltip="Editar"
        tooltipOptions={{ position: "top" }}
        aria-label="Editar transacción"
        onClick={() => onEdit(transaction)}
      />
      <Button
        icon="pi pi-trash"
        className="p-button-rounded p-button-text p-button-sm"
        tooltip="Eliminar"
        tooltipOptions={{ position: "top" }}
        aria-label="Eliminar transacción"
        onClick={() => onDelete(transaction)}
        severity="danger"
      />
    </div>
  );

  const renderCards = () => {
    const start = currentPage * MOBILE_PAGE_SIZE;
    const visible = filteredTransactions.slice(start, start + MOBILE_PAGE_SIZE);

    return (
      <div className="flex flex-col gap-2">
        <Menu model={menuItems} popup ref={menuRef} />

        {visible.map((transaction) => {
          const config = getTypeConfig(transaction.type);
          return (
            <div
              key={transaction.id}
              className="rounded-lg border border-border bg-surface px-3 py-2.5"
            >
              {/* Punto, descripción y monto centrados en la misma línea.
                  El grupo de la izquierda toma el espacio sobrante (flex-1) y el
                  monto nunca se encoge, así una descripción larga se recorta con
                  puntos suspensivos en vez de empujar el renglón. */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${config.dotClass}`}
                    aria-hidden="true"
                  />
                  <p
                    className="text-strong font-medium text-sm truncate"
                    title={transaction.description}
                  >
                    {transaction.description}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold whitespace-nowrap flex-shrink-0 ${config.amountClass}`}
                >
                  {config.sign}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>

              {/* Metadatos y acciones comparten renglón: antes los botones se
                  llevaban una fila entera casi vacía. */}
              <div className="flex items-center justify-between gap-3 pl-4">
                <p className="text-muted text-xs truncate">
                  {formatDate(transaction.date)} ·{" "}
                  {getCategoryLabel(transaction.category, customCategories)} · {config.label}
                </p>
                <Button
                  icon="pi pi-ellipsis-v"
                  className="p-button-rounded p-button-text p-button-sm flex-shrink-0"
                  aria-label={`Acciones de ${transaction.description}`}
                  aria-haspopup
                  onClick={(e) => openMenu(e, transaction)}
                />
              </div>
            </div>
          );
        })}

        {/* Paginador mínimo: el de PrimeReact no entra en pantallas angostas y
            partía los botones en dos líneas. Se oculta si hay una sola página. */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              icon="pi pi-chevron-left"
              className="p-button-rounded p-button-text p-button-sm"
              aria-label="Página anterior"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            />
            <span className="text-sm text-muted tabular-nums">
              {currentPage + 1} de {totalPages}
            </span>
            <Button
              icon="pi pi-chevron-right"
              className="p-button-rounded p-button-text p-button-sm"
              aria-label="Página siguiente"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setPage(currentPage + 1)}
            />
          </div>
        )}
      </div>
    );
  };

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
                  setPage(0);
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
                setPage(0);
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
