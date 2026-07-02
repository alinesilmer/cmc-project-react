import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Eye, Pencil, Trash2, RefreshCw, ClipboardList, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "../../../components/atoms/Table/Table";
import IconButton from "../../../components/atoms/IconButton/IconButton";
import { listObrasSociales, deleteObraSocial } from "../obrasSociales.api";
import type { ObraSocialListItem } from "../obrasSociales.types";
import ExportPanel from "../export/ExportPanel";
import s from "./ObrasSocialesListado.module.scss";
import Button from "../../../components/atoms/Button/Button";
import SearchField from "../../../components/molecules/SearchField/SearchField";

const PAGE_SIZE = 15;

// Square, bordered icon button to keep the original .iconBtn look on MUI IconButton.
const iconBtnSx = {
  width: 28,
  height: 28,
  borderRadius: "0.45rem",
  border: "1px solid #e2e8f0",
  color: "#64748b",
  "&:hover": {
    backgroundColor: "rgba(173, 162, 198, 0.15)",
    color: "#7B6CA8",
    borderColor: "rgba(137,124,172,0.5)",
  },
} as const;

const iconBtnDangerSx = {
  ...iconBtnSx,
  "&:hover": {
    backgroundColor: "#fff0f0",
    color: "#cc2a2a",
    borderColor: "#cc2a2a",
  },
} as const;

// Purple/lilac header — the background lives on the CELLS (not the row) so it
// always paints under MUI + border-collapse. Applies only to this table.
const headCellSx = {
  color: "#ffffff",
  backgroundColor: "#816eb0",
  fontWeight: 600,
  fontSize: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  whiteSpace: "nowrap",
  borderBottom: "none",
} as const;

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
  const [showExport, setShowExport] = useState(false);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={load}
            disabled={loading}
            aria-label="Actualizar listado"
            title="Actualizar"
            leftIcon={<RefreshCw size={16} className={loading ? s.spinning : ""} />}
          >
            <span className={s.btnLabel}>Actualizar</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowExport(true)}
            disabled={loading || items.length === 0}
            title="Exportar"
            leftIcon={<Download size={16} />}
          >
            <span className={s.btnLabel}>Exportables</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate("/panel/convenios/obras-sociales/alta")}
            leftIcon={<Plus size={16} />}
          >
            <span className={s.btnLabel}>Nueva Obra Social</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className={s.searchRow}>
        <div className={s.searchWrap}>
          <SearchField
            fullWidth
            placeholder="Buscar por nombre o número…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate("/panel/convenios/obras-sociales/alta")}
                leftIcon={<Plus size={16} />}
              >
                Registrar primera obra social
              </Button>
            )}
          </div>
        ) : (
          <Table className={s.table} aria-label="Listado de obras sociales">
            <TableHead>
              <TableRow>
                <TableCell component="th" scope="col" sx={headCellSx}>Nº</TableCell>
                <TableCell component="th" scope="col" sx={headCellSx}>Denominación</TableCell>
                <TableCell component="th" scope="col" className={s.hideXs} sx={headCellSx}>Condición IVA</TableCell>
                <TableCell component="th" scope="col" className={s.hideSm} sx={headCellSx}>Contacto</TableCell>
                <TableCell component="th" scope="col" className={s.hideMd} sx={headCellSx}>Alta convenio</TableCell>
                <TableCell component="th" scope="col" className={s.actionsCol} sx={headCellSx}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((os) => (
                <TableRow key={os.id}>
                  <TableCell className={s.nroCell}>{os.nro_obra_social}</TableCell>
                  <TableCell>
                    <span className={s.nameCell}>{os.nombre}</span>
                    <span className={s.denoCell}>{os.denominacion}</span>
                  </TableCell>
                  <TableCell className={s.hideXs}>
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
                  </TableCell>
                  <TableCell className={s.hideSm}>
                    <span className={s.contactLine}>{os.emails?.[0]?.valor ?? "—"}</span>
                    <span className={s.contactLine}>{os.telefonos?.[0]?.valor ?? ""}</span>
                  </TableCell>
                  <TableCell className={s.hideMd}>{os.fecha_alta_convenio ? formatFecha(os.fecha_alta_convenio) : ''}</TableCell>
                  <TableCell>
                    <div className={s.actions}>
                      <IconButton
                        size="small"
                        sx={iconBtnSx}
                        onClick={() =>
                          navigate(`/panel/convenios/obras-sociales/${os.id}`)
                        }
                        title="Ver detalle"
                        aria-label={`Ver detalle de ${os.nombre}`}
                      >
                        <Eye size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={iconBtnSx}
                        onClick={() =>
                          navigate(
                            `/panel/convenios/obras-sociales/${os.id}/editar`
                          )
                        }
                        title="Editar"
                        aria-label={`Editar ${os.nombre}`}
                      >
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        size="small"
                        sx={iconBtnDangerSx}
                        onClick={() => setConfirmDeleteId(os.id)}
                        title="Eliminar"
                        aria-label={`Eliminar ${os.nombre}`}
                        disabled={deletingId === os.id}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className={s.pagination} role="navigation" aria-label="Paginación">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹ Anterior
          </Button>
          <span className={s.pageInfo}>
            Página {page} de {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente ›
          </Button>
        </div>
      )}

      {/* Export panel */}
      {showExport && (
        <ExportPanel items={items} onClose={() => setShowExport(false)} />
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
              <Button
                variant="ghost"
                onClick={() => setConfirmDeleteId(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
              >
                {deletingId === confirmDeleteId ? "Eliminando…" : "Sí, eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
