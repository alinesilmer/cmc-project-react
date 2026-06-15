import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

import styles from "./ActualizarPreciosGalenos.module.scss";
import { listGalenos, actualizarPrecioGaleno } from "../nomenclador.api";
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

type SaveResult = { id: number; nombre: string; ok: boolean; msg?: string };

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActualizarPreciosGalenos() {
  const [selectedOsNro, setSelectedOsNro] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [loadingOs, setLoadingOs] = useState(false);
  const [edits, setEdits] = useState<Record<number, string>>({});
  const [vigencia, setVigencia] = useState(today());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saveResults, setSaveResults] = useState<SaveResult[]>([]);

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const loadGalenos = useCallback(async (osNro: number) => {
    setLoadingOs(true);
    setEdits({});
    setSaveResults([]);
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setGalenos(data.filter((g) => g.activo));
    } catch {
      setGalenos([]);
    } finally {
      setLoadingOs(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOsNro) loadGalenos(selectedOsNro);
  }, [selectedOsNro, loadGalenos]);

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 100);
    const q = osSearch.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre?.toLowerCase().includes(q) ||
          String(os.nro_obra_social).includes(q),
      )
      .slice(0, 100);
  }, [osList, osSearch]);

  const pendingEdits = useMemo(
    () =>
      Object.entries(edits).filter(([, v]) => {
        const n = parseFloat(v);
        return v.trim() !== "" && !isNaN(n) && n >= 0;
      }),
    [edits],
  );

  function setEdit(id: number, val: string) {
    setEdits((prev) => ({ ...prev, [id]: val }));
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  }

  async function handleSaveAll() {
    if (pendingEdits.length === 0 || !vigencia) return;
    if (
      !confirm(
        `¿Actualizar ${pendingEdits.length} precio(s) con vigencia desde ${vigencia}?\n\nEsta operación crea nuevos registros manteniendo el historial de valores anteriores.`,
      )
    )
      return;

    setSaving(true);
    setSaveResults([]);

    const results: SaveResult[] = [];

    for (const [idStr, valStr] of pendingEdits) {
      const id = Number(idStr);
      const galeno = galenos.find((g) => g.id === id);
      if (!galeno) continue;

      try {
        const updated = await actualizarPrecioGaleno(id, {
          nuevo_valor_unitario: parseFloat(valStr),
          vigencia_desde: vigencia,
        });
        setGalenos((prev) => prev.map((g) => (g.id === id ? updated : g)));
        setEdits((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        results.push({ id, nombre: galeno.nombre, ok: true });
      } catch (e: unknown) {
        const msg = (
          e as { response?: { data?: { detail?: string } } }
        )?.response?.data?.detail;
        results.push({
          id,
          nombre: galeno.nombre,
          ok: false,
          msg: msg ?? "Error al actualizar",
        });
      }
    }

    setSaveResults(results);
    setSaving(false);

    const ok = results.filter((r) => r.ok).length;
    const fail = results.filter((r) => !r.ok).length;
    if (fail === 0) {
      showToast("success", `${ok} precio(s) actualizados con éxito.`);
    } else if (ok === 0) {
      showToast("error", "No se pudo actualizar ningún precio.");
    } else {
      showToast("error", `${ok} actualizados, ${fail} con error.`);
    }
  }

  const selectedOsName = osList.find(
    (os) => os.nro_obra_social === selectedOsNro,
  )?.nombre;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            <TrendingUp size={20} />
          </span>
          <div>
            <h1 className={styles.title}>Actualizar Galenos</h1>
            <p className={styles.subtitle}>
              Actualizá los valores unitarios de galenos y gastos por obra
              social
            </p>
          </div>
        </div>
      </div>

      <div className={styles.layout}>
        {/* OS Panel */}
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

        {/* Content */}
        <div className={styles.content}>
          {!selectedOsNro ? (
            <div className={styles.noSelection}>
              <Building2 size={36} className={styles.noSelectionIcon} />
              <p>
                Seleccioná una obra social para ver y actualizar sus precios
              </p>
            </div>
          ) : loadingOs ? (
            <div className={styles.loadingRow}>
              <Loader2 size={16} className={styles.spin} /> Cargando
              galenos…
            </div>
          ) : (
            <>
              {/* Toolbar */}
              <div className={styles.contentToolbar}>
                <div className={styles.toolbarLeft}>
                  <strong className={styles.osTitle}>{selectedOsName}</strong>
                  {pendingEdits.length > 0 && (
                    <span className={styles.pendingBadge}>
                      {pendingEdits.length} cambio
                      {pendingEdits.length !== 1 ? "s" : ""} pendiente
                      {pendingEdits.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className={styles.toolbarRight}>
                  <div className={styles.vigenciaGroup}>
                    <label className={styles.vigenciaLabel}>
                      Vigente desde
                    </label>
                    <input
                      type="date"
                      className={styles.vigenciaInput}
                      value={vigencia}
                      onChange={(e) => setVigencia(e.target.value)}
                    />
                  </div>
                  <button
                    className={styles.btnPrimary}
                    onClick={handleSaveAll}
                    disabled={saving || pendingEdits.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 size={14} className={styles.spin} />{" "}
                        Guardando…
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Guardar{" "}
                        {pendingEdits.length > 0
                          ? `(${pendingEdits.length})`
                          : "cambios"}
                      </>
                    )}
                  </button>
                  <button
                    className={styles.btnGhost}
                    onClick={() =>
                      selectedOsNro && loadGalenos(selectedOsNro)
                    }
                    title="Recargar"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Save results summary */}
              {saveResults.length > 0 && (
                <div className={styles.resultsBox}>
                  {saveResults.map((r) => (
                    <div
                      key={r.id}
                      className={`${styles.resultRow} ${r.ok ? styles.resultOk : styles.resultErr}`}
                    >
                      {r.ok ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <AlertCircle size={13} />
                      )}
                      <span>
                        {r.nombre}:{" "}
                        {r.ok ? "actualizado correctamente" : r.msg}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {galenos.length === 0 ? (
                <div className={styles.emptyOs}>
                  <p>
                    Esta obra social no tiene galenos activos cargados.
                  </p>
                  <p style={{ fontSize: "0.8rem", marginTop: 6 }}>
                    Creá galenos desde la página "Galenos" seleccionando
                    esta OS.
                  </p>
                </div>
              ) : (
                <PriceSection
                  title="Galenos"
                  rows={galenos}
                  edits={edits}
                  onEdit={setEdit}
                  saveResults={saveResults}
                />
              )}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${styles.toast} ${toast.type === "success" ? styles.toastSuccess : styles.toastError}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={15} />
            ) : (
              <AlertCircle size={15} />
            )}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── PriceSection ─────────────────────────────────────────────────────────────

function PriceSection({
  title,
  rows,
  edits,
  onEdit,
  saveResults,
}: {
  title: string;
  rows: GalenoOut[];
  edits: Record<number, string>;
  onEdit: (id: number, val: string) => void;
  saveResults: SaveResult[];
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionCount}>{rows.length}</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Unidad actual</th>
              <th>Nueva unidad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => {
              const val = edits[g.id] ?? "";
              const isDirty =
                val.trim() !== "" && !isNaN(parseFloat(val)) && parseFloat(val) >= 0;
              const result = saveResults.find((r) => r.id === g.id);
              return (
                <tr
                  key={g.id}
                  className={
                    result?.ok
                      ? styles.rowSaved
                      : isDirty
                        ? styles.rowDirty
                        : undefined
                  }
                >
                  <td>{g.nombre}</td>
                  <td className={styles.priceCell}>
                    {fmt.format(parseFloat(g.valor_unitario))}
                  </td>
                  <td>
                    <div className={styles.inputWrap}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`${styles.priceInput} ${isDirty ? styles.priceInputDirty : ""} ${result?.ok ? styles.priceInputSaved : ""} ${result && !result.ok ? styles.priceInputError : ""}`}
                        value={val}
                        onChange={(e) => onEdit(g.id, e.target.value)}
                        placeholder="Nuevo valor…"
                        disabled={result?.ok}
                      />
                      {result?.ok && (
                        <CheckCircle2
                          size={15}
                          className={styles.savedIcon}
                        />
                      )}
                      {result && !result.ok && (
                        <span title={result.msg}>
                          <AlertCircle size={15} className={styles.errorIcon} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
