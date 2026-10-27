import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  ListOrdered,
  CheckCircle2,
  AlertCircle,
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
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import PaginaPasos from "@/app/components/layout/PaginaPasos/PaginaPasos";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";
import Button from "@/app/components/ui/Button/Button";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";
import Vacio from "@/app/components/ui/Vacio/Vacio";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import Dialogo, { DialogoCampo } from "@/app/components/ui/Dialogo/Dialogo";
import FieldError from "@/app/components/ui/FieldError/FieldError";

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

const ESTADOS = [
  { valor: "true", rotulo: "Activos" },
  { valor: "false", rotulo: "Inactivos" },
  { valor: "", rotulo: "Todos" },
];

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
    <PaginaPasos titulo="Nomenclador Nacional" icono={ListOrdered} ancha>
      <div className={styles.barra}>
        <SearchField
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Código o descripción"
          ariaLabel="Buscar por código o descripción"
        />

        <select
          className={`${c.seleccion} ${styles.filtro}`}
          value={filterComplejidad}
          onChange={(e) => { setFilterComplejidad(e.target.value); setPage(1); }}
          aria-label="Complejidad"
        >
          <option value="">Toda complejidad</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>

        <Segmentos
          ariaLabel="Estado"
          opciones={ESTADOS}
          valor={filterActivo}
          onChange={(v) => { setFilterActivo(v); setPage(1); }}
        />

        <div className={styles.nuevo}>
          <Button leftIcon={<Plus size={16} aria-hidden="true" />} onClick={openCreate}>
            Nuevo código NN
          </Button>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <Vacio icono={ListOrdered}>
          <Cargando size={18} tono="marca" /> Cargando…
        </Vacio>
      ) : items.length === 0 ? (
        <Vacio icono={ListOrdered}>Sin resultados</Vacio>
      ) : (
        <div className={`${styles.envoltorio} ${loading ? styles.apagada : ""}`}>
          <Tabla>
            <thead>
              <tr>
                <th>Código</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Complejidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.codigo}>{item.codigo}</td>
                  <td>{item.descripcion ?? "—"}</td>
                  <td>{item.categoria ?? "—"}</td>
                  <td><ComplejidadBadge v={item.complejidad} /></td>
                  <td>
                    <span className={`${styles.badge} ${item.activo ? styles.activo : styles.inactivo}`}>
                      {item.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.acciones}>
                      <BotonAccion
                        icono={item.activo ? ToggleRight : ToggleLeft}
                        etiqueta={item.activo ? "Desactivar" : "Activar"}
                        onClick={() => handleToggle(item)}
                      />
                      <BotonAccion icono={Edit2} etiqueta="Editar" onClick={() => openEdit(item)} />
                      <BotonAccion icono={Trash2} etiqueta="Eliminar" peligro onClick={() => handleDelete(item.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
      )}

      <Paginador pagina={page} hayMas={hasMore} onCambiar={setPage} ocupado={loading} />

      {modalOpen && (
        <Dialogo
          titulo={editingId ? "Editar código NN" : "Nuevo código NN"}
          icono={ListOrdered}
          ancho="medio"
          onClose={closeModal}
          acciones={
            <>
              <Button variant="ghost" onClick={closeModal}>Cancelar</Button>
              <Button leftIcon={<Save size={16} aria-hidden="true" />} isLoading={saving} onClick={handleSave}>
                Guardar
              </Button>
            </>
          }
        >
          <DialogoCampo rotulo="Código" htmlFor="nn-codigo">
            <input
              id="nn-codigo"
              value={form.codigo}
              onChange={(e) => setField("codigo", e.target.value)}
              placeholder="ej: 420101"
              aria-invalid={!!errors.codigo}
            />
            <FieldError msg={errors.codigo} />
          </DialogoCampo>

          <DialogoCampo rotulo="Descripción" htmlFor="nn-descripcion">
            <input
              id="nn-descripcion"
              value={form.descripcion}
              onChange={(e) => setField("descripcion", e.target.value)}
              placeholder="ej: Consulta médica general"
            />
          </DialogoCampo>

          <DialogoCampo rotulo="Categoría" htmlFor="nn-categoria">
            <select id="nn-categoria" value={form.categoria} onChange={(e) => setField("categoria", e.target.value)}>
              <option value="">— Sin especificar —</option>
              <option value="Consulta">Consulta</option>
              <option value="Practica">Práctica</option>
              <option value="Honorarios individuales">Honorarios individuales</option>
            </select>
          </DialogoCampo>

          <DialogoCampo rotulo="Complejidad" htmlFor="nn-complejidad">
            <select
              id="nn-complejidad"
              value={form.complejidad}
              onChange={(e) => setField("complejidad", e.target.value as Complejidad | "")}
            >
              <option value="">— Sin especificar —</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </DialogoCampo>

          <h3 className={styles.unidadesTitulo}>Unidades por defecto</h3>
            <DialogoCampo rotulo="Honorarios" htmlFor="nn-honorarios">
              <input
                id="nn-honorarios"
                type="number"
                min="0"
                step="0.01"
                value={form.unidades_honorarios}
                onChange={(e) => setField("unidades_honorarios", e.target.value)}
                placeholder="0.00"
              />
            </DialogoCampo>
            <DialogoCampo rotulo="Ayudante" htmlFor="nn-ayudante">
              <input
                id="nn-ayudante"
                type="number"
                min="0"
                step="0.01"
                value={form.unidades_ayudante}
                onChange={(e) => setField("unidades_ayudante", e.target.value)}
                placeholder="0.00"
              />
            </DialogoCampo>
            <DialogoCampo rotulo="Gastos" htmlFor="nn-gastos">
              <input
                id="nn-gastos"
                type="number"
                min="0"
                step="0.01"
                value={form.unidades_gastos}
                onChange={(e) => setField("unidades_gastos", e.target.value)}
                placeholder="0.00"
              />
            </DialogoCampo>
        </Dialogo>
      )}

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
    </PaginaPasos>
  );
}
