import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  TrendingUp,
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Save,
  Info,
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import styles from "./ActualizarPreciosGalenos.module.scss";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { hoyISO } from "@/app/shared/lib/fechas";
import { compararGalenos, avisoVigenciaGaleno } from "../nomenclador.helpers";
import {
  listGalenos,
  actualizarPreciosGalenosLote,
  cambiarVisibilidadGaleno,
  getResumenGalenos,
} from "../nomenclador.api";
import type { GalenoOut, GalenoResumenOut, GalenosPrecioLoteError } from "../nomenclador.types";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

// hoyISO y no toISOString(): este ultimo pasa a UTC, asi que despues de las
// 21:00 en Argentina proponia la vigencia del dia siguiente. Ver lib/fechas.ts.
const today = hoyISO;

/** Un galeno agrupado por código: los nivelados agrupan todos sus niveles. */
type Grupo = {
  codigo: string;
  nombre: string;
  nivelado: boolean;
  niveles: GalenoOut[]; // ordenados por nivel
  /** Se muestra en el boletín del médico. El toggle pisa todos los niveles juntos. */
  visible: boolean;
};

/** Valor unitario actual de un grupo: un único valor si todos los niveles coinciden, si no un rango. */
function grupoValorActual(g: Grupo): string {
  const nums = g.niveles.map((n) => parseFloat(n.valor_unitario));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  if (min === max) return fmt.format(min);
  return `${fmt.format(min)} – ${fmt.format(max)}`;
}

/**
 * Honorario de un nivel: unidades de honorarios × valor unitario del galeno.
 *
 * Es la misma cuenta que hace el backend al armar el componente "Honorarios" de
 * un valor (`subtotal = cantidad × valor_unitario`, ver
 * `nm_valores_componentes` y `services/nomenclador/service.py`). Se replica acá
 * para que al tipear un valor unitario nuevo se vea en pesos qué le pasa a cada
 * nivel, que es la cifra por la que se pregunta — el unitario solo no dice nada.
 *
 * `null` cuando el nivel no tiene unidades de honorarios cargadas: ahí no hay
 * cuenta que hacer, y mostrar $0 sería afirmar algo falso.
 */
function honorarioDe(unidades: string | null, valorUnitario: number): number | null {
  if (unidades == null) return null;
  const u = parseFloat(unidades);
  if (isNaN(u) || isNaN(valorUnitario)) return null;
  return u * valorUnitario;
}

/** Unidades sin ceros de relleno: `3.00` → `3`, `0.25` → `0,25`. */
const unidadesFmt = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 4 });

function formatUnidades(unidades: string | null): string | null {
  if (unidades == null) return null;
  const u = parseFloat(unidades);
  return isNaN(u) ? null : unidadesFmt.format(u);
}

type SaveResult = { codigo: string; nombre: string; ok: boolean; msg?: string };

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActualizarPreciosGalenos() {
  const [selectedOsNro, setSelectedOsNro] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [galenos, setGalenos] = useState<GalenoOut[]>([]);
  const [loadingOs, setLoadingOs] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({}); // keyed by código
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [vigencia, setVigencia] = useState(today());
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saveResults, setSaveResults] = useState<SaveResult[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toggling, setToggling] = useState<Record<string, boolean>>({}); // keyed by código

  const { data: osList = [] } = useObrasSociales();

  // Con qué nomencladores se usa cada galeno, en qué modo y qué niveles se apartan de la escala.
  const { data: resumen = [], refetch: refetchResumen } = useQuery({
    queryKey: ["galenos-resumen", selectedOsNro],
    queryFn: () => getResumenGalenos(selectedOsNro as number),
    enabled: selectedOsNro != null,
    staleTime: 30_000,
  });
  const resumenPorCodigo = useMemo(
    () => new Map<string, GalenoResumenOut>(resumen.map((r) => [r.codigo, r])),
    [resumen],
  );

  const loadGalenos = useCallback(async (osNro: number) => {
    setLoadingOs(true);
    setEdits({});
    setExpanded({});
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

  /** Refresca los galenos sin borrar edits/resultados (tras guardar). */
  const refreshGalenos = useCallback(async (osNro: number) => {
    try {
      const data = await listGalenos({ obra_social_nro: osNro });
      setGalenos(data.filter((g) => g.activo));
    } catch {
      /* mantener valores previos */
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

  // Agrupa los galenos por código; los nivelados quedan en un solo grupo con todos sus niveles.
  const grupos = useMemo<Grupo[]>(() => {
    const map = new Map<string, GalenoOut[]>();
    for (const g of galenos) {
      const arr = map.get(g.codigo) ?? [];
      arr.push(g);
      map.set(g.codigo, arr);
    }
    return [...map.entries()]
      .map(([codigo, rows]) => {
        const niveles = [...rows].sort(
          (a, b) => (a.nivel ?? 0) - (b.nivel ?? 0),
        );
        return {
          codigo,
          nombre: niveles[0].nombre,
          nivelado: rows.some((r) => r.nivel != null),
          niveles,
          visible: rows.every((r) => r.visible !== false),
        };
      })
      // El orden del boletín, no el alfabético. Ver `compararGalenos`.
      .sort(compararGalenos);
  }, [galenos]);

  const pendingEdits = useMemo(
    () =>
      Object.entries(edits).filter(([, v]) => {
        const n = parseFloat(v);
        return v.trim() !== "" && !isNaN(n) && n >= 0;
      }),
    [edits],
  );

  // La vigencia más nueva entre los galenos que se van a cambiar (o todos, si todavía no hay cambios):
  // si la fecha elegida no es posterior, se avisa qué pasa (no se bloquea).
  const avisoFecha = useMemo(() => {
    const editados = new Set(pendingEdits.map(([codigo]) => codigo));
    const masNueva = galenos
      .filter((g) => editados.size === 0 || editados.has(g.codigo))
      .reduce<string | undefined>((m, g) => (m === undefined || g.vigencia_desde > m ? g.vigencia_desde : m), undefined);
    return avisoVigenciaGaleno(vigencia, masNueva);
  }, [galenos, pendingEdits, vigencia]);

  function setEdit(codigo: string, val: string) {
    setEdits((prev) => ({ ...prev, [codigo]: val }));
  }

  function toggleExpand(codigo: string) {
    setExpanded((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  }

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  }

  /** Muestra/oculta el galeno en el boletín del médico. Optimista: si falla, se revierte. */
  async function toggleVisible(grupo: Grupo) {
    if (!selectedOsNro) return;
    const visible = !grupo.visible;
    const aplicar = (v: boolean) =>
      setGalenos((prev) =>
        prev.map((g) => (g.codigo === grupo.codigo ? { ...g, visible: v } : g)),
      );
    aplicar(visible);
    setToggling((prev) => ({ ...prev, [grupo.codigo]: true }));
    try {
      await cambiarVisibilidadGaleno({
        obra_social_nro: selectedOsNro,
        codigo: grupo.codigo,
        visible,
      });
      showToast(
        "success",
        visible
          ? `${grupo.nombre} vuelve a mostrarse en el boletín de los médicos.`
          : `${grupo.nombre} ya no se muestra en el boletín de los médicos.`,
      );
    } catch {
      aplicar(!visible);
      showToast("error", `No se pudo cambiar la visibilidad de ${grupo.nombre}.`);
    } finally {
      setToggling((prev) => {
        const next = { ...prev };
        delete next[grupo.codigo];
        return next;
      });
    }
  }

  async function doSaveAll() {
    setConfirmOpen(false);
    if (!selectedOsNro) return;
    setSaving(true);
    setSaveResults([]);

    // Un solo pedido y una sola transacción en el servidor: se aplican todos los galenos o
    // ninguno. (Antes iba un pedido por galeno: con los lentos el navegador cortaba a los 15 s,
    // el servidor igual los terminaba y los siguientes chocaban con ellos.)
    const items = pendingEdits
      .filter(([codigo]) => grupos.some((gr) => gr.codigo === codigo))
      .map(([codigo, valStr]) => ({ codigo, nuevo_valor_unitario: parseFloat(valStr) }));

    try {
      await actualizarPreciosGalenosLote({
        obra_social_nro: selectedOsNro,
        vigencia_desde: vigencia,
        items,
      });
      setSaveResults(
        items.map(({ codigo }) => {
          const grupo = grupos.find((gr) => gr.codigo === codigo) as Grupo;
          return {
            codigo,
            nombre: grupo.nombre,
            ok: true,
            msg: grupo.nivelado ? `${grupo.niveles.length} nivel(es) actualizados` : undefined,
          };
        }),
      );
      setEdits({});
      showToast("success", `${items.length} galeno(s) actualizados con éxito.`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: Partial<GalenosPrecioLoteError> } };
      const data = err?.response?.data;
      if (data?.errores?.length) {
        // Se rechazó el lote entero: se marcan los galenos que lo impidieron.
        setSaveResults(
          data.errores.map((x) => ({ codigo: x.codigo, nombre: x.nombre, ok: false, msg: x.motivo })),
        );
        showToast("error", "No se aplicó ningún cambio. Revisá los galenos marcados.");
      } else if (data) {
        showToast("error", data.detail ?? "No se aplicó ningún cambio.");
      } else {
        // Sin respuesta (corte de red o timeout): el servidor puede haber terminado igual.
        showToast(
          "error",
          "No se recibió respuesta del servidor. Verificá los valores actuales antes de reintentar.",
        );
      }
    } finally {
      setSaving(false);
    }

    // Refresca los valores actuales (el endpoint no devuelve las filas).
    await refreshGalenos(selectedOsNro);
    void refetchResumen();
  }

  function handleSaveAll() {
    if (pendingEdits.length === 0 || !vigencia) return;
    setConfirmOpen(true);
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

              {/* Info: cómo funcionan los nivelados */}
              <div className={styles.infoBox}>
                <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  En galenos <strong>nivelados</strong>, el valor unitario que
                  ingreses se aplica a <strong>todos los niveles</strong> a la
                  vez. Las unidades de honorarios y ayudante de cada nivel se
                  conservan tal cual. Con <strong>Visible en boletín</strong>{" "}
                  apagado, el galeno no aparece en Valores Boletín de los
                  médicos para esta obra social (no cambia precios ni
                  facturación).
                </span>
              </div>

              {/* Aviso de vigencia igual o anterior a la vigente */}
              {avisoFecha && (
                <div className={styles.conflictWarning}>
                  <AlertCircle size={14} />
                  <span>{avisoFecha}</span>
                </div>
              )}

              {/* Save results summary */}
              {saveResults.length > 0 && (
                <div className={styles.resultsBox}>
                  {saveResults.map((r) => (
                    <div
                      key={r.codigo}
                      className={`${styles.resultRow} ${r.ok ? styles.resultOk : styles.resultErr}`}
                    >
                      {r.ok ? (
                        <CheckCircle2 size={13} />
                      ) : (
                        <AlertCircle size={13} />
                      )}
                      <span>
                        {r.nombre}:{" "}
                        {r.ok
                          ? r.msg ?? "actualizado correctamente"
                          : r.msg}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {grupos.length === 0 ? (
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
                  grupos={grupos}
                  edits={edits}
                  onEdit={setEdit}
                  expanded={expanded}
                  onToggleExpand={toggleExpand}
                  saveResults={saveResults}
                  toggling={toggling}
                  onToggleVisible={toggleVisible}
                  resumenPorCodigo={resumenPorCodigo}
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

      <ConfirmModal
        isOpen={confirmOpen}
        variant="warning"
        title="Confirmar actualización"
        message={`¿Actualizar el valor de ${pendingEdits.length} galeno(s) con vigencia desde ${vigencia}?\n\nEn los nivelados, el valor se aplica a todos los niveles (conservando sus unidades). ${avisoFecha ?? "Esta operación crea nuevos registros manteniendo el historial de valores anteriores."}`}
        confirmLabel="Actualizar"
        onConfirm={doSaveAll}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ─── PriceSection ─────────────────────────────────────────────────────────────

function PriceSection({
  title,
  grupos,
  edits,
  onEdit,
  expanded,
  onToggleExpand,
  saveResults,
  toggling,
  onToggleVisible,
  resumenPorCodigo,
}: {
  title: string;
  grupos: Grupo[];
  edits: Record<string, string>;
  onEdit: (codigo: string, val: string) => void;
  expanded: Record<string, boolean>;
  onToggleExpand: (codigo: string) => void;
  saveResults: SaveResult[];
  toggling: Record<string, boolean>;
  onToggleVisible: (grupo: Grupo) => void;
  resumenPorCodigo: Map<string, GalenoResumenOut>;
}) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        <span className={styles.sectionCount}>{grupos.length}</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Modo</th>
              <th>Unidad actual</th>
              <th>Nueva unidad</th>
              <th>Visible en boletín</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((grupo) => {
              const val = edits[grupo.codigo] ?? "";
              const isDirty =
                val.trim() !== "" &&
                !isNaN(parseFloat(val)) &&
                parseFloat(val) >= 0;
              const result = saveResults.find((r) => r.codigo === grupo.codigo);
              const isOpen = !!expanded[grupo.codigo];
              const info = resumenPorCodigo.get(grupo.codigo);
              const ajustados = info ? new Map(info.niveles.map((x) => [x.nivel, x])) : new Map();
              return (
                <Fragment key={grupo.codigo}>
                  <tr
                    className={[
                      result?.ok
                        ? styles.rowSaved
                        : isDirty
                          ? styles.rowDirty
                          : "",
                      grupo.visible ? "" : styles.rowOculto,
                    ].join(" ").trim() || undefined}
                  >
                    <td>
                      {grupo.nivelado ? (
                        <button
                          type="button"
                          className={styles.nombreToggle}
                          onClick={() => onToggleExpand(grupo.codigo)}
                          title="Ver niveles"
                        >
                          {isOpen ? (
                            <ChevronDown size={14} />
                          ) : (
                            <ChevronRight size={14} />
                          )}
                          <span>{grupo.nombre}</span>
                        </button>
                      ) : (
                        <span>{grupo.nombre}</span>
                      )}
                    </td>
                    <td>
                      {grupo.nivelado ? (
                        <span className={styles.nivelBadge}>
                          {info?.modo === "por_nivel" ? "Precio por nivel" : "Calculado"} · {grupo.niveles.length} niveles
                        </span>
                      ) : (
                        <span className={styles.sinNivelBadge}>Calculado</span>
                      )}
                    </td>
                    <td className={styles.priceCell}>
                      {grupoValorActual(grupo)}
                    </td>
                    <td>
                      <div className={styles.inputWrap}>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className={`${styles.priceInput} ${isDirty ? styles.priceInputDirty : ""} ${result?.ok ? styles.priceInputSaved : ""} ${result && !result.ok ? styles.priceInputError : ""}`}
                          value={val}
                          onChange={(e) => onEdit(grupo.codigo, e.target.value)}
                          placeholder={
                            grupo.nivelado
                              ? "Valor para todos los niveles…"
                              : "Nuevo valor…"
                          }
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
                    <td className={styles.visibleCell}>
                      <label
                        className={styles.visibleToggle}
                        title={
                          grupo.visible
                            ? "Se muestra en Valores Boletín de los médicos"
                            : "Oculto en Valores Boletín de los médicos"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={grupo.visible}
                          disabled={!!toggling[grupo.codigo]}
                          onChange={() => onToggleVisible(grupo)}
                          aria-label={`Mostrar ${grupo.nombre} en el boletín de los médicos`}
                        />
                        <span className={styles.visibleTrack} />
                        <span className={styles.visibleLabel}>
                          {grupo.visible ? "Visible" : "Oculto"}
                        </span>
                      </label>
                    </td>
                  </tr>

                  {/* Detalle de niveles (solo lectura). La fila se lee como una
                      cuenta de izquierda a derecha: unidades × unitario = honorario.
                      Con un valor nuevo tipeado, la última celda muestra a cuánto
                      pasa el honorario de ese nivel. */}
                  {grupo.nivelado &&
                    isOpen &&
                    grupo.niveles.map((n) => {
                      const unidadActual = parseFloat(n.valor_unitario);
                      const unidadNueva = isDirty ? parseFloat(val) : null;
                      // Unidades efectivas (ajuste de la OS o escala del nomenclador); si el
                      // resumen todavía no llegó, las propias del galeno.
                      const efectivo = ajustados.get(n.nivel ?? -1);
                      const unidadesHon = efectivo ? efectivo.unidades_honorarios : n.unidades_honorarios;
                      const unidadesAyu = efectivo ? efectivo.unidades_ayudante : n.unidades_ayudante;
                      const uHon = formatUnidades(unidadesHon);
                      const uAyu = formatUnidades(unidadesAyu);
                      const honActual = honorarioDe(unidadesHon, unidadActual);
                      const honNuevo =
                        unidadNueva != null
                          ? honorarioDe(unidadesHon, unidadNueva)
                          : null;
                      return (
                        <tr key={n.id} className={styles.nivelRow}>
                          <td className={styles.nivelCell}>Nivel {n.nivel}</td>
                          <td className={styles.nivelUnits}>
                            {uHon ?? "—"} un. hon.
                            {uAyu != null && (
                              <span className={styles.nivelAyudante}>
                                {" "}· {uAyu} ay.
                              </span>
                            )}
                            {efectivo?.ajustado && (
                              <span className={styles.ajustado} title="Esta obra social pactó unidades distintas a las de la escala del nomenclador">
                                AJUSTADO
                              </span>
                            )}
                          </td>
                          <td className={styles.nivelValor}>
                            {fmt.format(unidadActual)}
                          </td>
                          <td className={styles.nivelHonorario}>
                            {honActual == null ? (
                              <span className={styles.nivelSinHonorario}>
                                sin unidades de honorarios
                              </span>
                            ) : honNuevo == null ? (
                              <span title={`${uHon} × ${fmt.format(unidadActual)}`}>
                                = {fmt.format(honActual)}
                              </span>
                            ) : (
                              <span
                                className={styles.nivelHonorarioCambio}
                                title={`${uHon} × ${fmt.format(unidadNueva as number)}`}
                              >
                                <span className={styles.nivelHonorarioPrevio}>
                                  {fmt.format(honActual)}
                                </span>
                                <ArrowRight size={11} />
                                <strong className={styles.nivelHonorarioNuevo}>
                                  {fmt.format(honNuevo)}
                                </strong>
                              </span>
                            )}
                          </td>
                          <td />
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
