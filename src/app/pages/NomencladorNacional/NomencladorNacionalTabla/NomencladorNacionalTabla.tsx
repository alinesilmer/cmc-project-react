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

import styles from "./NomencladorNacionalTabla.module.scss";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import {
  listNomencladorNacional,
  createNomencladorNacional,
  updateNomencladorNacional,
  toggleNomencladorNacionalActivo,
  deleteNomencladorNacional,
} from "../nomenclador.api";
import type {
  NomencladorNacionalOut,
  NomencladorNacionalCreatePayload,
} from "../nomenclador.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Complejidad = "baja" | "media" | "alta";

type FormState = {
  codigo: string;
  descripcion: string;
  categoria: string;
  complejidad: Complejidad | "";
  unidades_honorarios: string;
  unidades_ayudante: string;
  unidades_gastos: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): FormState {
  return {
    codigo: "",
    descripcion: "",
    categoria: "",
    complejidad: "",
    unidades_honorarios: "",
    unidades_ayudante: "",
    unidades_gastos: "",
  };
}

function itemToForm(item: NomencladorNacionalOut): FormState {
  return {
    codigo: item.codigo,
    descripcion: item.descripcion ?? "",
    categoria: item.categoria ?? "",
    complejidad: (item.complejidad as Complejidad | "") ?? "",
    unidades_honorarios: item.unidades_honorarios ?? "",
    unidades_ayudante: item.unidades_ayudante ?? "",
    unidades_gastos: item.unidades_gastos ?? "",
  };
}

function nullableNum(s: string): number | null {
  if (!s.trim()) return null;
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) ? null : n;
}

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

export default function NomencladorNacionalTabla() {
  const [items, setItems] = useState<NomencladorNacionalOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState("");
  const [filterComplejidad, setFilterComplejidad] = useState("");
  const [filterActivo, setFilterActivo] = useState("true");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const load = useCallback(
    async (p: number, q: string, comp: string, act: string) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { page: p, size: PAGE_SIZE };
        if (q.trim()) params.q = q.trim();
        if (act !== "") params.activo = act === "true";
        const data = await listNomencladorNacional(params as Parameters<typeof listNomencladorNacional>[0]);
        const filtrado = comp ? data.filter((i) => i.complejidad === comp) : data;
        setItems(filtrado);
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

  useEffect(() => {
    const t = setTimeout(() => {
      load(page, search, filterComplejidad, filterActivo);
    }, search.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [load, page, search, filterComplejidad, filterActivo]);

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

  function openEdit(item: NomencladorNacionalOut) {
    setEditingId(item.id);
    setForm(itemToForm(item));
    setErrors({});
    setModalOpen(true);
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
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: NomencladorNacionalCreatePayload = {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim() || null,
        categoria: form.categoria.trim() || null,
        complejidad: (form.complejidad as "baja" | "media" | "alta") || null,
        unidades_honorarios: nullableNum(form.unidades_honorarios),
        unidades_ayudante: nullableNum(form.unidades_ayudante),
        unidades_gastos: nullableNum(form.unidades_gastos),
      };

      if (editingId) {
        const updated = await updateNomencladorNacional(editingId, payload);
        setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
        showToast("success", "Código NN actualizado.");
      } else {
        const created = await createNomencladorNacional(payload);
        setItems((prev) => [created, ...prev]);
        showToast("success", "Código NN creado.");
      }
      closeModal();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo guardar el código.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: NomencladorNacionalOut) {
    try {
      const updated = await toggleNomencladorNacionalActivo(item.id, !item.activo);
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
      await deleteNomencladorNacional(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      showToast("success", "Código NN eliminado.");
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } };
      if (err?.response?.status === 409) {
        showToast("error", err.response.data?.detail ?? "No se puede eliminar: hay códigos del Colegio vinculados.");
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><ListOrdered size={20} /></span>
          <div>
            <h1 className={styles.title}>Nomenclador Nacional</h1>
            <p className={styles.subtitle}>
              Catálogo NN — independiente del catálogo del Colegio. Alimenta la generación
              automática de valores NN.
            </p>
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

          <button className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Nuevo código NN
          </button>
        </div>

        {/* Table */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
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
                  <td>{item.descripcion ?? <span style={{ color: "#718096" }}>—</span>}</td>
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
                  <h2 className={styles.modalTitle}>{editingId ? "Editar código NN" : "Nuevo código NN"}</h2>
                  <p className={styles.modalSubtitle}>Catálogo del Nomenclador Nacional</p>
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
                    <select
                      className={styles.formSelect}
                      value={form.categoria}
                      onChange={(e) => setField("categoria", e.target.value)}
                    >
                      <option value="">— Sin especificar —</option>
                      <option value="Consulta">Consulta</option>
                      <option value="Practica">Práctica</option>
                      <option value="Honorarios individuales">Honorarios individuales</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción</label>
                  <input
                    className={styles.formInput}
                    value={form.descripcion}
                    onChange={(e) => setField("descripcion", e.target.value)}
                    placeholder="ej: Consulta médica general"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Complejidad</label>
                  <select
                    className={styles.formSelect}
                    value={form.complejidad}
                    onChange={(e) => setField("complejidad", e.target.value as Complejidad | "")}
                    style={{ maxWidth: 260 }}
                  >
                    <option value="">— Sin especificar —</option>
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>

                <div className={styles.sectionTitle}>Unidades por defecto</div>
                <p className={styles.hintText}>
                  Se usan para calcular los Valores NN de cada obra social (unidad × galeno).
                </p>
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
        title="Eliminar código NN"
        message="¿Eliminar este código del Nomenclador Nacional permanentemente? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
