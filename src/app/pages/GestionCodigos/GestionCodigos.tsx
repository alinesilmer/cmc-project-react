import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X as XIcon,
  Save,
  Tag,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./GestionCodigos.module.scss";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import { getEspecialidades } from "../Especialidades/especialidades.api";
import { getJSON } from "../../lib/http";

// ─── Types ────────────────────────────────────────────────────────────────────

type RestrictionKind = "none" | "especialidad" | "doctor";

type CodigoBase = {
  id: number;
  codigo: string;
  descripcion: string;
  cirujano: number;
  ayudante: number;
  gastos: number;
  restriction: RestrictionKind;
  especialidad?: string;
  doctorNombre?: string;
};

type CodigoGlobal = CodigoBase;

type CodigoOS = CodigoBase & {
  nro_obra_social: number;
};

type FormState = {
  codigo: string;
  descripcion: string;
  cirujano: string;
  ayudante: string;
  gastos: string;
  restriction: RestrictionKind;
  especialidad: string;
  doctorNombre: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS = ["C", "P", "H", "S"];

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_GLOBALES: CodigoGlobal[] = [
  { id: 1, codigo: "0501601", descripcion: "Consulta ambulatoria general", cirujano: 5200, ayudante: 0, gastos: 800, restriction: "none" },
  { id: 2, codigo: "0501602", descripcion: "Consulta de guardia", cirujano: 6100, ayudante: 0, gastos: 900, restriction: "especialidad", especialidad: "GUARDIA" },
  { id: 3, codigo: "0502001", descripcion: "Electrocardiograma con informe", cirujano: 8500, ayudante: 0, gastos: 1200, restriction: "especialidad", especialidad: "CARDIOLOGÍA" },
  { id: 4, codigo: "0503510", descripcion: "Cesárea segmentaria", cirujano: 18000, ayudante: 9000, gastos: 3500, restriction: "especialidad", especialidad: "GINECOLOGÍA" },
  { id: 5, codigo: "0401101", descripcion: "Radiografía tórax frente", cirujano: 4200, ayudante: 0, gastos: 600, restriction: "none" },
];

const MOCK_OS_CODIGOS: CodigoOS[] = [
  { id: 101, nro_obra_social: 7, codigo: "0501601", descripcion: "Consulta ambulatoria general", cirujano: 5500, ayudante: 0, gastos: 850, restriction: "none" },
  { id: 102, nro_obra_social: 7, codigo: "0502001", descripcion: "Electrocardiograma con informe", cirujano: 9000, ayudante: 0, gastos: 1300, restriction: "especialidad", especialidad: "CARDIOLOGÍA" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): FormState {
  return { codigo: "", descripcion: "", cirujano: "", ayudante: "", gastos: "", restriction: "none", especialidad: "", doctorNombre: "" };
}

function baseToForm(c: CodigoBase): FormState {
  return {
    codigo: c.codigo,
    descripcion: c.descripcion,
    cirujano: String(c.cirujano),
    ayudante: String(c.ayudante),
    gastos: String(c.gastos),
    restriction: c.restriction,
    especialidad: c.especialidad ?? "",
    doctorNombre: c.doctorNombre ?? "",
  };
}

function pickDoctorName(row: Record<string, unknown>): string {
  return String(row.nombre ?? row.ape_nom ?? row.apellido_nombre ?? row.NOMBRE ?? "").trim();
}

function safeNum(s: string): number {
  const n = parseFloat(s.replace(",", "."));
  return isNaN(n) || n < 0 ? 0 : n;
}

const fmt = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });

// ─── Doctor search hook ───────────────────────────────────────────────────────

function useDoctorSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((value: string) => {
    setQuery(value);
    setOpen(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await getJSON<Record<string, unknown>[]>("/api/medicos/all", {
          q: value.trim(),
          limit: 8,
          skip: 0,
        });
        const names = (Array.isArray(data) ? data : []).map(pickDoctorName).filter(Boolean);
        setResults(names);
        setOpen(names.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function select(name: string) {
    setQuery(name);
    setResults([]);
    setOpen(false);
  }

  function reset(initialValue = "") {
    setQuery(initialValue);
    setResults([]);
    setOpen(false);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  return { query, results, loading, open, search, select, reset };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function GestionCodigos() {
  const [tab, setTab] = useState<"global" | "os">("global");
  const [search, setSearch] = useState("");
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);

  const [globalCodigos, setGlobalCodigos] = useState<CodigoGlobal[]>(MOCK_GLOBALES);
  const [osCodigos, setOsCodigos] = useState<CodigoOS[]>(MOCK_OS_CODIGOS);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const doctor = useDoctorSearch();

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });

  // ── Derived ───────────────────────────────────────────────────────────────

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 80);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre?.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 80);
  }, [osList, osSearch]);

  const filteredGlobal = useMemo(() => {
    if (!search.trim()) return globalCodigos;
    const q = search.toLowerCase();
    return globalCodigos.filter((c) =>
      c.codigo.toLowerCase().includes(q) ||
      c.descripcion.toLowerCase().includes(q) ||
      c.especialidad?.toLowerCase().includes(q) ||
      c.doctorNombre?.toLowerCase().includes(q)
    );
  }, [globalCodigos, search]);

  const filteredOsCodigos = useMemo(() => {
    if (!selectedNroOS) return [];
    const forOS = osCodigos.filter((c) => c.nro_obra_social === selectedNroOS);
    if (!search.trim()) return forOS;
    const q = search.toLowerCase();
    return forOS.filter((c) =>
      c.codigo.toLowerCase().includes(q) ||
      c.descripcion.toLowerCase().includes(q) ||
      c.especialidad?.toLowerCase().includes(q)
    );
  }, [osCodigos, selectedNroOS, search]);

  const selectedOS = osList.find((os) => os.nro_obra_social === selectedNroOS);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setErrors({});
    doctor.reset();
    setModalOpen(true);
  }

  function openEdit(item: CodigoBase) {
    setEditingId(item.id);
    const f = baseToForm(item);
    setForm(f);
    setErrors({});
    doctor.reset(f.doctorNombre);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    doctor.reset();
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function setRestriction(kind: RestrictionKind) {
    setField("restriction", kind);
    if (kind !== "doctor") doctor.reset();
    if (kind !== "especialidad") setField("especialidad", "");
  }

  // ── Validation ────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.codigo.trim()) errs.codigo = "Requerido";
    if (!form.descripcion.trim()) errs.descripcion = "Requerido";
    if (!form.cirujano.trim() || isNaN(safeNum(form.cirujano))) errs.cirujano = "Valor inválido";
    if (form.restriction === "especialidad" && !form.especialidad) errs.especialidad = "Seleccioná una especialidad";
    if (form.restriction === "doctor" && !doctor.query.trim()) errs.doctorNombre = "Buscá y seleccioná un médico";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!validate()) return;
    setSaving(true);

    setTimeout(() => {
      setSaving(false);
      const doctorNombre = form.restriction === "doctor" ? doctor.query.trim() : undefined;
      const base: CodigoBase = {
        id: editingId ?? Date.now(),
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        cirujano: safeNum(form.cirujano),
        ayudante: safeNum(form.ayudante),
        gastos: safeNum(form.gastos),
        restriction: form.restriction,
        especialidad: form.restriction === "especialidad" ? form.especialidad : undefined,
        doctorNombre,
      };

      if (tab === "global") {
        setGlobalCodigos((prev) =>
          editingId ? prev.map((c) => (c.id === editingId ? base : c)) : [...prev, base]
        );
      } else {
        const next: CodigoOS = { ...base, nro_obra_social: selectedNroOS! };
        setOsCodigos((prev) =>
          editingId ? prev.map((c) => (c.id === editingId ? next : c)) : [...prev, next]
        );
      }
      closeModal();
      showToast("success", editingId ? "Código actualizado." : "Código creado.");
    }, 500);
  }

  function handleDelete(id: number, isOS: boolean) {
    if (!confirm("¿Eliminar este código?")) return;
    if (isOS) setOsCodigos((prev) => prev.filter((c) => c.id !== id));
    else setGlobalCodigos((prev) => prev.filter((c) => c.id !== id));
    showToast("success", "Código eliminado.");
  }

  // ── Sub-components ────────────────────────────────────────────────────────

  function RestrictionBadge({ item }: { item: CodigoBase }) {
    if (item.restriction === "especialidad") return <span className={styles.badgeEsp}>{item.especialidad}</span>;
    if (item.restriction === "doctor") return <span className={styles.badgeDoc}>Dr. {item.doctorNombre}</span>;
    return <span className={styles.badgeNone}>General</span>;
  }

  function PricesRow({ item }: { item: CodigoBase }) {
    return (
      <div className={styles.pricesRow}>
        <span className={styles.priceChip}><span className={styles.priceLabel}>Cirujano</span>{fmt.format(item.cirujano)}</span>
        {item.ayudante > 0 && <span className={styles.priceChip}><span className={styles.priceLabel}>Ayudante</span>{fmt.format(item.ayudante)}</span>}
        {item.gastos > 0 && <span className={styles.priceChip}><span className={styles.priceLabel}>Gastos</span>{fmt.format(item.gastos)}</span>}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><Tag size={20} /></span>
          <div>
            <h1 className={styles.title}>Gestión de Códigos</h1>
            <p className={styles.subtitle}>Alta, modificación y baja de códigos del nomenclador</p>
          </div>
        </div>
        <span className={styles.mockBanner}>Datos de prueba</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "global" ? styles.tabActive : ""}`}
          onClick={() => { setTab("global"); setSearch(""); }}
        >
          Códigos globales
          <span className={styles.tabCount}>{globalCodigos.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "os" ? styles.tabActive : ""}`}
          onClick={() => { setTab("os"); setSearch(""); setSelectedNroOS(null); }}
        >
          Por obra social
        </button>
      </div>

      <div className={styles.body}>

        {/* ── GLOBAL TAB ── */}
        {tab === "global" && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.searchWrap}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  placeholder="Buscar código, descripción, especialidad…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button className={styles.btnPrimary} onClick={openCreate}>
                <Plus size={15} /> Nuevo código
              </button>
            </div>

            {/* Desktop table */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th>Cirujano</th>
                    <th>Ayudante</th>
                    <th>Gastos</th>
                    <th>Restricción</th>
                    <th className={styles.thActions}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGlobal.length === 0 ? (
                    <tr><td colSpan={7} className={styles.emptyCell}>Sin resultados</td></tr>
                  ) : filteredGlobal.map((item) => (
                    <tr key={item.id}>
                      <td><span className={styles.codeCell}>{item.codigo}</span></td>
                      <td>{item.descripcion}</td>
                      <td className={styles.numCell}>{fmt.format(item.cirujano)}</td>
                      <td className={styles.numCell}>{item.ayudante > 0 ? fmt.format(item.ayudante) : <span className={styles.zero}>—</span>}</td>
                      <td className={styles.numCell}>{item.gastos > 0 ? fmt.format(item.gastos) : <span className={styles.zero}>—</span>}</td>
                      <td><RestrictionBadge item={item} /></td>
                      <td className={styles.actionsCell}>
                        <button className={styles.btnEdit} onClick={() => openEdit(item)} title="Editar"><Edit2 size={14} /></button>
                        <button className={styles.btnDanger} onClick={() => handleDelete(item.id, false)} title="Eliminar"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className={styles.cardList}>
              {filteredGlobal.length === 0 ? (
                <p className={styles.emptyText}>Sin resultados</p>
              ) : filteredGlobal.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.codeCell}>{item.codigo}</span>
                    <RestrictionBadge item={item} />
                  </div>
                  <p className={styles.cardDesc}>{item.descripcion}</p>
                  <PricesRow item={item} />
                  <div className={styles.cardActions}>
                    <button className={styles.btnEdit} onClick={() => openEdit(item)}><Edit2 size={13} /> Editar</button>
                    <button className={styles.btnDanger} onClick={() => handleDelete(item.id, false)}><Trash2 size={13} /> Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── OS TAB ── */}
        {tab === "os" && (
          <div className={styles.osLayout}>
            {/* OS selector */}
            <div className={styles.osPanel}>
              <p className={styles.osPanelTitle}>Obra social</p>
              <div className={styles.osSearchWrap}>
                <Search size={13} className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  placeholder="Buscar…"
                  value={osSearch}
                  onChange={(e) => setOsSearch(e.target.value)}
                />
              </div>
              <div className={styles.osList}>
                {filteredOS.map((os) => (
                  <button
                    key={os.nro_obra_social}
                    className={`${styles.osItem} ${selectedNroOS === os.nro_obra_social ? styles.osItemSelected : ""}`}
                    onClick={() => { setSelectedNroOS(os.nro_obra_social); setSearch(""); }}
                  >
                    <span className={styles.osNro}>{os.nro_obra_social}</span>
                    <span className={styles.osNombre}>{os.nombre}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Code list */}
            <div className={styles.osContent}>
              {!selectedNroOS ? (
                <div className={styles.noSelection}>
                  <Tag size={32} className={styles.noSelectionIcon} />
                  <p>Seleccioná una obra social para ver sus códigos</p>
                </div>
              ) : (
                <>
                  <div className={styles.toolbar}>
                    <div className={styles.selectedOsLabel}>
                      <span className={styles.selectedOsName}>{selectedOS?.nombre ?? `OS ${selectedNroOS}`}</span>
                      <span className={styles.selectedOsCount}>{filteredOsCodigos.length} código{filteredOsCodigos.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className={styles.searchWrap}>
                      <Search size={15} className={styles.searchIcon} />
                      <input
                        className={styles.searchInput}
                        placeholder="Buscar código…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                    <button className={styles.btnPrimary} onClick={openCreate}>
                      <Plus size={15} /> Agregar código
                    </button>
                  </div>

                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Descripción</th>
                          <th>Cirujano</th>
                          <th>Ayudante</th>
                          <th>Gastos</th>
                          <th>Restricción</th>
                          <th className={styles.thActions}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOsCodigos.length === 0 ? (
                          <tr><td colSpan={7} className={styles.emptyCell}>Sin códigos para esta obra social</td></tr>
                        ) : filteredOsCodigos.map((item) => (
                          <tr key={item.id}>
                            <td><span className={styles.codeCell}>{item.codigo}</span></td>
                            <td>{item.descripcion}</td>
                            <td className={styles.numCell}>{fmt.format(item.cirujano)}</td>
                            <td className={styles.numCell}>{item.ayudante > 0 ? fmt.format(item.ayudante) : <span className={styles.zero}>—</span>}</td>
                            <td className={styles.numCell}>{item.gastos > 0 ? fmt.format(item.gastos) : <span className={styles.zero}>—</span>}</td>
                            <td><RestrictionBadge item={item} /></td>
                            <td className={styles.actionsCell}>
                              <button className={styles.btnEdit} onClick={() => openEdit(item)} title="Editar"><Edit2 size={14} /></button>
                              <button className={styles.btnDanger} onClick={() => handleDelete(item.id, true)} title="Eliminar"><Trash2 size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.cardList}>
                    {filteredOsCodigos.length === 0 ? (
                      <p className={styles.emptyText}>Sin códigos para esta obra social</p>
                    ) : filteredOsCodigos.map((item) => (
                      <div key={item.id} className={styles.card}>
                        <div className={styles.cardTop}>
                          <span className={styles.codeCell}>{item.codigo}</span>
                          <RestrictionBadge item={item} />
                        </div>
                        <p className={styles.cardDesc}>{item.descripcion}</p>
                        <PricesRow item={item} />
                        <div className={styles.cardActions}>
                          <button className={styles.btnEdit} onClick={() => openEdit(item)}><Edit2 size={13} /> Editar</button>
                          <button className={styles.btnDanger} onClick={() => handleDelete(item.id, true)}><Trash2 size={13} /> Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
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
                  <p className={styles.modalSubtitle}>
                    {tab === "os" && selectedOS ? `Para ${selectedOS.nombre}` : "Aplica a todas las obras sociales"}
                  </p>
                </div>
                <button className={styles.modalClose} onClick={closeModal}><XIcon size={18} /></button>
              </div>

              <div className={styles.modalBody}>
                {/* Código + Descripción */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Código <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.formInput} ${errors.codigo ? styles.inputError : ""}`}
                    value={form.codigo}
                    onChange={(e) => setField("codigo", e.target.value)}
                    placeholder="ej: 0501601"
                  />
                  {errors.codigo && <span className={styles.errorMsg}>{errors.codigo}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Descripción <span className={styles.req}>*</span></label>
                  <input
                    className={`${styles.formInput} ${errors.descripcion ? styles.inputError : ""}`}
                    value={form.descripcion}
                    onChange={(e) => setField("descripcion", e.target.value)}
                    placeholder="ej: Consulta ambulatoria general"
                  />
                  {errors.descripcion && <span className={styles.errorMsg}>{errors.descripcion}</span>}
                </div>

                {/* Valores */}
                <div className={styles.sectionTitle}>Valores</div>
                <div className={styles.formRow3}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Cirujano <span className={styles.req}>*</span></label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={`${styles.formInput} ${errors.cirujano ? styles.inputError : ""}`}
                      value={form.cirujano}
                      onChange={(e) => setField("cirujano", e.target.value)}
                      placeholder="0.00"
                    />
                    {errors.cirujano && <span className={styles.errorMsg}>{errors.cirujano}</span>}
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Ayudante</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={styles.formInput}
                      value={form.ayudante}
                      onChange={(e) => setField("ayudante", e.target.value)}
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
                      value={form.gastos}
                      onChange={(e) => setField("gastos", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Restricción */}
                <div className={styles.sectionTitle}>Restricción <span className={styles.optional}>(opcional)</span></div>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input type="radio" checked={form.restriction === "none"} onChange={() => setRestriction("none")} />
                    Sin restricción — cualquier médico puede usarlo
                  </label>
                  <label className={styles.radioOption}>
                    <input type="radio" checked={form.restriction === "especialidad"} onChange={() => setRestriction("especialidad")} />
                    Solo para una especialidad
                  </label>
                  <label className={styles.radioOption}>
                    <input type="radio" checked={form.restriction === "doctor"} onChange={() => setRestriction("doctor")} />
                    Solo para un médico específico
                  </label>
                </div>

                {form.restriction === "especialidad" && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Especialidad <span className={styles.req}>*</span></label>
                    <select
                      className={`${styles.formSelect} ${errors.especialidad ? styles.inputError : ""}`}
                      value={form.especialidad}
                      onChange={(e) => setField("especialidad", e.target.value)}
                    >
                      <option value="">— Seleccionar —</option>
                      {especialidades.map((e) => (
                        <option key={e.id} value={e.nombre}>{e.nombre}</option>
                      ))}
                    </select>
                    {errors.especialidad && <span className={styles.errorMsg}>{errors.especialidad}</span>}
                  </div>
                )}

                {form.restriction === "doctor" && (
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Médico <span className={styles.req}>*</span></label>
                    <div className={styles.autocompleteWrap}>
                      <div className={styles.autocompleteInputRow}>
                        <input
                          className={`${styles.formInput} ${errors.doctorNombre ? styles.inputError : ""}`}
                          value={doctor.query}
                          onChange={(e) => doctor.search(e.target.value)}
                          placeholder="Escribí al menos 2 letras para buscar…"
                          autoComplete="off"
                        />
                        {doctor.loading && (
                          <span className={styles.autocompleteSpinner}>
                            <Loader2 size={14} className={styles.spinning} />
                          </span>
                        )}
                      </div>
                      {doctor.open && (
                        <ul className={styles.autocompleteDropdown}>
                          {doctor.results.map((name) => (
                            <li
                              key={name}
                              className={styles.autocompleteItem}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                doctor.select(name);
                                setField("doctorNombre", name);
                              }}
                            >
                              {name}
                            </li>
                          ))}
                        </ul>
                      )}
                      {!doctor.loading && doctor.query.trim().length >= 2 && !doctor.open && (
                        <p className={styles.autocompleteEmpty}>Sin resultados para "{doctor.query}"</p>
                      )}
                      {errors.doctorNombre && <span className={styles.errorMsg}>{errors.doctorNombre}</span>}
                    </div>
                  </div>
                )}
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

      {/* ── TOAST ── */}
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
    </div>
  );
}
