import { useState, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  ArrowRight,
  Trash2,
  GitMerge,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X as XIcon,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import styles from "./Homologador.module.scss";
import ConfirmModal from "../../../components/atoms/ConfirmModal/ConfirmModal";
import { listHomologaciones, createHomologacion, deleteHomologacion } from "./homologador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import { listNomenclador } from "../nomenclador.api";
import type { HomologadorOut } from "./homologador.types";
import type { NomencladorOut } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Homologador() {
  const queryClient = useQueryClient();

  const [selectedOS, setSelectedOS] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [mapSearch, setMapSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HomologadorOut | null>(null);

  // Cache resolved nomenclador labels (id → "CODIGO — descripcion")
  const [nomLabels, setNomLabels] = useState<Record<number, string>>({});

  // Add form state
  const [codigoOs, setCodigoOs] = useState("");
  const [selectedNom, setSelectedNom] = useState<NomencladorOut | null>(null);
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const osNro = selectedOS?.nro_obra_social ?? null;

  const { data: homologaciones = [], isLoading: loadingMaps } = useQuery({
    queryKey: ["homologaciones", osNro],
    queryFn: () => listHomologaciones({ obra_social_nro: osNro! }),
    enabled: osNro !== null,
    staleTime: 2 * 60 * 1000,
  });

  // ── Prefetch on hover ─────────────────────────────────────────────────────

  function prefetchOS(nro: number) {
    queryClient.prefetchQuery({
      queryKey: ["homologaciones", nro],
      queryFn: () => listHomologaciones({ obra_social_nro: nro }),
      staleTime: 2 * 60 * 1000,
    });
  }

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 80);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 80);
  }, [osList, osSearch]);

  const filteredMaps = useMemo(() => {
    if (!mapSearch.trim()) return homologaciones;
    const q = mapSearch.toLowerCase();
    return homologaciones.filter(
      (m) =>
        m.codigo_origen.toLowerCase().includes(q) ||
        (m.descripcion_origen ?? "").toLowerCase().includes(q) ||
        (nomLabels[m.nomenclador_id] ?? "").toLowerCase().includes(q),
    );
  }, [homologaciones, mapSearch, nomLabels]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleDelete(m: HomologadorOut) {
    setDeleteTarget(m);
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }

  function resetForm() {
    setCodigoOs("");
    setSelectedNom(null);
    setNomSearch("");
    setNomResults([]);
    setFormErrors({});
  }

  function openAdd() {
    resetForm();
    setShowAdd(true);
  }

  function cancelAdd() {
    setShowAdd(false);
    resetForm();
  }

  // ── Nomenclador autocomplete ───────────────────────────────────────────────

  const handleNomSearch = useCallback((q: string) => {
    setNomSearch(q);
    setNomResults([]);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) return;
    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        const res = await listNomenclador({ q: q.trim(), activo: true, size: 15 });
        setNomResults(res);
      } catch {
        setNomResults([]);
      } finally {
        setNomLoading(false);
      }
    }, 300);
  }, []);

  function selectNom(n: NomencladorOut) {
    setSelectedNom(n);
    setNomLabels((prev) => ({ ...prev, [n.id]: `${n.codigo} — ${n.descripcion}` }));
    setNomSearch("");
    setNomResults([]);
    setFormErrors((p) => ({ ...p, nomenclador: "" }));
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async function handleCreate() {
    const errors: Record<string, string> = {};
    if (!codigoOs.trim()) errors.codigoOs = "Requerido";
    if (!selectedNom) errors.nomenclador = "Seleccioná un código CMC";
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    if (!osNro || !selectedNom) return;

    setSaving(true);
    try {
      const created = await createHomologacion({
        obra_social_nro: osNro,
        codigo_origen: codigoOs.trim(),
        nomenclador_id: selectedNom.id,
      });
      setNomLabels((prev) => ({
        ...prev,
        [created.nomenclador_id]: selectedNom ? `${selectedNom.codigo} — ${selectedNom.descripcion}` : String(created.nomenclador_id),
      }));
      await queryClient.invalidateQueries({ queryKey: ["homologaciones", osNro] });
      showToast("success", "Homologación creada.");
      cancelAdd();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      showToast("error", msg ?? "No se pudo crear la homologación.");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function doDelete() {
    if (!deleteTarget) return;
    const m = deleteTarget;
    setDeleteTarget(null);
    setDeleting(m.id);
    try {
      await deleteHomologacion(m.id);
      await queryClient.invalidateQueries({ queryKey: ["homologaciones", osNro] });
      showToast("success", "Homologación eliminada.");
    } catch {
      showToast("error", "No se pudo eliminar.");
    } finally {
      setDeleting(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}><GitMerge size={20} /></span>
        <div>
          <h1 className={styles.title}>Homologador</h1>
          <p className={styles.subtitle}>Equivalencias entre códigos de obras sociales y el Catálogo CMC</p>
        </div>
      </div>

      <div className={styles.layout}>

        {/* ── OS panel ── */}
        <div className={styles.osPanel}>
          <div className={styles.osPanelHeader}>
            <p className={styles.osPanelTitle}>Obra social</p>
            <div className={styles.osSearchWrap}>
              <Search size={13} className={styles.osSearchIcon} />
              <input
                className={styles.osSearchInput}
                placeholder="Buscar…"
                value={osSearch}
                onChange={(e) => setOsSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.osList}>
            {filteredOS.map((os) => (
              <button
                key={os.nro_obra_social}
                className={`${styles.osItem} ${selectedOS?.nro_obra_social === os.nro_obra_social ? styles.osItemSelected : ""}`}
                onMouseEnter={() => prefetchOS(os.nro_obra_social)}
                onClick={() => { setSelectedOS(os); setShowAdd(false); setMapSearch(""); }}
              >
                <span className={styles.osNro}>{os.nro_obra_social}</span>
                <span className={styles.osNombre}>{os.nombre}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Content ── */}
        <div className={styles.content}>
          {!selectedOS ? (
            <div className={styles.noSelection}>
              <GitMerge size={40} className={styles.noSelectionIcon} />
              <p>Seleccioná una obra social para ver y gestionar sus equivalencias de código</p>
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className={styles.toolbar}>
                <span className={styles.toolbarTitle}>{selectedOS.nombre}</span>
                {!loadingMaps && (
                  <span className={styles.toolbarCount}>{filteredMaps.length}</span>
                )}
                <div className={styles.searchWrap}>
                  <Search size={13} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder="Buscar código…"
                    value={mapSearch}
                    onChange={(e) => setMapSearch(e.target.value)}
                  />
                </div>
                {!showAdd && (
                  <button className={styles.btnAdd} onClick={openAdd}>
                    <Plus size={14} /> Nueva
                  </button>
                )}
              </div>

              {/* Add form */}
              <AnimatePresence>
                {showAdd && (
                  <motion.div
                    className={styles.addCard}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                  >
                    <p className={styles.addCardTitle}>Nueva equivalencia</p>
                    <div className={styles.addRow}>
                      {/* OS side */}
                      <div className={styles.addField}>
                        <label className={styles.addLabel}>Código de la obra social</label>
                        <input
                          className={`${styles.addInput} ${formErrors.codigoOs ? styles.addInputError : ""}`}
                          placeholder="ej: 1111"
                          value={codigoOs}
                          onChange={(e) => { setCodigoOs(e.target.value); setFormErrors((p) => ({ ...p, codigoOs: "" })); }}
                          autoFocus
                        />
                        {formErrors.codigoOs && <span className={styles.errorMsg}>{formErrors.codigoOs}</span>}
                      </div>

                      <div className={styles.arrowCol}>
                        <ArrowRight size={18} />
                      </div>

                      {/* CMC side */}
                      <div className={styles.addField}>
                        <label className={styles.addLabel}>Código CMC equivalente</label>
                        {selectedNom ? (
                          <div className={styles.selectedNom}>
                            <span className={styles.selectedNomCode}>{selectedNom.codigo}</span>
                            <span className={styles.selectedNomDesc}>{selectedNom.descripcion}</span>
                            <button className={styles.clearBtn} onClick={() => setSelectedNom(null)} type="button">
                              <XIcon size={12} />
                            </button>
                          </div>
                        ) : (
                          <div className={styles.autocompleteWrap}>
                            <div className={styles.autocompleteInputWrap}>
                              <Search size={13} className={styles.autocompleteIcon} />
                              <input
                                className={`${styles.autocompleteInput} ${formErrors.nomenclador ? styles.addInputError : ""}`}
                                placeholder="Buscar en catálogo CMC…"
                                value={nomSearch}
                                onChange={(e) => handleNomSearch(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && nomResults.length > 0) selectNom(nomResults[0]); }}
                              />
                              {nomLoading && <Loader2 size={13} className={`${styles.autocompleteSpinner} ${styles.spin}`} />}
                            </div>
                            {nomResults.length > 0 && (
                              <ul className={styles.autocompleteDropdown}>
                                {nomResults.map((n) => (
                                  <li
                                    key={n.id}
                                    className={styles.autocompleteItem}
                                    onMouseDown={(e) => { e.preventDefault(); selectNom(n); }}
                                  >
                                    <span className={styles.dropdownCode}>{n.codigo}</span>
                                    <span className={styles.dropdownDesc}>{n.descripcion}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                        {formErrors.nomenclador && <span className={styles.errorMsg}>{formErrors.nomenclador}</span>}
                      </div>
                    </div>

                    <div className={styles.addActions}>
                      <button className={styles.btnSave} onClick={handleCreate} disabled={saving}>
                        {saving ? <><Loader2 size={13} className={styles.spin} /> Guardando…</> : "Guardar"}
                      </button>
                      <button className={styles.btnCancel} onClick={cancelAdd}>Cancelar</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Mapping list */}
              {loadingMaps ? (
                <div className={styles.loadingRow}>
                  <Loader2 size={16} className={styles.spin} /> Cargando equivalencias…
                </div>
              ) : filteredMaps.length === 0 ? (
                <div className={styles.emptyState}>
                  <GitMerge size={36} className={styles.emptyIcon} />
                  <p>
                    {homologaciones.length === 0
                      ? "Esta obra social no tiene equivalencias cargadas."
                      : "Ninguna equivalencia coincide con la búsqueda."}
                  </p>
                </div>
              ) : (
                <div className={styles.mappingList}>
                  {filteredMaps.map((m) => (
                    <div key={m.id} className={styles.mappingCard}>
                      <div className={styles.osSide}>
                        <span className={`${styles.codeChip} ${styles.osChip}`}>{m.codigo_origen}</span>
                        {m.descripcion_origen && <span className={styles.codeDesc}>{m.descripcion_origen}</span>}
                      </div>

                      <ArrowRight size={16} className={styles.mappingArrow} />

                      <div className={styles.cmcSide}>
                        <span className={`${styles.codeChip} ${styles.cmcChip}`}>
                          {nomLabels[m.nomenclador_id]?.split(" — ")[0] ?? `#${m.nomenclador_id}`}
                        </span>
                        <span className={styles.codeDesc}>
                          {nomLabels[m.nomenclador_id]?.split(" — ").slice(1).join(" — ") ?? ""}
                        </span>
                      </div>

                      <button
                        className={styles.deleteBtn}
                        onClick={() => handleDelete(m)}
                        disabled={deleting === m.id}
                        title="Eliminar equivalencia"
                      >
                        {deleting === m.id
                          ? <Loader2 size={14} className={styles.spin} />
                          : <Trash2 size={14} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

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

      <ConfirmModal
        isOpen={deleteTarget !== null}
        variant="danger"
        title="Eliminar homologación"
        message={`¿Eliminar la homologación de "${deleteTarget?.codigo_origen}" → "${deleteTarget ? (nomLabels[deleteTarget.nomenclador_id] ?? String(deleteTarget.nomenclador_id)) : ""}"?`}
        confirmLabel="Eliminar"
        onConfirm={doDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
