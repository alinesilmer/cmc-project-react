import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ClipboardList, Download, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import Franja from "@/app/components/layout/Franja/Franja";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import { listObrasSociales, deleteObraSocial } from "../obrasSociales.api";
import { OBRAS_SOCIALES_KEY } from "../useObrasSociales";
import type { ObraSocialListItem } from "../obrasSociales.types";
import ExportPanel from "../export/ExportPanel";
// `new Date("2025-05-30")` se parsea como UTC y mostraba el día anterior en Argentina.
import { formatFecha } from "@/app/shared/lib/fechas";
import s from "./ObrasSocialesListado.module.scss";
import Button from "@/app/components/ui/Button/Button";
import SearchField from "@/app/components/ui/SearchField/SearchField";

const PAGE_SIZE = 15;

export default function ObrasSocialesListado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const queryClient = useQueryClient();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Deep link desde Actualizaciones de Valores: `?q=<nro>` llega acá y antes se perdía porque el estado siempre arrancaba vacío.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  // Mismo deep link: si la obra social buscada está de baja (o si nunca tuvo fila en el catálogo).
  const incluirInactivas = searchParams.get("incluir_inactivas") === "true";
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [showExport, setShowExport] = useState(false);

  // Misma clave que el combo de `useObrasSociales`, así que entrar acá muestra lo que ya está en caché.
  const queryKey = incluirInactivas
    ? ([...OBRAS_SOCIALES_KEY, "con-inactivas"] as const)
    : OBRAS_SOCIALES_KEY;
  const consulta = useQuery<ObraSocialListItem[]>({
    queryKey,
    queryFn: () => listObrasSociales(undefined, incluirInactivas),
  });
  const items = useMemo(() => consulta.data ?? [], [consulta.data]);
  const loading = consulta.isPending;
  const error =
    deleteError ??
    (consulta.isError ? "No se pudo cargar el listado. Intentá nuevamente." : null);

  const load = () => {
    setDeleteError(null);
    void consulta.refetch();
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.nombre.toLowerCase().includes(q) ||
        String(it.nro_obra_social).includes(q) ||
        it.denominacion.toLowerCase().includes(q)
    );
  }, [items, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteObraSocial(id);
      queryClient.setQueryData<ObraSocialListItem[]>(queryKey, (prev) =>
        prev?.filter((it) => it.id !== id)
      );
      // Vence también el combo que comparten Auditoría y Nomenclador: sin esto seguía ofreciendo la obra social borrada hasta diez minutos.
      void queryClient.invalidateQueries({ queryKey: OBRAS_SOCIALES_KEY });
    } catch {
      setDeleteError("No se pudo eliminar la obra social.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className={s.container}>
      <Franja titulo="Obras sociales" icono={ClipboardList} />

      <div className={s.barra}>
        <SearchField
          placeholder="Buscar por nombre o número…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
        />

        <div className={s.acciones}>
          <Button
            variant="ghost"
            size="md"
            onClick={load}
            disabled={consulta.isFetching}
            leftIcon={<RefreshCw size={18} aria-hidden="true" className={consulta.isFetching ? s.spinning : ""} />}
          >
            Actualizar
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => setShowExport(true)}
            disabled={loading || items.length === 0}
            leftIcon={<Download size={18} aria-hidden="true" />}
          >
            Exportar
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => navigate("/panel/convenios/obras-sociales/alta")}
            leftIcon={<Plus size={18} aria-hidden="true" />}
          >
            Nueva
          </Button>
        </div>
      </div>

      {error && (
        <div className={s.errorBanner} role="alert">
          {error}
        </div>
      )}

      <div className={s.tableWrapper}>
        {loading ? (
          <div className={s.loadingState}>
            <span className={s.spinner} aria-hidden="true" />
            <p>Cargando…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className={s.emptyState}>
            <ClipboardList size={40} className={s.emptyIcon} />
            <p>
              {query ? "Nada coincide con la búsqueda." : "Todavía no hay obras sociales."}
            </p>
            {!query && (
              <Button
                variant="primary"
                size="md"
                onClick={() => navigate("/panel/convenios/obras-sociales/alta")}
                leftIcon={<Plus size={16} />}
              >
                Nueva obra social
              </Button>
            )}
          </div>
        ) : (
          <Tabla aria-label="Listado de obras sociales">
            <thead>
              <tr>
                <th scope="col">Nº</th>
                <th scope="col">Obra social</th>
                <th scope="col" className={s.hideXs}>Factura</th>
                <th scope="col" className={s.hideSm}>Contacto</th>
                <th scope="col" className={s.hideMd}>Alta convenio</th>
                <th scope="col" className={s.actionsCol} />
              </tr>
            </thead>
            <tbody>
              {paginated.map((os) => (
                <tr key={os.id}>
                  <td className={s.nroCell}>{os.nro_obra_social}</td>
                  <td>
                    <span className={s.nameCell}>{os.nombre}</span>
                  </td>
                  <td className={s.hideXs}>
                    {os.condicion_iva == null ? (
                      <span className={s.sinDato}>—</span>
                    ) : (
                      <span
                        className={
                          os.condicion_iva === "responsable_inscripto"
                            ? s.badgeA
                            : s.badgeB
                        }
                      >
                        {os.condicion_iva === "responsable_inscripto"
                          ? "A"
                          : "B"}
                      </span>
                    )}
                  </td>
                  <td className={s.hideSm}>
                    <span className={s.contactLine}>{os.emails?.[0]?.valor ?? "—"}</span>
                    <span className={s.contactLine}>{os.telefonos?.[0]?.valor ?? ""}</span>
                  </td>
                  <td className={s.hideMd}>{os.fecha_alta_convenio ? formatFecha(os.fecha_alta_convenio) : ''}</td>
                  <td>
                    <div className={s.actions}>
                      <BotonVer
                        onClick={() => navigate(`/panel/convenios/obras-sociales/${os.id}`)}
                        etiqueta={`Ver ${os.nombre}`}
                      />
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() => navigate(`/panel/convenios/obras-sociales/${os.id}/editar`)}
                        title="Editar"
                        aria-label={`Editar ${os.nombre}`}
                      >
                        <Pencil size={18} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className={s.iconBtnDanger}
                        onClick={() => setConfirmDeleteId(os.id)}
                        title="Eliminar"
                        aria-label={`Eliminar ${os.nombre}`}
                        disabled={deletingId === os.id}
                      >
                        <Trash2 size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className={s.pagination} role="navigation" aria-label="Paginación">
          <Button
            variant="ghost"
            size="md"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            leftIcon={<ChevronLeft size={18} aria-hidden="true" />}
          >
            Anterior
          </Button>
          <span className={s.pageInfo}>
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="md"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            rightIcon={<ChevronRight size={18} aria-hidden="true" />}
          >
            Siguiente
          </Button>
        </div>
      )}

      {showExport && (
        <ExportPanel items={items} onClose={() => setShowExport(false)} />
      )}

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        title="¿Eliminar obra social?"
        message="Deja de aparecer en listados y selectores y no se le pueden cargar prestaciones nuevas. No se borra ningún dato."
        confirmLabel={deletingId !== null ? "Eliminando…" : "Sí, eliminar"}
        variant="danger"
        onConfirm={() => confirmDeleteId !== null && void handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
