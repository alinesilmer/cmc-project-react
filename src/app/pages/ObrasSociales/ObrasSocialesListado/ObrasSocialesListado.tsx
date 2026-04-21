import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Eye, Pencil, Trash2, RefreshCw, ClipboardList } from "lucide-react";
import { listObrasSociales, deleteObraSocial } from "../obrasSociales.api";
import type { ObraSocialListItem } from "../obrasSociales.types";
import s from "./ObrasSocialesListado.module.scss";

const PAGE_SIZE = 15;

function formatFecha(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "short" });
  } catch {
    return iso;
  }
}

export default function ObrasSocialesListado() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ObraSocialListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listObrasSociales();
      setItems(data);
    } catch {
      setError("No se pudo cargar el listado. Intentá nuevamente.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch {
      setError("No se pudo eliminar la obra social.");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className={s.container}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerLeft}>
          <span className={s.headerIcon} aria-hidden="true">
            <ClipboardList size={28} />
          </span>
          <div>
            <h1 className={s.title}>Obras Sociales</h1>
            <p className={s.subtitle}>
              {loading
                ? "Cargando…"
                : `${filtered.length} obra${filtered.length !== 1 ? "s" : ""} social${filtered.length !== 1 ? "es" : ""} encontrada${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        <div className={s.headerActions}>
          <button
            type="button"
            className={s.btnSecondary}
            onClick={load}
            disabled={loading}
            aria-label="Actualizar listado"
            title="Actualizar"
          >
            <RefreshCw size={16} className={loading ? s.spinning : ""} />
            <span className={s.btnLabel}>Actualizar</span>
          </button>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => navigate("/panel/convenios/obras-sociales/alta")}
          >
            <Plus size={16} />
            <span className={s.btnLabel}>Nueva Obra Social</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={s.searchRow}>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} aria-hidden="true" />
          <input
            type="search"
            className={s.searchInput}
            placeholder="Buscar por nombre o número…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar obras sociales"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className={s.errorBanner} role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      <div className={s.tableWrapper}>
        {loading ? (
          <div className={s.loadingState}>
            <span className={s.spinner} aria-hidden="true" />
            <p>Cargando obras sociales…</p>
          </div>
        ) : paginated.length === 0 ? (
          <div className={s.emptyState}>
            <ClipboardList size={40} className={s.emptyIcon} />
            <p>
              {query
                ? "No se encontraron obras sociales con ese criterio."
                : "Todavía no hay obras sociales registradas."}
            </p>
            {!query && (
              <button
                type="button"
                className={s.btnPrimary}
                onClick={() => navigate("/panel/convenios/obras-sociales/alta")}
              >
                <Plus size={16} /> Registrar primera obra social
              </button>
            )}
          </div>
        ) : (
          <table className={s.table} aria-label="Listado de obras sociales">
            <thead>
              <tr>
                <th scope="col">Nº</th>
                <th scope="col">Denominación</th>
                <th scope="col" className={s.hideXs}>Condición IVA</th>
                <th scope="col" className={s.hideSm}>Contacto</th>
                <th scope="col" className={s.hideMd}>Alta convenio</th>
                <th scope="col" className={s.actionsCol}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((os) => (
                <tr key={os.id}>
                  <td className={s.nroCell}>{os.nro_obra_social}</td>
                  <td>
                    <span className={s.nameCell}>{os.nombre}</span>
                    <span className={s.denoCell}>{os.denominacion}</span>
                  </td>
                  <td className={s.hideXs}>
                    <span
                      className={
                        os.condicion_iva === "responsable_inscripto"
                          ? s.badgeA
                          : s.badgeB
                      }
                    >
                      {os.condicion_iva === "responsable_inscripto"
                        ? "Factura A"
                        : "Factura B"}
                    </span>
                  </td>
                  <td className={s.hideSm}>
                    <span className={s.contactLine}>{os.emails?.[0]?.valor ?? "—"}</span>
                    <span className={s.contactLine}>{os.telefonos?.[0]?.valor ?? ""}</span>
                  </td>
                  <td className={s.hideMd}>{formatFecha(os.fecha_alta_convenio)}</td>
                  <td>
                    <div className={s.actions}>
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() =>
                          navigate(`/panel/convenios/obras-sociales/${os.id}`)
                        }
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${os.nombre}`}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className={s.iconBtn}
                        onClick={() =>
                          navigate(
                            `/panel/convenios/obras-sociales/${os.id}/editar`
                          )
                        }
                        title="Editar"
                        aria-label={`Editar ${os.nombre}`}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className={`${s.iconBtn} ${s.iconBtnDanger}`}
                        onClick={() => setConfirmDeleteId(os.id)}
                        title="Eliminar"
                        aria-label={`Eliminar ${os.nombre}`}
                        disabled={deletingId === os.id}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className={s.pagination} role="navigation" aria-label="Paginación">
          <button
            type="button"
            className={s.pageBtn}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Anterior
          </button>
          <span className={s.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <button
            type="button"
            className={s.pageBtn}
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente ›
          </button>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDeleteId !== null && (
        <div
          className={s.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar eliminación"
        >
          <div className={s.modalBox}>
            <h2 className={s.modalTitle}>¿Eliminar obra social?</h2>
            <p className={s.modalText}>
              Esta acción no se puede deshacer. Se eliminará la obra social y
              todos sus datos asociados.
            </p>
            <div className={s.modalActions}>
              <button
                type="button"
                className={s.btnSecondary}
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={s.btnDanger}
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
              >
                {deletingId === confirmDeleteId ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
