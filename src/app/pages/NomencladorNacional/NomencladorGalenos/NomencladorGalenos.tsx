import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  Search, Plus, X as XIcon, Save, TrendingUp, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Building2, Pencil, Clock, Download, Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./NomencladorGalenos.module.scss";
import {
  listGalenos,
  deleteGaleno, updateGaleno, actualizarUnidadesGaleno, actualizarPrecioGaleno,
  importarGalenosDeObraSocial, getHistorialGaleno,
} from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type { GalenoOut, GalenosImportarResult } from "../nomenclador.types";
import ConfirmModal from "../../../components/atoms/ConfirmModal/ConfirmModal";
import GalenoCreateModal from "./GalenoCreateModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

function today() {
  return new Date().toISOString().slice(0, 10);
}

function parseMonto(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function fmtUnidad(s: string | null | undefined): string {
  const n = parseMonto(s);
  return n == null ? "—" : n.toFixed(4);
}

function extractDetail(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string } } };
  return err?.response?.data?.detail ?? "Ocurrió un error inesperado.";
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "catalogo" | "por-os";
type ModalKind = "create" | "edit" | "import" | "historial" | null;

type EditForm = {
  observacion: string;
  vigencia_unidades: string;
  hon: string;
  ayu: string;
  gas: string;
  valor: string;
  vigencia_precio: string;
};

type ImportForm = {
  osOrigen: number | "";
  vigencia_desde: string;
  alcance: "todos" | "nivelados" | "sin_nivel";
  convertir: boolean;
  // "valor_y_unidades" copia todo; "solo_valor" mantiene las unidades del destino.
  actualizar: "valor_y_unidades" | "solo_valor";
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NomencladorGalenos() {
  const [tab, setTab] = useState<Tab>("catalogo");
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ── Catálogo state ────────────────────────────────────────────────────────
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [catSearch, setCatSearch] = useState("");

  // ── Por-OS state ──────────────────────────────────────────────────────────
  const [selectedOsNro, setSelectedOsNro] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [osGalenos, setOsGalenos] = useState<GalenoOut[]>([]);
  const [loadingOs, setLoadingOs] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);

  // ── Edit modal state ──────────────────────────────────────────────────────
  const [editTarget, setEditTarget] = useState<GalenoOut | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    observacion: "", vigencia_unidades: today(), hon: "", ayu: "", gas: "",
    valor: "", vigencia_precio: today(),
  });
  const [savingObs, setSavingObs] = useState(false);
  const [savingUnidades, setSavingUnidades] = useState(false);
  const [savingPrecio, setSavingPrecio] = useState(false);
  const [confirmUnidades, setConfirmUnidades] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // ── Import modal state ────────────────────────────────────────────────────
  const [importForm, setImportForm] = useState<ImportForm>({
    osOrigen: "", vigencia_desde: today(), alcance: "todos", convertir: false,
    actualizar: "valor_y_unidades",
  });
  const [importOsSearch, setImportOsSearch] = useState("");
  const [importOsOpen, setImportOsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<GalenosImportarResult | null>(null);
  const [importErrors, setImportErrors] = useState<Record<string, string>>({});
  // Galenos vigentes de la OS origen (para el alcance nivelados / sin nivel)
  const [importOrigenGalenos, setImportOrigenGalenos] = useState<GalenoOut[] | null>(null);

  // ── Historial state ───────────────────────────────────────────────────────
  const [historialTarget, setHistorialTarget] = useState<{
    os: number; codigo: string; nombre: string; nivel: number | null;
  } | null>(null);
  const [historialRows, setHistorialRows] = useState<GalenoOut[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  // ── Loaders ───────────────────────────────────────────────────────────────
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

  const loadOsGalenos = useCallback(async (osNro: number) => {
    setLoadingOs(true);
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setOsGalenos(data.filter((g) => g.activo));
    } catch {
      setOsGalenos([]);
    } finally {
      setLoadingOs(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "catalogo") loadCatalogo();
  }, [loadCatalogo, tab]);

  useEffect(() => {
    if (tab === "por-os" && selectedOsNro) loadOsGalenos(selectedOsNro);
  }, [tab, selectedOsNro, loadOsGalenos]);

  // ── Shared helpers ────────────────────────────────────────────────────────
  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4500);
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

  const selectedOsName = osList.find((os) => os.nro_obra_social === selectedOsNro)?.nombre;

  // ── Create actions ────────────────────────────────────────────────────────
  function openCreate() {
    setModalKind("create");
  }

  function handleCreated() {
    loadCatalogo();
    if (tab === "por-os" && selectedOsNro) loadOsGalenos(selectedOsNro);
  }

  // ── Edit actions ──────────────────────────────────────────────────────────
  function openEdit(g: GalenoOut) {
    setEditTarget(g);
    setEditForm({
      observacion: g.observacion ?? "", vigencia_unidades: today(), hon: "", ayu: "", gas: "",
      valor: g.valor_unitario ?? "", vigencia_precio: today(),
    });
    setEditErrors({});
    setConfirmUnidades(false);
    setModalKind("edit");
  }

  async function handleActualizarPrecio() {
    if (!editTarget) return;
    const v = parseFloat(editForm.valor);
    const e: Record<string, string> = {};
    if (editForm.valor.trim() === "" || isNaN(v) || v < 0) e.valor = "Valor inválido";
    if (!editForm.vigencia_precio) e.vigencia_precio = "Requerido";
    setEditErrors((p) => ({ ...p, ...e }));
    if (Object.keys(e).length > 0) return;

    setSavingPrecio(true);
    try {
      await actualizarPrecioGaleno(editTarget.id, {
        nuevo_valor_unitario: v,
        vigencia_desde: editForm.vigencia_precio,
      });
      showToast("success", "Valor del galeno actualizado.");
      setModalKind(null);
      if (selectedOsNro) loadOsGalenos(selectedOsNro);
    } catch (err) {
      showToast("error", extractDetail(err));
    } finally {
      setSavingPrecio(false);
    }
  }

  async function handleSaveObservacion() {
    if (!editTarget) return;
    setSavingObs(true);
    try {
      const updated = await updateGaleno(editTarget.id, {
        observacion: editForm.observacion.trim() || null,
      });
      setOsGalenos((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setEditTarget(updated);
      showToast("success", "Observación guardada.");
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setSavingObs(false);
    }
  }

  function validateUnidades(): boolean {
    const e: Record<string, string> = {};
    if (!editForm.vigencia_unidades) e.vigencia_unidades = "Requerido";
    const someSet = [editForm.hon, editForm.ayu, editForm.gas].some((v) => v.trim() !== "");
    if (!someSet) e.unidades = "Ingresá al menos una unidad para actualizar";
    setEditErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleActualizarUnidades() {
    if (!validateUnidades()) return;
    setConfirmUnidades(true);
  }

  async function doActualizarUnidades() {
    setConfirmUnidades(false);
    if (!editTarget) return;
    setSavingUnidades(true);

    const parseOpt = (s: string): number | undefined =>
      s.trim() === "" ? undefined : parseFloat(s);

    const h = parseOpt(editForm.hon);
    const a = parseOpt(editForm.ayu);
    const g = parseOpt(editForm.gas);

    try {
      const result = await actualizarUnidadesGaleno(editTarget.id, {
        vigencia_desde: editForm.vigencia_unidades,
        ...(h !== undefined && { unidades_honorarios: h }),
        ...(a !== undefined && { unidades_ayudante: a }),
        ...(g !== undefined && { unidades_gastos: g }),
      });
      setOsGalenos((prev) => prev.map((x) => (x.id === result.galeno.id ? result.galeno : x)));
      showToast("success", `Unidades actualizadas. ${result.componentes_actualizados} componente(s) afectados.`);
      setModalKind(null);
      if (selectedOsNro) loadOsGalenos(selectedOsNro);
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setSavingUnidades(false);
    }
  }

  // ── Import actions ────────────────────────────────────────────────────────
  function openImport() {
    setImportForm({
      osOrigen: "", vigencia_desde: today(), alcance: "todos", convertir: false,
      actualizar: "valor_y_unidades",
    });
    setImportOsSearch("");
    setImportOsOpen(false);
    setImportResult(null);
    setImportErrors({});
    setImportOrigenGalenos(null);
    setModalKind("import");
  }

  async function loadImportOrigenGalenos(osNro: number) {
    setImportOrigenGalenos(null);
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setImportOrigenGalenos(data.filter((g) => g.activo && g.vigencia_hasta == null));
    } catch {
      setImportOrigenGalenos([]);
    }
  }

  async function handleImport() {
    const e: Record<string, string> = {};
    if (importForm.osOrigen === "") e.osOrigen = "Requerido";
    if (!importForm.vigencia_desde) e.vigencia_desde = "Requerido";
    if (importForm.osOrigen !== "" && Number(importForm.osOrigen) === selectedOsNro)
      e.osOrigen = "El origen no puede ser igual al destino";

    // Con alcance parcial, los códigos salen de los galenos del origen ya cargados
    let codigos: string[] | undefined;
    if (importForm.osOrigen !== "" && importForm.alcance !== "todos") {
      if (importOrigenGalenos == null) {
        e.alcance = "Aguardá a que carguen los galenos del origen";
      } else {
        const filtrados = importOrigenGalenos.filter((g) =>
          importForm.alcance === "nivelados" ? g.nivel != null : g.nivel == null
        );
        codigos = [...new Set(filtrados.map((g) => g.codigo))];
        if (codigos.length === 0) {
          e.alcance = importForm.alcance === "nivelados"
            ? "El origen no tiene galenos nivelados"
            : "El origen no tiene galenos sin nivel";
        }
      }
    }

    setImportErrors(e);
    if (Object.keys(e).length > 0) return;

    setImporting(true);
    setImportResult(null);
    try {
      const result = await importarGalenosDeObraSocial({
        obra_social_nro_origen: Number(importForm.osOrigen),
        obra_social_nro_destino: selectedOsNro!,
        vigencia_desde: importForm.vigencia_desde,
        ...(codigos ? { codigos } : {}),
        convertir_a_nivelado: importForm.convertir,
        solo_valor: importForm.actualizar === "solo_valor",
      });
      setImportResult(result);
      if (selectedOsNro) loadOsGalenos(selectedOsNro);
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setImporting(false);
    }
  }

  // ── Historial actions ─────────────────────────────────────────────────────
  async function openHistorial(g: GalenoOut) {
    setHistorialTarget({ os: g.obra_social_nro, codigo: g.codigo, nombre: g.nombre, nivel: g.nivel });
    setHistorialRows([]);
    setLoadingHistorial(true);
    setModalKind("historial");
    try {
      const rows = await getHistorialGaleno(g.obra_social_nro, g.codigo, g.nivel ?? undefined);
      setHistorialRows(rows);
    } catch {
      showToast("error", "No se pudo cargar el historial.");
    } finally {
      setLoadingHistorial(false);
    }
  }

  // ── Toggle (delete) ───────────────────────────────────────────────────────
  async function handleToggleOs(g: GalenoOut) {
    setToggling(g.id);
    try {
      await deleteGaleno(g.id);
      setOsGalenos((prev) => prev.filter((x) => x.id !== g.id));
      showToast("success", `"${g.nombre}" desactivado.`);
    } catch (e) {
      const err = e as { response?: { status?: number; data?: { detail?: string } } };
      if (err?.response?.status === 409) {
        showToast("error", "No se puede desactivar: hay un valor activo que usa este galeno.");
      } else {
        showToast("error", extractDetail(e));
      }
    } finally {
      setToggling(null);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}><TrendingUp size={20} /></span>
          <div>
            <h1 className={styles.title}>Galenos</h1>
            <p className={styles.subtitle}>Precios unitarios y unidades pactadas por obra social</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "por-os" && selectedOsNro && (
            <button className={styles.btnGhost} onClick={openImport}>
              <Download size={15} /> Importar de otra OS
            </button>
          )}
          <button className={styles.btnPrimary} onClick={openCreate}>
            <Plus size={15} /> Nuevo galeno
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "catalogo" ? styles.tabActive : ""}`}
          onClick={() => setTab("catalogo")}
        >
          Catálogo
          <span className={styles.tabCount}>{filteredCatalogo.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === "por-os" ? styles.tabActive : ""}`}
          onClick={() => setTab("por-os")}
        >
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
            <button className={styles.btnGhost} onClick={loadCatalogo} title="Recargar">
              <RefreshCw size={14} />
            </button>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className={styles.loadingCell}>
                      <Loader2 size={14} className={styles.spin} /> Cargando…
                    </td>
                  </tr>
                ) : filteredCatalogo.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={styles.emptyCell}>Sin galenos cargados aún.</td>
                  </tr>
                ) : filteredCatalogo.map((g) => {
                  const hasNiveles = galenos.some((x) => x.codigo === g.codigo && x.nivel != null);
                  return (
                    <tr key={g.codigo}>
                      <td><span className={styles.codeCell}>{g.codigo}</span></td>
                      <td>{g.nombre}</td>
                      <td>
                        {hasNiveles
                          ? <span className={styles.nivelBadge}>Nivelado</span>
                          : <span className={styles.sinNivelBadge}>Sin nivel</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className={styles.cardList}>
            {filteredCatalogo.map((g) => {
              const hasNiveles = galenos.some((x) => x.codigo === g.codigo && x.nivel != null);
              return (
                <div key={g.codigo} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.codeCell}>{g.codigo}</span>
                    {hasNiveles
                      ? <span className={styles.nivelBadge}>Nivelado</span>
                      : <span className={styles.sinNivelBadge}>Sin nivel</span>}
                  </div>
                  <p className={styles.cardDesc}>{g.nombre}</p>
                </div>
              );
            })}
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
                  <span className={styles.osContentSub}>
                    {osGalenos.length} galeno{osGalenos.length !== 1 ? "s" : ""} activos
                  </span>
                  <button
                    className={styles.btnGhost}
                    style={{ marginLeft: "auto", height: 30, padding: "0 10px" }}
                    onClick={() => selectedOsNro && loadOsGalenos(selectedOsNro)}
                    title="Recargar"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                {loadingOs ? (
                  <div className={styles.loadingRow}>
                    <Loader2 size={16} className={styles.spin} /> Cargando…
                  </div>
                ) : osGalenos.length === 0 ? (
                  <div className={styles.emptyOs}>
                    <p>Esta obra social no tiene galenos activos.</p>
                    <p style={{ fontSize: "0.8rem", marginTop: 6 }}>
                      Creá uno con "Nuevo galeno" o importá desde otra OS.
                    </p>
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
                          <th>Hon.</th>
                          <th>Ayu.</th>
                          <th>Gas.</th>
                          <th>Vigencia</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {osGalenos.map((g) => (
                          <tr key={g.id}>
                            <td><span className={styles.codeCell}>{g.codigo}</span></td>
                            <td>{g.nombre}</td>
                            <td className={styles.metaCell}>{g.nivel ?? "—"}</td>
                            <td className={styles.priceCell}>
                              {fmt.format(parseMonto(g.valor_unitario) ?? 0)}
                            </td>
                            <td className={styles.unitCell}>{fmtUnidad(g.unidades_honorarios)}</td>
                            <td className={styles.unitCell}>{fmtUnidad(g.unidades_ayudante)}</td>
                            <td className={styles.unitCell}>{fmtUnidad(g.unidades_gastos)}</td>
                            <td className={styles.metaCell}>{g.vigencia_desde}</td>
                            <td>
                              <div className={styles.actionsCell}>
                                <button
                                  className={styles.btnEdit}
                                  title="Editar observación / actualizar unidades"
                                  onClick={() => openEdit(g)}
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  className={styles.btnEdit}
                                  title="Ver historial"
                                  onClick={() => openHistorial(g)}
                                >
                                  <Clock size={13} />
                                </button>
                                <button
                                  className={styles.toggleBtn}
                                  onClick={() => handleToggleOs(g)}
                                  disabled={toggling === g.id}
                                  title="Desactivar galeno"
                                >
                                  {toggling === g.id
                                    ? <Loader2 size={13} className={styles.spin} />
                                    : <Trash2 size={13} />}
                                </button>
                              </div>
                            </td>
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
        {/* CREATE modal — alta desde plantilla, multi-OS */}
        {modalKind === "create" && (
          <GalenoCreateModal
            osList={osList}
            initialOsNro={tab === "por-os" ? selectedOsNro : null}
            onClose={() => setModalKind(null)}
            onCreated={handleCreated}
          />
        )}

        {/* EDIT modal */}
        {modalKind === "edit" && editTarget && (
          <Modal
            title={`Editar — ${editTarget.nombre}`}
            subtitle={editTarget.nivel != null ? `Nivel ${editTarget.nivel}` : "Sin nivel"}
            onClose={() => setModalKind(null)}
          >
            {/* Observación */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Observación</label>
              <textarea
                className={styles.formTextarea}
                value={editForm.observacion}
                onChange={(e) => setEditForm((p) => ({ ...p, observacion: e.target.value }))}
                placeholder="Opcional…"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className={styles.btnGhost} onClick={handleSaveObservacion} disabled={savingObs}>
                {savingObs ? <Loader2 size={13} className={styles.spin} /> : <Save size={13} />}
                {" "}Guardar observación
              </button>
            </div>

            <div className={styles.sectionSep} />
            <p className={styles.sectionTitle}>Actualizar valor</p>
            <p className={styles.hintText}>
              Cambia el valor unitario del galeno desde la vigencia indicada (rota la vigencia anterior).
              Actual: <strong>{fmt.format(parseMonto(editTarget.valor_unitario) ?? 0)}</strong>.
            </p>
            <div className={styles.formRow2}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Valor unitario ($) <span className={styles.req}>*</span></label>
                <input
                  type="number" min="0" step="0.01"
                  className={`${styles.formInput} ${editErrors.valor ? styles.inputError : ""}`}
                  value={editForm.valor}
                  onChange={(e) => { setEditForm((p) => ({ ...p, valor: e.target.value })); setEditErrors((p) => ({ ...p, valor: "" })); }}
                  placeholder="0.00"
                />
                {editErrors.valor && <span className={styles.errorMsg}>{editErrors.valor}</span>}
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Vigente desde <span className={styles.req}>*</span></label>
                <input
                  type="date"
                  className={`${styles.formInput} ${editErrors.vigencia_precio ? styles.inputError : ""}`}
                  value={editForm.vigencia_precio}
                  onChange={(e) => { setEditForm((p) => ({ ...p, vigencia_precio: e.target.value })); setEditErrors((p) => ({ ...p, vigencia_precio: "" })); }}
                />
                {editErrors.vigencia_precio && <span className={styles.errorMsg}>{editErrors.vigencia_precio}</span>}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button className={styles.btnPrimary} onClick={handleActualizarPrecio} disabled={savingPrecio}>
                {savingPrecio ? <><Loader2 size={14} className={styles.spin} /> Actualizando…</> : <><Save size={14} /> Actualizar valor</>}
              </button>
            </div>

            <div className={styles.sectionSep} />
            <p className={styles.sectionTitle}>Actualizar unidades pactadas</p>

            <div className={styles.warningBox}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                Esta operación pisa las unidades de <strong>todos</strong> los componentes
                que usan este galeno, incluso overrides cargados a mano.
              </span>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Vigente desde <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                className={`${styles.formInput} ${editErrors.vigencia_unidades ? styles.inputError : ""}`}
                value={editForm.vigencia_unidades}
                onChange={(e) => setEditForm((p) => ({ ...p, vigencia_unidades: e.target.value }))}
              />
              {editErrors.vigencia_unidades && (
                <span className={styles.errorMsg}>{editErrors.vigencia_unidades}</span>
              )}
            </div>

            <p className={styles.hintText}>Dejá un campo vacío para no modificar esa unidad.</p>
            {editErrors.unidades && (
              <span className={styles.errorMsg}>{editErrors.unidades}</span>
            )}

            <div className={styles.formRow3}>
              <div className={styles.formGroup}>
                <label className={styles.unitLabel}>Honorarios</label>
                <input
                  type="number" min="0" step="0.0001"
                  className={styles.unitInput}
                  value={editForm.hon}
                  onChange={(e) => setEditForm((p) => ({ ...p, hon: e.target.value }))}
                  placeholder="—"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.unitLabel}>Ayudante</label>
                <input
                  type="number" min="0" step="0.0001"
                  className={styles.unitInput}
                  value={editForm.ayu}
                  onChange={(e) => setEditForm((p) => ({ ...p, ayu: e.target.value }))}
                  placeholder="—"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.unitLabel}>Gastos</label>
                <input
                  type="number" min="0" step="0.0001"
                  className={styles.unitInput}
                  value={editForm.gas}
                  onChange={(e) => setEditForm((p) => ({ ...p, gas: e.target.value }))}
                  placeholder="—"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalKind(null)}>Cerrar</button>
              <button
                className={styles.btnPrimary}
                onClick={handleActualizarUnidades}
                disabled={savingUnidades}
              >
                {savingUnidades
                  ? <><Loader2 size={14} className={styles.spin} /> Actualizando…</>
                  : "Actualizar unidades"}
              </button>
            </div>
          </Modal>
        )}

        {/* IMPORT modal */}
        {modalKind === "import" && (
          <Modal
            title="Importar galenos de otra OS"
            subtitle={`Destino: ${selectedOsName}`}
            onClose={() => setModalKind(null)}
            wide
          >
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Obra Social origen <span className={styles.req}>*</span>
              </label>
              {importForm.osOrigen !== "" ? (
                <div className={styles.osAcSelected}>
                  <span className={styles.osAcNro}>{importForm.osOrigen}</span>
                  <span className={styles.osAcName}>
                    {osList.find((os) => os.nro_obra_social === importForm.osOrigen)?.nombre ?? ""}
                  </span>
                  <button
                    type="button"
                    className={styles.osAcClear}
                    title="Cambiar"
                    onClick={() => {
                      setImportForm((p) => ({ ...p, osOrigen: "" }));
                      setImportOsSearch("");
                      setImportOrigenGalenos(null);
                    }}
                  >
                    <XIcon size={13} />
                  </button>
                </div>
              ) : (
                <div className={styles.osAcWrap}>
                  <input
                    className={`${styles.formInput} ${importErrors.osOrigen ? styles.inputError : ""}`}
                    placeholder="Buscar por nombre o número…"
                    value={importOsSearch}
                    onChange={(e) => { setImportOsSearch(e.target.value); setImportOsOpen(true); }}
                    onFocus={() => setImportOsOpen(true)}
                    onBlur={() => setTimeout(() => setImportOsOpen(false), 150)}
                  />
                  {importOsOpen && (() => {
                    const q = importOsSearch.trim().toLowerCase();
                    const list = osList
                      .filter((os) => os.nro_obra_social !== selectedOsNro)
                      .filter((os) => !q || os.nombre.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
                      .slice(0, 50);
                    return list.length > 0 ? (
                      <ul className={styles.osAcDropdown}>
                        {list.map((os) => (
                          <li
                            key={os.nro_obra_social}
                            className={styles.osAcItem}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setImportForm((p) => ({ ...p, osOrigen: os.nro_obra_social }));
                              setImportErrors((p) => ({ ...p, osOrigen: "" }));
                              setImportOsSearch("");
                              setImportOsOpen(false);
                              loadImportOrigenGalenos(os.nro_obra_social);
                            }}
                          >
                            <span className={styles.osAcNro}>{os.nro_obra_social}</span>
                            <span className={styles.osAcName}>{os.nombre}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null;
                  })()}
                </div>
              )}
              {importErrors.osOrigen && (
                <span className={styles.errorMsg}>{importErrors.osOrigen}</span>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Vigente desde <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                className={`${styles.formInput} ${importErrors.vigencia_desde ? styles.inputError : ""}`}
                value={importForm.vigencia_desde}
                onChange={(e) => setImportForm((p) => ({ ...p, vigencia_desde: e.target.value }))}
              />
              {importErrors.vigencia_desde && (
                <span className={styles.errorMsg}>{importErrors.vigencia_desde}</span>
              )}
            </div>

            {/* Alcance de la importación */}
            {(() => {
              const nivelados = importOrigenGalenos?.filter((g) => g.nivel != null) ?? null;
              const sinNivel = importOrigenGalenos?.filter((g) => g.nivel == null) ?? null;
              const cnt = (list: GalenoOut[] | null, porCodigo = false) =>
                list == null ? "" : ` (${porCodigo ? new Set(list.map((g) => g.codigo)).size : list.length})`;
              return (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Qué importar</label>
                  <label className={styles.checkRow}>
                    <input
                      type="radio" name="importAlcance" className={styles.checkInput}
                      checked={importForm.alcance === "todos"}
                      onChange={() => setImportForm((p) => ({ ...p, alcance: "todos" }))}
                    />
                    <span className={styles.checkLabel}>
                      Todos los galenos{cnt(importOrigenGalenos)}
                    </span>
                  </label>
                  <label className={styles.checkRow}>
                    <input
                      type="radio" name="importAlcance" className={styles.checkInput}
                      checked={importForm.alcance === "nivelados"}
                      onChange={() => setImportForm((p) => ({ ...p, alcance: "nivelados" }))}
                    />
                    <span className={styles.checkLabel}>
                      Solo galenos nivelados{cnt(nivelados, true)}
                    </span>
                  </label>
                  <label className={styles.checkRow}>
                    <input
                      type="radio" name="importAlcance" className={styles.checkInput}
                      checked={importForm.alcance === "sin_nivel"}
                      onChange={() => setImportForm((p) => ({ ...p, alcance: "sin_nivel" }))}
                    />
                    <span className={styles.checkLabel}>
                      Solo galenos sin nivel{cnt(sinNivel)}
                    </span>
                  </label>
                  {importForm.alcance !== "todos" && (
                    <p className={styles.hintText}>
                      Los demás galenos del destino no se tocan (conservan sus valores).
                    </p>
                  )}
                  {importErrors.alcance && (
                    <span className={styles.errorMsg}>{importErrors.alcance}</span>
                  )}
                </div>
              );
            })()}

            {/* Qué actualizar: valor + unidades vs. solo el valor del galeno */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Qué actualizar</label>
              <label className={styles.checkRow}>
                <input
                  type="radio" name="importActualizar" className={styles.checkInput}
                  checked={importForm.actualizar === "valor_y_unidades"}
                  onChange={() => setImportForm((p) => ({ ...p, actualizar: "valor_y_unidades" }))}
                />
                <span className={styles.checkLabel}>Valor del galeno y unidades</span>
              </label>
              <label className={styles.checkRow}>
                <input
                  type="radio" name="importActualizar" className={styles.checkInput}
                  checked={importForm.actualizar === "solo_valor"}
                  onChange={() => setImportForm((p) => ({ ...p, actualizar: "solo_valor" }))}
                />
                <span className={styles.checkLabel}>
                  Solo el valor del galeno (mantener las unidades del destino)
                </span>
              </label>
              {importForm.actualizar === "solo_valor" && (
                <p className={styles.hintText}>
                  Actualiza el valor general del galeno (el que multiplica a cada nivel) con el
                  del origen y conserva las unidades de cada nivel del destino. Los galenos que
                  el destino todavía no tenga se crean con los datos completos del origen.
                </p>
              )}
            </div>

            {/* Conversión sin nivel → nivelado */}
            <div className={styles.formGroup}>
              <label className={styles.checkRow}>
                <input
                  type="checkbox" className={styles.checkInput}
                  checked={importForm.convertir}
                  onChange={(e) => setImportForm((p) => ({ ...p, convertir: e.target.checked }))}
                />
                <span className={styles.checkLabel}>
                  Reemplazar galenos sin nivel del destino por los niveles del origen
                </span>
              </label>
              <p className={styles.hintText}>
                Si el origen tiene un galeno nivelado y el destino lo tiene sin nivel, se cierra
                el galeno sin nivel del destino, se crean los niveles y los valores que lo usaban
                pasan al galeno de su nivel. Sin esta opción esos casos se reportan como error.
              </p>
            </div>

            <p className={styles.hintText}>
              Copia los galenos vigentes del origen (precio + unidades). Si la OS destino ya
              tiene un galeno con ese código/nivel, se rota la vigencia.
            </p>

            {importResult && (
              <div className={styles.importResult}>
                <div className={styles.statsGrid}>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{importResult.total_origen}</span>
                    <span className={styles.statLabel}>Total origen</span>
                  </div>
                  <div className={`${styles.statBox} ${styles.statCreado}`}>
                    <span className={styles.statNum}>{importResult.creados}</span>
                    <span className={styles.statLabel}>Creados</span>
                  </div>
                  <div className={`${styles.statBox} ${styles.statRotado}`}>
                    <span className={styles.statNum}>{importResult.rotados}</span>
                    <span className={styles.statLabel}>Rotados</span>
                  </div>
                  <div className={styles.statBox}>
                    <span className={styles.statNum}>{importResult.sin_cambios}</span>
                    <span className={styles.statLabel}>Sin cambios</span>
                  </div>
                  {(importResult.convertidos ?? 0) > 0 && (
                    <div className={`${styles.statBox} ${styles.statCreado}`}>
                      <span className={styles.statNum}>{importResult.convertidos}</span>
                      <span className={styles.statLabel}>Convertidos</span>
                    </div>
                  )}
                </div>
                {importResult.errores.length > 0 && (
                  <div className={styles.errorList}>
                    <p className={styles.errorListTitle}>
                      {importResult.errores.length} error(es):
                    </p>
                    {importResult.errores.map((err, i) => (
                      <div key={i} className={styles.errorItem}>
                        <AlertCircle size={12} />
                        <span>
                          {err.codigo}
                          {err.nivel != null ? ` (Nivel ${err.nivel})` : ""}: {err.motivo}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalKind(null)}>
                {importResult ? "Cerrar" : "Cancelar"}
              </button>
              {!importResult && (
                <button className={styles.btnPrimary} onClick={handleImport} disabled={importing}>
                  {importing
                    ? <><Loader2 size={14} className={styles.spin} /> Importando…</>
                    : <><Download size={14} /> Importar</>}
                </button>
              )}
            </div>
          </Modal>
        )}

        {/* HISTORIAL modal */}
        {modalKind === "historial" && historialTarget && (
          <Modal
            title={`Historial — ${historialTarget.nombre}`}
            subtitle={[
              historialTarget.nivel != null ? `Nivel ${historialTarget.nivel}` : null,
              `OS ${historialTarget.os}`,
            ].filter(Boolean).join(" · ")}
            onClose={() => setModalKind(null)}
          >
            {loadingHistorial ? (
              <div className={styles.loadingRow}>
                <Loader2 size={16} className={styles.spin} /> Cargando historial…
              </div>
            ) : historialRows.length === 0 ? (
              <p className={styles.hintText}>No hay registros históricos.</p>
            ) : (
              <div className={styles.historialTable}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Desde</th>
                      <th>Hasta</th>
                      <th>Valor</th>
                      <th>Hon.</th>
                      <th>Ayu.</th>
                      <th>Gas.</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historialRows.map((h) => (
                      <tr key={h.id} className={h.activo ? undefined : styles.rowInactive}>
                        <td className={styles.metaCell}>{h.vigencia_desde}</td>
                        <td className={styles.metaCell}>{h.vigencia_hasta ?? "—"}</td>
                        <td className={styles.priceCell}>
                          {fmt.format(parseMonto(h.valor_unitario) ?? 0)}
                        </td>
                        <td className={styles.unitCell}>{fmtUnidad(h.unidades_honorarios)}</td>
                        <td className={styles.unitCell}>{fmtUnidad(h.unidades_ayudante)}</td>
                        <td className={styles.unitCell}>{fmtUnidad(h.unidades_gastos)}</td>
                        <td>
                          {h.activo
                            ? <span className={styles.badgeOk}>Activo</span>
                            : <span className={styles.badgeOff}>Cerrado</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalKind(null)}>Cerrar</button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* Confirm actualizar_unidades */}
      <ConfirmModal
        isOpen={confirmUnidades}
        variant="warning"
        title="Confirmar actualización de unidades"
        message={`Esta operación pisará las unidades de TODOS los componentes activos que usan el galeno "${editTarget?.nombre}"${editTarget?.nivel != null ? ` (Nivel ${editTarget.nivel})` : ""}, incluso overrides cargados a mano.\n\n¿Continuar?`}
        confirmLabel="Actualizar"
        onConfirm={doActualizarUnidades}
        onCancel={() => setConfirmUnidades(false)}
      />

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
    </div>
  );
}

// ─── Modal sub-component ──────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children, wide }: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <motion.div
      className={styles.backdrop}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`${styles.modal} ${wide ? styles.modalWide : ""}`}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.16 }}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{title}</h2>
            {subtitle && <p className={styles.modalSubtitle}>{subtitle}</p>}
          </div>
          <button className={styles.modalClose} onClick={onClose}>
            <XIcon size={18} />
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </motion.div>
    </motion.div>
  );
}
