import { useMemo, useRef, useState } from "react";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Toast } from "primereact/toast";
import { useTransactions } from "@/context/TransactionsProvider";
import { formatCurrency } from "@/utils/format";
import { formatMonth } from "@/utils/months";
import { ConfirmDialog } from "../ConfirmDialog";
import { ProjectCard } from "./ProjectCard";
import { ProjectForm } from "./ProjectForm";
import { ProjectDetail } from "./ProjectDetail";

const ALL_MONTHS = "__todos__";

export const ProjectsTab = () => {
  const { projects, addProject, updateProject, deleteProject, setProjectIncludeInBalance } =
    useTransactions();

  const [monthFilter, setMonthFilter] = useState(ALL_MONTHS);
  const [formVisible, setFormVisible] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [openProject, setOpenProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const toast = useRef(null);

  // Sólo se ofrecen los meses que realmente tienen proyectos.
  const monthOptions = useMemo(() => {
    const months = [...new Set(projects.map((p) => p.monthYear))].sort().reverse();
    return [
      { label: "Todos los meses", value: ALL_MONTHS },
      ...months.map((m) => ({ label: formatMonth(m), value: m })),
    ];
  }, [projects]);

  const visibleProjects = useMemo(
    () =>
      monthFilter === ALL_MONTHS ? projects : projects.filter((p) => p.monthYear === monthFilter),
    [projects, monthFilter]
  );

  // El detalle se relee de la lista para que refleje los totales al instante
  // cuando se agrega o borra un gasto adentro del diálogo.
  const openProjectLive = openProject
    ? projects.find((p) => p.id === openProject.id) || null
    : null;

  const notify = (severity, summary, detail) =>
    toast.current?.show({ severity, summary, detail, life: 3500 });

  const handleCreate = async (data) => {
    await addProject(data);
    notify("success", "Proyecto creado", `«${data.name}» está listo para cargarle gastos.`);
  };

  const handleEdit = async (data) => {
    await updateProject(projectToEdit.id, data);
    notify("success", "Proyecto actualizado", `Se guardaron los cambios de «${data.name}».`);
  };

  const handleToggleBalance = async (project, include) => {
    setBusyId(project.id);
    try {
      await setProjectIncludeInBalance(project.id, include);
      notify(
        "success",
        include ? "Incluido en el balance" : "Excluido del balance",
        include
          ? `${formatCurrency(project.spent)} se descuentan de ${formatMonth(project.monthYear)}.`
          : `«${project.name}» ya no afecta ningún balance.`
      );
    } catch (error) {
      console.error("Error cambiando el impacto del proyecto:", error);
      notify("error", "Error", "No se pudo cambiar el impacto en el balance.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeleting(true);
    try {
      await deleteProject(projectToDelete.id);
      notify("success", "Proyecto eliminado", `Se eliminó «${projectToDelete.name}» y sus gastos.`);
      setProjectToDelete(null);
    } catch (error) {
      console.error("Error eliminando el proyecto:", error);
      notify("error", "Error", "No se pudo eliminar el proyecto.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Toast ref={toast} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-strong">Proyectos</h2>
          <p className="text-muted text-sm mt-1">
            Agrupá los gastos de algo puntual —un viaje, una mudanza— y decidí si impactan en el
            balance del mes.
          </p>
        </div>
        <Button
          label="Nuevo proyecto"
          icon="pi pi-plus"
          className="p-button-sm flex-shrink-0"
          severity="success"
          onClick={() => {
            setProjectToEdit(null);
            setFormVisible(true);
          }}
        />
      </div>

      {projects.length > 0 && (
        <Dropdown
          value={monthFilter}
          options={monthOptions}
          onChange={(e) => setMonthFilter(e.value)}
          className="w-full sm:w-56"
          aria-label="Filtrar por mes"
        />
      )}

      {visibleProjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              busy={busyId === project.id}
              onOpen={setOpenProject}
              onEdit={(p) => {
                setProjectToEdit(p);
                setFormVisible(true);
              }}
              onDelete={setProjectToDelete}
              onToggleBalance={handleToggleBalance}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface-raised p-10 text-center">
          <i className="pi pi-folder-open text-4xl text-border mb-3" />
          <p className="text-muted text-sm">
            {projects.length === 0
              ? "Todavía no creaste ningún proyecto."
              : "No hay proyectos en el mes seleccionado."}
          </p>
          {projects.length === 0 && (
            <p className="text-subtle text-xs mt-1">
              Sirven para juntar los gastos de un viaje, una obra o cualquier cosa puntual.
            </p>
          )}
        </div>
      )}

      <ProjectForm
        visible={formVisible}
        project={projectToEdit}
        onHide={() => {
          setFormVisible(false);
          setProjectToEdit(null);
        }}
        onSubmit={projectToEdit ? handleEdit : handleCreate}
      />

      <ProjectDetail project={openProjectLive} onHide={() => setOpenProject(null)} />

      <ConfirmDialog
        visible={Boolean(projectToDelete)}
        loading={deleting}
        onHide={() => setProjectToDelete(null)}
        onConfirm={handleDelete}
        message={`¿Eliminar «${projectToDelete?.name}»? Se borran también sus ${
          projectToDelete?.spent ? "gastos cargados" : "gastos"
        }, y deja de impactar en el balance.`}
      />
    </div>
  );
};
