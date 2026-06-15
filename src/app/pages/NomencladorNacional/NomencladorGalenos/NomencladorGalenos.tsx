import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  Search,
  Plus,
  X as XIcon,
  Save,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Building2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./NomencladorGalenos.module.scss";
import {
  listGalenos,
  createGaleno,
  deleteGaleno,
} from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type { GalenoOut } from "../nomenclador.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

type Tab = "catalogo" | "por-os";

type CreateForm = {
  osNro: number | "";
  nombre: string;
  nivel: string;
  valor_unitario: string;
  vigencia_desde: string;
  observacion: string;
};

function emptyCreate(): CreateForm {
  return { osNro: "", nombre: "", nivel: "", valor_unitario: "", vigencia_desde: today(), observacion: "" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function NomencladorGalenos() {
  const [tab, setTab] = useState<Tab>("catalogo");

  // ── Shared data ───────────────────────────────────────────────────────────
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ── Catálogo tab state ────────────────────────────────────────────────────
  const [catSearch, setCatSearch] = useState("");
  const [modalKind, setModalKind] = useState<"create" | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── Por-OS tab state ──────────────────────────────────────────────────────
  const [selectedOsNro, setSelectedOsNro] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [osGalenos, setOsGalenos] = useState<GalenoOut[]>([]);
  const [loadingOs, setLoadingOs] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [historialDate, setHistorialDate] = useState<string>("actual");

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Load catálogo ─────────────────────────────────────────────────────────

  const loadCatalogo = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listGalenos();
      setGalenos(data);
    } catch {
      setGalenos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (tab === "catalogo") loadCatalogo(); }, [loadCatalogo, tab]);

  // ── Load por-OS galenos ───────────────────────────────────────────────────

  const loadOsGalenos = useCallback(async (osNro: number) => {
    setLoadingOs(true);
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setOsGalenos(data);
    } catch {
      setOsGalenos([]);
    } finally {
      setLoadingOs(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "por-os" && selectedOsNro) {
      setHistorialDate("actual");
      loadOsGalenos(selectedOsNro);
    }
  }, [tab, selectedOsNro, loadOsGalenos]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  const filteredCatalogo = useMemo(() => {
    const seen = new Set<string>();
    const unique = galenos.filter((g) => {
      if (!g.activo || seen.has(g.codigo)) return false;
      seen.add(g.codigo);
      return true;
    });
    if (!catSearch.trim()) return unique;
    const q = catSearch.toLowerCase();
    return unique.filter(
      (g) => g.codigo.toLowerCase().includes(q) || g.nombre.toLowerCase().includes(q),
    );
  }, [galenos, catSearch]);

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 100);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre?.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 100);
  }, [osList, osSearch]);

  const historialDates = useMemo(() => {
    const dates = new Set<string>();
    osGalenos.forEach((g) => dates.add(g.vigencia_desde));
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [osGalenos]);

  const viewGalenos = useMemo(() => {
    if (historialDate === "actual") return osGalenos.filter((g) => g.activo);
    return osGalenos.filter((g) => g.vigencia_desde === historialDate);
  }, [osGalenos, historialDate]);

  // ── Catálogo actions ──────────────────────────────────────────────────────

  function openCreate() {
    setCreateForm(emptyCreate());
    setFormErrors({});
    setModalKind("create");
  }

  function closeModal() {
    setModalKind(null);
  }

  function setCreateField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setCreateForm((prev) => ({ ...prev, [k]: v }));
    setFormErrors((prev) => ({ ...prev, [k]: "" }));
  }

  function validateCreate() {
    const e: Record<string, string> = {};
    if (createForm.osNro === "") e.osNro = "Requerido";
    if (!createForm.nombre.trim()) e.nombre = "Requerido";
    if (!createForm.valor_unitario || isNaN(parseFloat(createForm.valor_unitario))) e.valor_unitario = "Valor inválido";
    if (!createForm.vigencia_desde) e.vigencia_desde = "Requerido";
    if (createForm.nivel && isNaN(parseInt(createForm.nivel))) e.nivel = "Nivel inválido";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validateCreate()) return;
    setSaving(true);
    try {
      const g = await createGaleno({
        obra_social_nro: Number(createForm.osNro),
        nombre: createForm.nombre.trim(),
        nivel: createForm.nivel ? parseInt(createForm.nivel) : null,
        vigencia_desde: createForm.vigencia_desde,
        valor_unitario: parseFloat(createForm.valor_unitario),
        observacion: createForm.observacion.trim() || null,
      });
      setGalenos((prev) => [g, ...prev]);
      showToast("success", "Galeno creado.");
      closeModal();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo crear el galeno.");
    } finally {
      setSaving(false);
    }
  }

  // ── Por-OS actions ────────────────────────────────────────────────────────

  async function handleToggleOs(g: GalenoOut) {
    setToggling(g.id);
    try {
      if (g.activo) {
        await deleteGaleno(g.id);
        setOsGalenos((prev) => prev.map((x) => (x.id === g.id ? { ...x, activo: false } : x)));
        showToast("success", `"${g.nombre}" desactivado para esta OS.`);
      } else {
        showToast("error", "Para reactivar un galeno, actualizá su precio con una nueva vigencia.");
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo cambiar el estado.");
    } finally {
      setToggling(null);
    }
  }

  const selectedOsName = osList.find((os) => os.nro_obra_social === selectedOsNro)?.nombre;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><TrendingUp size={20} /></span>
          <div>
            <h1 className={styles.title}>Galenos</h1>
            <p className={styles.subtitle}>Unidades de valor base por obra social</p>
          </div>
        </div>
        {tab === "catalogo" && (
          <button className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Nuevo galeno
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "catalogo" ? styles.tabActive : ""}`} onClick={() => setTab("catalogo")}>
          Catálogo
          <span className={styles.tabCount}>{filteredCatalogo.length}</span>
        </button>
        <button className={`${styles.tab} ${tab === "por-os" ? styles.tabActive : ""}`} onClick={() => setTab("por-os")}>
          Por Obra Social
        </button>
      </div>

      {/* ── CATÁLOGO TAB ── */}
      {tab === "catalogo" && (
        <div className={styles.body}>
          <div className={styles.toolbar}>
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por código o nombre…"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
              />
            </div>
            <button className={styles.btnGhost} onClick={loadCatalogo} title="Recargar"><RefreshCw size={14} /></button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={2} className={styles.loadingCell}><Loader2 size={14} className={styles.spin} /> Cargando…</td></tr>
                ) : filteredCatalogo.length === 0 ? (
                  <tr><td colSpan={2} className={styles.emptyCell}>Sin galenos cargados aún.</td></tr>
                ) : filteredCatalogo.map((g) => (
                  <tr key={g.codigo}>
                    <td><span className={styles.codeCell}>{g.codigo}</span></td>
                    <td>{g.nombre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={styles.cardList}>
            {filteredCatalogo.map((g) => (
              <div key={g.codigo} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.codeCell}>{g.codigo}</span>
                </div>
                <p className={styles.cardDesc}>{g.nombre}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── POR OS TAB ── */}
      {tab === "por-os" && (
        <div className={styles.osLayout}>
          {/* OS selector panel */}
          <div className={styles.osPanel}>
            <div className={styles.osPanelHeader}>
              <p className={styles.osPanelTitle}>Obra Social</p>
              <div className={styles.osSearchWrap}>
                <Search size={13} className={styles.osSearchIcon} />
                <input className={styles.osSearchInput} placeholder="Buscar…" value={osSearch} onChange={(e) => setOsSearch(e.target.value)} />
              </div>
            </div>
            <div className={styles.osList}>
              {filteredOS.map((os) => (
                <button
                  key={os.nro_obra_social}
                  className={`${styles.osItem} ${selectedOsNro === os.nro_obra_social ? styles.osItemSelected : ""}`}
                  onClick={() => setSelectedOsNro(os.nro_obra_social)}
                >
                  <span className={styles.osNro}>{os.nro_obra_social}</span>
                  <span className={styles.osNombre}>{os.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Galenos for selected OS */}
          <div className={styles.osContent}>
            {!selectedOsNro ? (
              <div className={styles.noSelection}>
                <Building2 size={36} className={styles.noSelectionIcon} />
                <p>Seleccioná una obra social para ver y gestionar sus galenos</p>
              </div>
            ) : (
              <>
                <div className={styles.osContentHeader}>
                  <strong>{selectedOsName}</strong>
                  <span className={styles.osContentSub}>{viewGalenos.length} galeno{viewGalenos.length !== 1 ? "s" : ""}</span>
                  <select
                    className={styles.historialSelect}
                    value={historialDate}
                    onChange={(e) => setHistorialDate(e.target.value)}
                  >
                    <option value="actual">Actual</option>
                    {historialDates.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {loadingOs ? (
                  <div className={styles.loadingRow}><Loader2 size={16} className={styles.spin} /> Cargando…</div>
                ) : osGalenos.length === 0 ? (
                  <div className={styles.emptyOs}>
                    <p>Esta obra social no tiene galenos cargados.</p>
                    <p style={{ fontSize: "0.8rem", marginTop: 6 }}>Creá galenos desde la pestaña "Catálogo" seleccionando esta OS.</p>
                  </div>
                ) : viewGalenos.length === 0 ? (
                  <div className={styles.emptyOs}>
                    <p>No hay galenos para la fecha seleccionada.</p>
                  </div>
                ) : (
                  <div className={styles.osTable}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Nombre</th>
                          <th>Nivel</th>
                          <th>Valor</th>
                          <th>Vigencia</th>
                          {historialDate === "actual" && <th>Activo</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {viewGalenos.map((g) => (
                          <tr key={g.id}>
                            <td><span className={styles.codeCell}>{g.codigo}</span></td>
                            <td>{g.nombre}</td>
                            <td className={styles.metaCell}>{g.nivel ?? "—"}</td>
                            <td className={styles.priceCell}>{fmt.format(parseFloat(g.valor_unitario))}</td>
                            <td className={styles.metaCell}>{g.vigencia_desde}</td>
                            {historialDate === "actual" && (
                              <td>
                                <button
                                  className={`${styles.toggleBtn} ${!g.activo ? styles.toggleOff : ""}`}
                                  onClick={() => handleToggleOs(g)}
                                  disabled={toggling === g.id}
                                  title={g.activo ? "Desactivar para esta OS" : "Inactivo — actualizá el precio para reactivar"}
                                >
                                  {toggling === g.id
                                    ? <Loader2 size={14} className={styles.spin} />
                                    : g.activo ? <ToggleRight size={18} /> : <ToggleLeft size={18} />
                                  }
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {modalKind === "create" && (
          <Modal title="Nuevo galeno" subtitle="El código se genera automáticamente a partir del nombre" onClose={closeModal}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Obra Social <span className={styles.req}>*</span></label>
              <select
                className={`${styles.formSelect} ${formErrors.osNro ? styles.inputError : ""}`}
                value={createForm.osNro}
                onChange={(e) => setCreateField("osNro", e.target.value === "" ? "" : Number(e.target.value))}
              >
                <option value="">— Seleccionar —</option>
                {osList.map((os) => <option key={os.nro_obra_social} value={os.nro_obra_social}>{os.nombre}</option>)}
              </select>
              {formErrors.osNro && <span className={styles.errorMsg}>{formErrors.osNro}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Nombre <span className={styles.req}>*</span></label>
              <input
                className={`${styles.formInput} ${formErrors.nombre ? styles.inputError : ""}`}
                value={createForm.nombre}
                onChange={(e) => setCreateField("nombre", e.target.value)}
                placeholder="ej: Galeno Quirúrgico"
              />
              {formErrors.nombre && <span className={styles.errorMsg}>{formErrors.nombre}</span>}
            </div>

            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nivel <span className={styles.optional}>(opcional)</span></label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  className={`${styles.formInput} ${formErrors.nivel ? styles.inputError : ""}`}
                  value={createForm.nivel}
                  onChange={(e) => setCreateField("nivel", e.target.value)}
                  placeholder="Sin nivel"
                />
                {formErrors.nivel && <span className={styles.errorMsg}>{formErrors.nivel}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Valor unitario <span className={styles.req}>*</span></label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${styles.formInput} ${formErrors.valor_unitario ? styles.inputError : ""}`}
                  value={createForm.valor_unitario}
                  onChange={(e) => setCreateField("valor_unitario", e.target.value)}
                  placeholder="0.00"
                />
                {formErrors.valor_unitario && <span className={styles.errorMsg}>{formErrors.valor_unitario}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Vigente desde <span className={styles.req}>*</span></label>
              <input
                type="date"
                className={`${styles.formInput} ${formErrors.vigencia_desde ? styles.inputError : ""}`}
                value={createForm.vigencia_desde}
                onChange={(e) => setCreateField("vigencia_desde", e.target.value)}
              />
              {formErrors.vigencia_desde && <span className={styles.errorMsg}>{formErrors.vigencia_desde}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Observación</label>
              <textarea className={styles.formTextarea} value={createForm.observacion} onChange={(e) => setCreateField("observacion", e.target.value)} placeholder="Opcional…" />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={closeModal}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleCreate} disabled={saving}>
                {saving ? <><Loader2 size={14} className={styles.spin} /> Guardando…</> : <><Save size={15} /> Crear galeno</>}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
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
            <h2 className={styles.modalTitle}>{title}</h2>
            {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
          </div>
          <button className={styles.modalClose} onClick={onClose}><XIcon size={18} /></button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </motion.div>
    </motion.div>
  );
}
