import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  ListOrdered,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import styles from "./NomencladorCodigos.module.scss";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import {
  listNomenclador,
  toggleNomencladorActivo,
  deleteNomenclador,
  listNomencladorNacional,
} from "../nomenclador.api";
import { usePermisos } from "../../../auth/usePermisos";
import type { NomencladorOut, NomencladorNacionalOut, TipoCodigo } from "../nomenclador.types";
import { TIPOS_CODIGO } from "../components/tipoCodigo";

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

const RUTA_FORM = "/panel/nomenclador/codigos";

export default function NomencladorCodigos() {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermisos();
  const puedeEditar = can("nomenclador:editar");
  const [items, setItems] = useState<NomencladorOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filterComplejidad, setFilterComplejidad] = useState("");
  const [filterActivo, setFilterActivo] = useState("true");
  const [filterTipo, setFilterTipo] = useState<TipoCodigo | "">("");

  const [nnOpciones, setNnOpciones] = useState<NomencladorNacionalOut[]>([]);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const load = useCallback(
    async (p: number, q: string, comp: string, act: string, tipo: TipoCodigo | "") => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, size: PAGE_SIZE };
        if (q.trim()) params.q = q.trim();
        if (comp) params.complejidad = comp;
        if (act !== "") params.activo = act === "true";
        if (tipo) params.tipo = tipo;

        const data = await listNomenclador(params as Parameters<typeof listNomenclador>[0]);
        setItems(data);
        setHasMore(data.length === PAGE_SIZE);
      } catch {
        setItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Catálogo NN completo, para el combo de vínculo del modal.
  useEffect(() => {
    listNomencladorNacional({ activo: true, size: 200 })
      .then(setNnOpciones)
      .catch(() => setNnOpciones([]));
  }, []);

  // El formulario de alta/edición vuelve acá con su toast de éxito.
  useEffect(() => {
    const t = (location.state as { toast?: { type: "success" | "error"; msg: string } } | null)?.toast;
    if (!t) return;
    showToast(t.type, t.msg);
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(page, search, filterComplejidad, filterActivo, filterTipo);
    }, search.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, page, search, filterComplejidad, filterActivo, filterTipo]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function openCreate() {
    navigate(`${RUTA_FORM}/nuevo`);
  }

  function openEdit(item: NomencladorOut) {
    navigate(`${RUTA_FORM}/${item.id}/editar`);
  }

  async function handleToggle(item: NomencladorOut) {
    try {
      const updated = await toggleNomencladorActivo(item.id, !item.activo);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      showToast("success", `Código ${updated.activo ? "activado" : "desactivado"}.`);
    } catch {
      showToast("error", "No se pudo cambiar el estado.");
    }
  }

  async function doDelete() {
    if (deleteTargetId === null) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      await deleteNomenclador(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("success", "Código eliminado.");
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } };
      if (err?.response?.status === 409) {
        showToast("error", err.response.data?.detail ?? "No se puede eliminar: tiene valores activos.");
      } else {
        showToast("error", err?.response?.data?.detail ?? "No se pudo eliminar el código.");
      }
    }
  }

  function handleDelete(id: number) {
    setDeleteTargetId(id);
  }

  const ComplejidadBadge = useMemo(() => {
    return ({ v }: { v: string | null }) => {
      if (!v) return <span className={styles.badge}>—</span>;
      return <span className={`${styles.badge} ${styles[v]}`}>{v}</span>;
    };
  }, []);

  const nnPorId = useMemo(() => new Map(nnOpciones.map((o) => [o.id, o])), [nnOpciones]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><ListOrdered size={20} /></span>
          <div>
            <h1 className={styles.title}>Gestión de Códigos</h1>
            <p className={styles.subtitle}>Catálogo maestro de prestaciones médicas del Colegio</p>
          </div>
        </div>
      </div>

      <div className={styles.body}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className={styles.filterSelect}
            value={filterTipo}
            onChange={(e) => { setFilterTipo(e.target.value as TipoCodigo | ""); setPage(1); }}
            aria-label="Tipo"
          >
            <option value="">Todos los tipos</option>
            {TIPOS_CODIGO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>

          <select
            className={styles.filterSelect}
            value={filterComplejidad}
            onChange={(e) => { setFilterComplejidad(e.target.value); setPage(1); }}
          >
            <option value="">Todas las complejidades</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>

          <select
            className={styles.filterSelect}
            value={filterActivo}
            onChange={(e) => { setFilterActivo(e.target.value); setPage(1); }}
          >
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
            <option value="">Todos</option>
          </select>

          {puedeEditar && (
            <button className={styles.btnPrimary} onClick={openCreate}>
              <Plus size={15} /> Nuevo código
            </button>
          )}
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nomenclador Nacional</th>
                <th>Categoría</th>
                <th>Complejidad</th>
                <th>Estado</th>
                <th className={styles.thActions}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className={styles.loadingCell}>Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Sin resultados</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><span className={styles.codeCell}>{item.codigo}</span></td>
                  <td>
                    {item.nomenclador_nacional_id != null
                      ? (nnPorId.get(item.nomenclador_nacional_id)?.codigo ?? item.nomenclador_nacional_id)
                      : <span style={{ color: "#718096" }}>—</span>}
                  </td>
                  <td>{item.categoria ?? <span style={{ color: "#718096" }}>—</span>}</td>
                  <td><ComplejidadBadge v={item.complejidad} /></td>
                  <td>
                    <span className={`${styles.badge} ${item.activo ? styles.activo : styles.inactivo}`}>
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <button
                      className={`${styles.btnToggle} ${!item.activo ? styles.inactive : ""}`}
                      onClick={() => handleToggle(item)}
                      title={item.activo ? "Desactivar" : "Activar"}
                    >
                      {item.activo ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                    </button>
                    {puedeEditar && (
                      <button className={styles.btnEdit} onClick={() => openEdit(item)} title="Editar">
                        <Edit2 size={13} />
                      </button>
                    )}
                    <button className={styles.btnDanger} onClick={() => handleDelete(item.id)} title="Eliminar">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className={styles.cardList}>
          {loading ? (
            <p className={styles.emptyText}>Cargando…</p>
          ) : items.length === 0 ? (
            <p className={styles.emptyText}>Sin resultados</p>
          ) : items.map((item) => (
            <div key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.codeCell}>{item.codigo}</span>
                <span className={`${styles.badge} ${item.activo ? styles.activo : styles.inactivo}`}>
                  {item.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
              <div className={styles.cardMeta}>
                {item.categoria && <span className={styles.badge}>{item.categoria}</span>}
                {item.complejidad && <ComplejidadBadge v={item.complejidad} />}
              </div>
              <div className={styles.cardActions}>
                {puedeEditar && (
                  <button className={styles.btnEdit} onClick={() => openEdit(item)}><Edit2 size={13} /> Editar</button>
                )}
                <button className={styles.btnDanger} onClick={() => handleDelete(item.id)}><Trash2 size={13} /> Eliminar</button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className={styles.paginationBar}>
          <span>Página {page}</span>
          <div className={styles.paginationButtons}>
            <button className={styles.btnPage} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
            </button>
            <button className={styles.btnPage} disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteTargetId !== null}
        variant="danger"
        title="Eliminar código"
        message="¿Eliminar este código permanentemente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
