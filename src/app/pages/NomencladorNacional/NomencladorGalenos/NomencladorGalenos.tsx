import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import {
  Search, Plus, X as XIcon, Save, TrendingUp, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Building2, Pencil, Clock, Download, Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./NomencladorGalenos.module.scss";
import {
  listGalenos, createGaleno, createNivelesGaleno,
  deleteGaleno, updateGaleno, actualizarUnidadesGaleno, actualizarPrecioGaleno,
  importarGalenosDeObraSocial, getHistorialGaleno,
} from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type { GalenoOut, GalenosImportarResult } from "../nomenclador.types";
import ConfirmModal from "../../../components/atoms/ConfirmModal/ConfirmModal";

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

type NivelRow = { nivel: number; hon: string; ayu: string; gas: string };

type CreateForm = {
  osNro: number | "";
  nombre: string;
  nivelado: boolean;
  valor_unitario: string;
  vigencia_desde: string;
  observacion: string;
  hon: string;
  ayu: string;
  gas: string;
  niveles: NivelRow[];
};

function emptyCreate(): CreateForm {
  return {
    osNro: "", nombre: "", nivelado: false,
    valor_unitario: "", vigencia_desde: today(), observacion: "",
    hon: "", ayu: "", gas: "",
    niveles: [{ nivel: 1, hon: "", ayu: "", gas: "" }],
  };
}

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

  // ── Create modal state ────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
  const [importForm, setImportForm] = useState<ImportForm>({ osOrigen: "", vigencia_desde: today() });
  const [importOsSearch, setImportOsSearch] = useState("");
  const [importOsOpen, setImportOsOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<GalenosImportarResult | null>(null);
  const [importErrors, setImportErrors] = useState<Record<string, string>>({});

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
    const form = emptyCreate();
    if (tab === "por-os" && selectedOsNro) form.osNro = selectedOsNro;
    setCreateForm(form);
    setFormErrors({});
    setModalKind("create");
  }

  function setCreateField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setCreateForm((prev) => ({ ...prev, [k]: v }));
    setFormErrors((prev) => ({ ...prev, [k]: "" }));
  }

  function addNivel() {
    setCreateForm((prev) => ({
      ...prev,
      niveles: [...prev.niveles, { nivel: prev.niveles.length + 1, hon: "", ayu: "", gas: "" }],
    }));
  }

  function removeNivel(idx: number) {
    setCreateForm((prev) => {
      const next = prev.niveles
        .filter((_, i) => i !== idx)
        .map((r, i) => ({ ...r, nivel: i + 1 }));
      return { ...prev, niveles: next.length ? next : [{ nivel: 1, hon: "", ayu: "", gas: "" }] };
    });
  }

  function setNivelField(idx: number, field: keyof NivelRow, val: string) {
    setCreateForm((prev) => ({
      ...prev,
      niveles: prev.niveles.map((r, i) => (i === idx ? { ...r, [field]: val } : r)),
    }));
  }

  function validateCreate(): boolean {
    const e: Record<string, string> = {};
    if (createForm.osNro === "") e.osNro = "Requerido";
    if (!createForm.nombre.trim()) e.nombre = "Requerido";
    if (!createForm.vigencia_desde) e.vigencia_desde = "Requerido";
    const vu = parseFloat(createForm.valor_unitario);
    if (!createForm.valor_unitario || isNaN(vu) || vu < 0)
      e.valor_unitario = "Valor inválido (debe ser ≥ 0)";
    if (createForm.nivelado && createForm.niveles.length === 0)
      e.niveles = "Agregá al menos un nivel";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleCreate() {
    if (!validateCreate()) return;
    setSaving(true);
    const osNro = Number(createForm.osNro);
    const obs = createForm.observacion.trim() || null;
    const parseOpt = (s: string) => (s.trim() === "" ? null : parseFloat(s));

    try {
      if (createForm.nivelado) {
        const nivelPayload = createForm.niveles.map((r) => ({
          nivel: r.nivel,
          valor_unitario: parseFloat(createForm.valor_unitario),
          unidades_honorarios: parseOpt(r.hon),
          unidades_ayudante: parseOpt(r.ayu),
          unidades_gastos: parseOpt(r.gas),
        }));
        await createNivelesGaleno({
          obra_social_nro: osNro,
          nombre: createForm.nombre.trim(),
          vigencia_desde: createForm.vigencia_desde,
          observacion: obs,
          niveles: nivelPayload,
        });
        showToast("success", `Galeno nivelado creado con ${nivelPayload.length} nivel(es).`);
      } else {
        const g = await createGaleno({
          obra_social_nro: osNro,
          nombre: createForm.nombre.trim(),
          nivel: null,
          vigencia_desde: createForm.vigencia_desde,
          valor_unitario: parseFloat(createForm.valor_unitario),
          unidades_honorarios: parseOpt(createForm.hon),
          unidades_ayudante: parseOpt(createForm.ayu),
          unidades_gastos: parseOpt(createForm.gas),
          observacion: obs,
        });
        setGalenos((prev) => [g, ...prev]);
        showToast("success", "Galeno creado.");
      }
      setModalKind(null);
      loadCatalogo();
      if (tab === "por-os" && selectedOsNro === osNro) loadOsGalenos(osNro);
    } catch (e) {
      showToast("error", extractDetail(e));
    } finally {
      setSaving(false);
    }
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
    setImportForm({ osOrigen: "", vigencia_desde: today() });
    setImportOsSearch("");
    setImportOsOpen(false);
    setImportResult(null);
    setImportErrors({});
    setModalKind("import");
  }

  async function handleImport() {
    const e: Record<string, string> = {};
    if (importForm.osOrigen === "") e.osOrigen = "Requerido";
    if (!importForm.vigencia_desde) e.vigencia_desde = "Requerido";
    if (importForm.osOrigen !== "" && Number(importForm.osOrigen) === selectedOsNro)
      e.osOrigen = "El origen no puede ser igual al destino";
    setImportErrors(e);
    if (Object.keys(e).length > 0) return;

    setImporting(true);
    setImportResult(null);
    try {
      const result = await importarGalenosDeObraSocial({
        obra_social_nro_origen: Number(importForm.osOrigen),
        obra_social_nro_destino: selectedOsNro!,
        vigencia_desde: importForm.vigencia_desde,
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
        {/* CREATE modal */}
        {modalKind === "create" && (
          <Modal
            title="Nuevo galeno"
            subtitle="El código se genera automáticamente a partir del nombre"
            onClose={() => setModalKind(null)}
          >
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Obra Social <span className={styles.req}>*</span>
              </label>
              <select
                className={`${styles.formSelect} ${formErrors.osNro ? styles.inputError : ""}`}
                value={createForm.osNro}
                onChange={(e) =>
                  setCreateField("osNro", e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="">— Seleccionar —</option>
                {osList.map((os) => (
                  <option key={os.nro_obra_social} value={os.nro_obra_social}>{os.nombre}</option>
                ))}
              </select>
              {formErrors.osNro && <span className={styles.errorMsg}>{formErrors.osNro}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Nombre <span className={styles.req}>*</span>
              </label>
              <input
                className={`${styles.formInput} ${formErrors.nombre ? styles.inputError : ""}`}
                value={createForm.nombre}
                onChange={(e) => setCreateField("nombre", e.target.value)}
                placeholder="ej: Galeno Quirúrgico Adulto"
              />
              {formErrors.nombre && <span className={styles.errorMsg}>{formErrors.nombre}</span>}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Vigente desde <span className={styles.req}>*</span>
              </label>
              <input
                type="date"
                className={`${styles.formInput} ${formErrors.vigencia_desde ? styles.inputError : ""}`}
                value={createForm.vigencia_desde}
                onChange={(e) => setCreateField("vigencia_desde", e.target.value)}
              />
              {formErrors.vigencia_desde && (
                <span className={styles.errorMsg}>{formErrors.vigencia_desde}</span>
              )}
            </div>

            {/* Nivelado toggle */}
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkInput}
                checked={createForm.nivelado}
                onChange={(e) => setCreateField("nivelado", e.target.checked)}
              />
              <span className={styles.checkLabel}>Galeno nivelado</span>
            </label>

            {/* Valor unitario (compartido) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Valor galeno <span className={styles.req}>*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`${styles.formInput} ${formErrors.valor_unitario ? styles.inputError : ""}`}
                value={createForm.valor_unitario}
                onChange={(e) => setCreateField("valor_unitario", e.target.value)}
                placeholder="0.00"
              />
              {formErrors.valor_unitario && (
                <span className={styles.errorMsg}>{formErrors.valor_unitario}</span>
              )}
              {createForm.nivelado && (
                <span className={styles.hintText}>Este valor se aplica a todos los niveles.</span>
              )}
            </div>

            {/* NO nivelado → unidades simples */}
            {!createForm.nivelado && (
              <div className={styles.unitsBlock}>
                <p className={styles.unitsBlockTitle}>
                  Unidades plantilla{" "}
                  <span className={styles.optional}>(opcional)</span>
                </p>
                <p className={styles.hintText}>
                  Si dejás una unidad vacía, el código tomará la unidad del nomenclador al facturar.
                </p>
                <div className={styles.formRow3}>
                  <div className={styles.formGroup}>
                    <label className={styles.unitLabel}>Honorarios</label>
                    <input
                      type="number" min="0" step="0.0001"
                      className={styles.unitInput}
                      value={createForm.hon}
                      onChange={(e) => setCreateField("hon", e.target.value)}
                      placeholder="—"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.unitLabel}>Ayudante</label>
                    <input
                      type="number" min="0" step="0.0001"
                      className={styles.unitInput}
                      value={createForm.ayu}
                      onChange={(e) => setCreateField("ayu", e.target.value)}
                      placeholder="—"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.unitLabel}>Gastos</label>
                    <input
                      type="number" min="0" step="0.0001"
                      className={styles.unitInput}
                      value={createForm.gas}
                      onChange={(e) => setCreateField("gas", e.target.value)}
                      placeholder="—"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* NIVELADO → filas dinámicas */}
            {createForm.nivelado && (
              <div className={styles.nivelSection}>
                <p className={styles.unitsBlockTitle}>
                  Niveles <span className={styles.req}>*</span>
                </p>
                <p className={styles.hintText}>
                  Cada nivel lleva sus propias unidades de honorarios, ayudante y gastos.
                </p>
                {formErrors.niveles && (
                  <span className={styles.errorMsg}>{formErrors.niveles}</span>
                )}
                <div className={styles.nivelList}>
                  {createForm.niveles.map((row, idx) => (
                    <div key={idx} className={styles.nivelCard}>
                      <div className={styles.nivelCardHeader}>
                        <span className={styles.nivelNum}>Nivel {row.nivel}</span>
                        {createForm.niveles.length > 1 && (
                          <button
                            type="button"
                            className={styles.removeNivelBtn}
                            onClick={() => removeNivel(idx)}
                            title="Quitar nivel"
                          >
                            <XIcon size={13} />
                          </button>
                        )}
                      </div>
                      <div className={styles.formRow3}>
                        <div className={styles.formGroup}>
                          <label className={styles.unitLabel}>Honorarios</label>
                          <input
                            type="number" min="0" step="0.0001"
                            className={styles.unitInput}
                            value={row.hon}
                            onChange={(e) => setNivelField(idx, "hon", e.target.value)}
                            placeholder="—"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.unitLabel}>Ayudante</label>
                          <input
                            type="number" min="0" step="0.0001"
                            className={styles.unitInput}
                            value={row.ayu}
                            onChange={(e) => setNivelField(idx, "ayu", e.target.value)}
                            placeholder="—"
                          />
                        </div>
                        <div className={styles.formGroup}>
                          <label className={styles.unitLabel}>Gastos</label>
                          <input
                            type="number" min="0" step="0.0001"
                            className={styles.unitInput}
                            value={row.gas}
                            onChange={(e) => setNivelField(idx, "gas", e.target.value)}
                            placeholder="—"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.addNivelBtn} onClick={addNivel}>
                  <Plus size={14} /> Agregar nivel
                </button>
              </div>
            )}

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Observación <span className={styles.optional}>(opcional)</span>
              </label>
              <textarea
                className={styles.formTextarea}
                value={createForm.observacion}
                onChange={(e) => setCreateField("observacion", e.target.value)}
                placeholder="Opcional…"
              />
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={() => setModalKind(null)}>Cancelar</button>
              <button className={styles.btnPrimary} onClick={handleCreate} disabled={saving}>
                {saving
                  ? <><Loader2 size={14} className={styles.spin} /> Guardando…</>
                  : <><Save size={15} /> Crear galeno</>}
              </button>
            </div>
          </Modal>
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
                    onClick={() => { setImportForm((p) => ({ ...p, osOrigen: "" })); setImportOsSearch(""); }}
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

            <p className={styles.hintText}>
              Copia todos los galenos vigentes del origen (precio + unidades). Si la OS destino ya
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
