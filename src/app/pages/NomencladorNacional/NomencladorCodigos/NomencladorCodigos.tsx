import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X as XIcon,
  Save,
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
import ConfirmModal from "../../../components/atoms/ConfirmModal/ConfirmModal";
import {
  listNomenclador,
  createNomenclador,
  updateNomenclador,
  toggleNomencladorActivo,
  deleteNomenclador,
  getNomencladorById,
  listNomencladorEspecialidadesResumen,
} from "../nomenclador.api";
import type {
  NomencladorOut,
  NomencladorCreatePayload,
  NomencladorEspecialidadResumenOut,
} from "../nomenclador.types";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import type { Especialidad } from "../../Especialidades/especialidades.types";
import EspecialidadCombo from "../EspecialidadCombo";

// ─── Types ────────────────────────────────────────────────────────────────────

type Complejidad = "baja" | "media" | "alta";

type FormState = {
  codigo: string;
  descripcion: string;
  categoria: string;
  complejidad: Complejidad | "";
  sin_restriccion_especialidad: boolean;
  unidades_honorarios: string;
  unidades_ayudante: string;
  unidades_gastos: string;
  observacion: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): FormState {
  return {
    codigo: "",
    descripcion: "",
    categoria: "",
    complejidad: "",
    sin_restriccion_especialidad: false,
    unidades_honorarios: "",
    unidades_ayudante: "",
    unidades_gastos: "",
    observacion: "",
  };
}

function itemToForm(item: NomencladorOut): FormState {
  return {
    codigo: item.codigo,
    descripcion: item.descripcion,
    categoria: item.categoria ?? "",
    complejidad: (item.complejidad as Complejidad | "") ?? "",
    sin_restriccion_especialidad: item.sin_restriccion_especialidad,
    unidades_honorarios: item.unidades_honorarios ?? "",
    unidades_ayudante: item.unidades_ayudante ?? "",
    unidades_gastos: item.unidades_gastos ?? "",
    observacion: item.observacion ?? "",
  };
}

function nullableNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NomencladorCodigos() {
  const [items, setItems] = useState<NomencladorOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filterComplejidad, setFilterComplejidad] = useState("");
  const [filterActivo, setFilterActivo] = useState("true");
  const [filterEspecialidad, setFilterEspecialidad] = useState(""); // id_colegio_espe ("" = sin filtro)
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([]);
  const [espItems, setEspItems] = useState<NomencladorEspecialidadResumenOut[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const load = useCallback(
    async (p: number, q: string, comp: string, act: string, esp: string) => {
      setLoading(true);
      try {
        if (esp) {
          // Modo especialidad: la fuente es el endpoint enriquecido código↔especialidad.
          const params: Record<string, unknown> = {
            page: p,
            size: PAGE_SIZE,
            especialidad_id_colegio: Number(esp),
          };
          if (q.trim()) params.q = q.trim();
          if (act !== "") params.activo = act === "true";

          const data = await listNomencladorEspecialidadesResumen(
            params as Parameters<typeof listNomencladorEspecialidadesResumen>[0],
          );
          setEspItems(data);
          setItems([]);
          setHasMore(data.length === PAGE_SIZE);
        } else {
          const params: Record<string, unknown> = { page: p, size: PAGE_SIZE };
          if (q.trim()) params.q = q.trim();
          if (comp) params.complejidad = comp;
          if (act !== "") params.activo = act === "true";

          const data = await listNomenclador(params as Parameters<typeof listNomenclador>[0]);
          setItems(data);
          setEspItems([]);
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch {
        setItems([]);
        setEspItems([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Catálogo de especialidades para el filtro.
  useEffect(() => {
    getEspecialidades().then(setEspecialidades).catch(() => setEspecialidades([]));
  }, []);

  // Debounce search; also triggers on page/filter changes via deps
  useEffect(() => {
    const t = setTimeout(() => {
      load(page, search, filterComplejidad, filterActivo, filterEspecialidad);
    }, search.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, page, search, filterComplejidad, filterActivo, filterEspecialidad]);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(item: NomencladorOut) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setErrors({});
    setModalOpen(true);
  }

  // En modo especialidad las filas son pares (sin todos los campos del código),
  // así que traemos el código completo antes de abrir el editor.
  async function openEditFromEsp(row: NomencladorEspecialidadResumenOut) {
    try {
      const full = await getNomencladorById(row.nomenclador_id);
      openEdit(full);
    } catch {
      showToast("error", "No se pudo cargar el código.");
    }
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.codigo.trim()) errs.codigo = "Requerido";
    if (!form.descripcion.trim()) errs.descripcion = "Requerido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: NomencladorCreatePayload = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria.trim() || null,
        complejidad: (form.complejidad as "baja" | "media" | "alta") || null,
        sin_restriccion_especialidad: form.sin_restriccion_especialidad,
        unidades_honorarios: nullableNum(form.unidades_honorarios),
        unidades_ayudante: nullableNum(form.unidades_ayudante),
        unidades_gastos: nullableNum(form.unidades_gastos),
        observacion: form.observacion.trim() || null,
      };

      if (editingId) {
        const updated = await updateNomenclador(editingId, payload);
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        setEspItems((prev) =>
          prev.map((r) =>
            r.nomenclador_id === editingId
              ? { ...r, codigo: updated.codigo, descripcion: updated.descripcion }
              : r,
          ),
        );
        showToast("success", "Código actualizado.");
      } else {
        const created = await createNomenclador(payload);
        setItems((prev) => [created, ...prev]);
        showToast("success", "Código creado.");
      }
      closeModal();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo guardar el código.");
    } finally {
      setSaving(false);
    }
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
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo eliminar el código.");
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

  const espMode = filterEspecialidad !== "";

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><ListOrdered size={20} /></span>
          <div>
            <h1 className={styles.title}>Gestión de Códigos</h1>
            <p className={styles.subtitle}>Catálogo maestro de prestaciones médicas</p>
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
              placeholder="Buscar por código o descripción…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <EspecialidadCombo
            especialidades={especialidades}
            value={filterEspecialidad ? Number(filterEspecialidad) : null}
            onChange={(v) => { setFilterEspecialidad(v === null ? "" : String(v)); setPage(1); }}
          />

          <select
            className={styles.filterSelect}
            value={filterComplejidad}
            disabled={espMode}
            title={espMode ? "No disponible al filtrar por especialidad" : undefined}
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

          <button className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Nuevo código
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              {espMode ? (
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Especialidad</th>
                  <th className={styles.thActions}>Acciones</th>
                </tr>
              ) : (
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Complejidad</th>
                  <th>Estado</th>
                  <th className={styles.thActions}>Acciones</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={espMode ? 4 : 6} className={styles.loadingCell}>Cargando…</td></tr>
              ) : espMode ? (
                espItems.length === 0 ? (
                  <tr><td colSpan={4} className={styles.emptyCell}>Sin resultados</td></tr>
                ) : espItems.map((row) => (
                  <tr key={`esp-${row.id}`}>
                    <td><span className={styles.codeCell}>{row.codigo}</span></td>
                    <td>{row.descripcion}</td>
                    <td>{row.especialidad ?? <span style={{ color: "#718096" }}>—</span>}</td>
                    <td className={styles.actionsCell}>
                      <button className={styles.btnEdit} onClick={() => openEditFromEsp(row)} title="Editar código">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className={styles.emptyCell}>Sin resultados</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td><span className={styles.codeCell}>{item.codigo}</span></td>
                  <td>{item.descripcion}</td>
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
                    <button className={styles.btnEdit} onClick={() => openEdit(item)} title="Editar">
                      <Edit2 size={13} />
                    </button>
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
          ) : espMode ? (
            espItems.length === 0 ? (
              <p className={styles.emptyText}>Sin resultados</p>
            ) : espItems.map((row) => (
              <div key={`esp-${row.id}`} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.codeCell}>{row.codigo}</span>
                  {row.especialidad && <span className={styles.badge}>{row.especialidad}</span>}
                </div>
                <p className={styles.cardDesc}>{row.descripcion}</p>
                <div className={styles.cardActions}>
                  <button className={styles.btnEdit} onClick={() => openEditFromEsp(row)}><Edit2 size={13} /> Editar</button>
                </div>
              </div>
            ))
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
              <p className={styles.cardDesc}>{item.descripcion}</p>
              <div className={styles.cardMeta}>
                {item.categoria && <span className={styles.badge}>{item.categoria}</span>}
                {item.complejidad && <ComplejidadBadge v={item.complejidad} />}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.btnEdit} onClick={() => openEdit(item)}><Edit2 size={13} /> Editar</button>
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

      {/* ── Modal ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.16 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h2 className={styles.modalTitle}>{editingId ? "Editar código" : "Nuevo código"}</h2>
                  <p className={styles.modalSubtitle}>Catálogo maestro de prestaciones</p>
                </div>
                <button className={styles.modalClose} onClick={closeModal}><XIcon size={18} /></button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Código <span className={styles.req}>*</span></label>
                    <input
                      className={`${styles.formInput} ${errors.codigo ? styles.inputError : ""}`}
                      value={form.codigo}
                      onChange={(e) => setField("codigo", e.target.value)}
                      placeholder="ej: 420101"
                    />
                    {errors.codigo && <span className={styles.errorMsg}>{errors.codigo}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Categoría</label>
                    <input
                      className={styles.formInput}
                      value={form.categoria}
                      onChange={(e) => setField("categoria", e.target.value)}
                      placeholder="ej: consultas"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.formInput} ${errors.descripcion ? styles.inputError : ""}`}
                    value={form.descripcion}
                    onChange={(e) => setField("descripcion", e.target.value)}
                    placeholder="ej: Consulta médica general"
                  />
                  {errors.descripcion && <span className={styles.errorMsg}>{errors.descripcion}</span>}
                </div>

                <div className={styles.formRow2}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Complejidad</label>
                    <select
                      className={styles.formSelect}
                      value={form.complejidad}
                      onChange={(e) => setField("complejidad", e.target.value as Complejidad | "")}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="baja">Baja</option>
                      <option value="media">Media</option>
                      <option value="alta">Alta</option>
                    </select>
                  </div>
                  <div className={styles.formGroup} style={{ justifyContent: "flex-end", paddingBottom: 4 }}>
                    <label className={styles.checkRow}>
                      <input
                        type="checkbox"
                        checked={form.sin_restriccion_especialidad}
                        onChange={(e) => setField("sin_restriccion_especialidad", e.target.checked)}
                      />
                      Sin restricción de especialidad
                    </label>
                  </div>
                </div>

                <div className={styles.sectionTitle}>Unidades de referencia</div>
                <div className={styles.formRow3}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Honorarios</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                      value={form.unidades_honorarios}
                      onChange={(e) => setField("unidades_honorarios", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ayudante</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                      value={form.unidades_ayudante}
                      onChange={(e) => setField("unidades_ayudante", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Gastos</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                      value={form.unidades_gastos}
                      onChange={(e) => setField("unidades_gastos", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Observación</label>
                  <textarea
                    className={styles.formTextarea}
                    value={form.observacion}
                    onChange={(e) => setField("observacion", e.target.value)}
                    placeholder="Observaciones opcionales…"
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.btnGhost} onClick={closeModal}>Cancelar</button>
                <button className={styles.btnPrimary} onClick={handleSave} disabled={saving}>
                  {saving ? <><span className={styles.spinner} /> Guardando…</> : <><Save size={15} /> Guardar</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
