import { formatCurrency } from "@/utils/format";

/**
 * Explica de dónde sale la diferencia entre "gastos del mes" y "disponible".
 *
 * Los gastos por categoría cuentan sólo transacciones (para que cuadren con el
 * gráfico), así que sin este detalle el disponible parecería no cerrar cuando
 * hay proyectos incluidos.
 */
export const ProjectsImpact = ({ projects, total }) => {
  const included = projects.filter((p) => p.includeInBalance && p.spent > 0);
  if (included.length === 0) return null;

  return (
    <div className="rounded-xl border border-ring-primary bg-tint-primary p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <i className="pi pi-folder text-brand flex-shrink-0" />
          <h3 className="text-sm font-semibold text-strong truncate">
            Proyectos incluidos en el balance
          </h3>
        </div>
        <span className="text-sm font-bold text-expense whitespace-nowrap flex-shrink-0">
          −{formatCurrency(total)}
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {included.map((project) => (
          <li key={project.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted truncate">{project.name}</span>
            <span className="text-secondary whitespace-nowrap flex-shrink-0">
              {formatCurrency(project.spent)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-subtle mt-2 pt-2 border-t border-border">
        Ya descontados del disponible. No entran en el gráfico por categoría.
      </p>
    </div>
  );
};
