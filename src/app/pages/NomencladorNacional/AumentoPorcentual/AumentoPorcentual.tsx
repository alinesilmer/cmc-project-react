import { useEffect, useMemo, useState } from "react";
import {
  Search, X as XIcon, Percent, CalendarDays, TrendingUp, TrendingDown,
  Eye, EyeOff, CheckCircle2, AlertTriangle, Loader2, RotateCcw, Building2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

import styles from "./AumentoPorcentual.module.scss";
import {
  listValores,
  actualizarPorcentajeValores,
  revertirActualizacionValores,
} from "../nomenclador.api";
import { ORIGEN_LABELS } from "../nomenclador.types";
import type { Origen, ValorOut, ActualizacionMasivaResult } from "../nomenclador.types";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Scope = "todos" | "codigos" | "rango";
const ORIGENES: Origen[] = ["NNE", "NE", "NN"];
const PREVIEW_SAMPLE = 40;

function totalOf(v: ValorOut): number {
  return v.componentes.reduce((s, c) => s + (parseFloat(c.subtotal) || 0), 0);
}

// Todos los valores activos de la OS, paginando /api/valores_nm/ (estado=activo).
async function fetchActivosOS(nroOS: number): Promise<ValorOut[]> {
  const all: ValorOut[] = [];
  const size = 200;
  for (let page = 1; page <= 100; page++) {
    const batch = await listValores({ obra_social_nro: nroOS, estado: "activo", page, size });
    all.push(...batch);
    if (batch.length < size) break;
  }
  return all;
}

export default function AumentoPorcentual() {
  // Obra social
  const [selectedOS, setSelectedOS] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  // Parámetros
  const [origen, setOrigen] = useState<Origen>("NNE");
  const [vigencia, setVigencia] = useState("");
  const [pct, setPct] = useState("");

  // Alcance
  const [scope, setScope] = useState<Scope>("todos");
  const [codeInput, setCodeInput] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [rangeDesde, setRangeDesde] = useState("");
  const [rangeHasta, setRangeHasta] = useState("");

  // Vista previa + confirmación
  const [showPreview, setShowPreview] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<ActualizacionMasivaResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reversión
  const [revertVigencia, setRevertVigencia] = useState("");
  const [revertConfirming, setRevertConfirming] = useState(false);
  const [revertResult, setRevertResult] = useState<ActualizacionMasivaResult | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  const osNro = selectedOS?.nro_obra_social ?? null;

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 50);
  }, [osList, osSearch]);

  const pctNum = useMemo(() => {
    const n = parseFloat(pct.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [pct]);

  // Vista previa: valores activos de la OS (se trae bajo demanda).
  const previewQuery = useQuery({
    queryKey: ["valores-activos-os", osNro],
    queryFn: () => fetchActivosOS(osNro!),
    enabled: !!osNro && showPreview,
    staleTime: 60 * 1000,
  });

  const inScope = useMemo(() => {
    const codeSet = new Set(codes);
    const desde = rangeDesde.trim();
    const hasta = rangeHasta.trim();
    return (codigo: string): boolean => {
      if (scope === "codigos") return codeSet.has(codigo);
      if (scope === "rango") return !!desde && !!hasta && codigo >= desde && codigo <= hasta;
      return true;
    };
  }, [scope, codes, rangeDesde, rangeHasta]);

  const preview = useMemo(() => {
    const activos = previewQuery.data ?? [];
    const scoped = activos.filter((v) => v.origen === origen && inScope(v.codigo));
    const afectados = scoped.filter((v) => v.modalidad === "fijo");
    const omitidos = scoped.filter((v) => v.modalidad === "galeno");
    return { afectados, omitidosCount: omitidos.length };
  }, [previewQuery.data, origen, inScope]);

  const factor = pctNum !== null ? 1 + pctNum / 100 : 1;
  const pctPositive = pctNum !== null && pctNum > 0;
  const pctNegative = pctNum !== null && pctNum < 0;

  // Validación de alcance
  const scopeValid =
    scope === "todos" ||
    (scope === "codigos" && codes.length > 0) ||
    (scope === "rango" && rangeDesde.trim() !== "" && rangeHasta.trim() !== "");

  const canApply =
    osNro != null && vigencia !== "" && pctNum !== null && pctNum !== 0 && scopeValid;

  // Al cambiar parámetros, invalidar resultado/confirmación previos.
  useEffect(() => {
    setResult(null);
    setConfirming(false);
    setError(null);
  }, [osNro, origen, vigencia, pct, scope, codes, rangeDesde, rangeHasta]);

  function addCode() {
    const c = codeInput.trim();
    if (!c || codes.includes(c)) { setCodeInput(""); return; }
    setCodes((prev) => [...prev, c]);
    setCodeInput("");
  }

  const applyMutation = useMutation({
    mutationFn: () =>
      actualizarPorcentajeValores({
        obra_social_nro: osNro!,
        origen,
        porcentaje: pctNum!,
        vigencia_desde: vigencia,
        filtro_codigos: scope === "codigos" ? codes : null,
        filtro_rango: scope === "rango" ? { desde: rangeDesde.trim(), hasta: rangeHasta.trim() } : null,
      }),
    onSuccess: (res) => {
      setResult(res);
      setConfirming(false);
      if (showPreview) void previewQuery.refetch();
    },
    onError: () => setError("No se pudo aplicar la actualización. Revisá los datos e intentá de nuevo."),
  });

  const revertMutation = useMutation({
    mutationFn: () =>
      revertirActualizacionValores({ obra_social_nro: osNro!, vigencia_revertir: revertVigencia }),
    onSuccess: (res) => {
      setRevertResult(res);
      setRevertConfirming(false);
      if (showPreview) void previewQuery.refetch();
    },
    onError: () => setRevertError("No se pudo revertir. Verificá la obra social y la vigencia."),
  });

  function resetOS(os: ObraSocialListItem | null) {
    setSelectedOS(os);
    setOsSearch("");
    setOsOpen(false);
    setResult(null);
    setRevertResult(null);
    setError(null);
    setRevertError(null);
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}><Percent size={20} /></span>
        <div>
          <h1 className={styles.title}>Aumento Porcentual</h1>
         
        </div>
      </div>

      {/* 1 · Obra social */}
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.stepBadge}>1</span>
          <div>
            <h2 className={styles.panelTitle}>Obra social</h2>
            <p className={styles.panelDesc}>Elegí la obra social cuyos valores vas a actualizar.</p>
          </div>
        </div>

        {selectedOS ? (
          <div className={styles.chosen}>
            <span className={styles.chosenNro}>{selectedOS.nro_obra_social}</span>
            <span className={styles.chosenName}>{selectedOS.nombre}</span>
            <button type="button" className={styles.chosenClear} onClick={() => resetOS(null)} title="Cambiar">
              <XIcon size={15} />
            </button>
          </div>
        ) : (
          <div className={styles.autocomplete}>
            <div className={styles.inputWrap}>
              <Search size={15} className={styles.inputIcon} />
              <input
                className={styles.input}
                placeholder="Buscar por nombre o número…"
                value={osSearch}
                onChange={(e) => { setOsSearch(e.target.value); setOsOpen(true); }}
                onFocus={() => setOsOpen(true)}
                onBlur={() => setTimeout(() => setOsOpen(false), 150)}
              />
            </div>
            {osOpen && filteredOS.length > 0 && (
              <ul className={styles.dropdown}>
                {filteredOS.map((os) => (
                  <li
                    key={os.nro_obra_social}
                    className={styles.option}
                    onMouseDown={(e) => { e.preventDefault(); resetOS(os); }}
                  >
                    <span className={styles.optionNro}>{os.nro_obra_social}</span>
                    <span className={styles.optionName}>{os.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {osNro != null && (
        <>
          {/* 2 · Parámetros */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepBadge}>2</span>
              <div>
                <h2 className={styles.panelTitle}>Parámetros</h2>
                <p className={styles.panelDesc}>Origen del nomenclador, vigencia del nuevo precio y porcentaje.</p>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Origen</label>
                <select className={styles.select} value={origen} onChange={(e) => setOrigen(e.target.value as Origen)}>
                  {ORIGENES.map((o) => (
                    <option key={o} value={o}>{o} — {ORIGEN_LABELS[o]}</option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <CalendarDays size={13} /> Vigencia desde
                </label>
                <input className={styles.dateInput} type="date" value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Porcentaje</label>
                <div className={styles.pctInputWrap}>
                  <input
                    className={`${styles.pctInput} ${pctPositive ? styles.pctUp : pctNegative ? styles.pctDown : ""}`}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={pct}
                    onChange={(e) => setPct(e.target.value)}
                  />
                  <span className={styles.pctSuffix}>%</span>
                </div>
              </div>
            </div>

            {pctNum !== null && pctNum !== 0 && (
              <div className={`${styles.indicator} ${pctPositive ? styles.indicatorUp : styles.indicatorDown}`}>
                {pctPositive ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                <span>
                  Los valores fijos {pctPositive ? "subirán" : "bajarán"} un {Math.abs(pctNum)}%
                  {vigencia && ` a partir del ${vigencia}`}.
                </span>
              </div>
            )}
          </section>

          {/* 3 · Alcance */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepBadge}>3</span>
              <div>
                <h2 className={styles.panelTitle}>Alcance</h2>
                <p className={styles.panelDesc}>A qué códigos se aplica el porcentaje.</p>
              </div>
            </div>

            <div className={styles.scopeTabs}>
              {([
                { key: "todos", label: "Todos los códigos" },
                { key: "codigos", label: "Por códigos" },
                { key: "rango", label: "Por rango" },
              ] as { key: Scope; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.scopeTab} ${scope === key ? styles.scopeTabActive : ""}`}
                  onClick={() => setScope(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {scope === "codigos" && (
              <div className={styles.scopeBody}>
                <div className={styles.codesInputRow}>
                  <input
                    className={styles.input}
                    placeholder="Agregar código (Enter)…"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCode(); } }}
                  />
                  <button type="button" className={styles.btnSecondary} onClick={addCode} disabled={!codeInput.trim()}>
                    Agregar
                  </button>
                </div>
                {codes.length > 0 && (
                  <div className={styles.chipsRow}>
                    {codes.map((c) => (
                      <span key={c} className={styles.chip}>
                        {c}
                        <button
                          type="button"
                          className={styles.chipRemove}
                          onClick={() => setCodes((prev) => prev.filter((x) => x !== c))}
                          aria-label={`Quitar ${c}`}
                        >
                          <XIcon size={11} />
                        </button>
                      </span>
                    ))}
                    <button type="button" className={styles.chipClear} onClick={() => setCodes([])}>Limpiar</button>
                  </div>
                )}
              </div>
            )}

            {scope === "rango" && (
              <div className={styles.scopeBody}>
                <div className={styles.rangeRow}>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Código desde</label>
                    <input className={styles.input} placeholder="ej: 420000" value={rangeDesde} onChange={(e) => setRangeDesde(e.target.value)} />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Código hasta</label>
                    <input className={styles.input} placeholder="ej: 429999" value={rangeHasta} onChange={(e) => setRangeHasta(e.target.value)} />
                  </div>
                </div>
                <p className={styles.hint}>Incluye ambos extremos. La comparación es alfabética por código.</p>
              </div>
            )}
          </section>

          {/* 4 · Vista previa + aplicar */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepBadge}>4</span>
              <div>
                <h2 className={styles.panelTitle}>Revisar y aplicar</h2>
                <p className={styles.panelDesc}>Previsualizá el impacto y confirmá la actualización.</p>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setShowPreview((v) => !v)}
                disabled={!scopeValid}
              >
                {showPreview ? <EyeOff size={15} /> : <Eye size={15} />}
                {showPreview ? "Ocultar vista previa" : "Vista previa"}
              </button>

              {!confirming ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={!canApply || applyMutation.isPending}
                  onClick={() => { setConfirming(true); setResult(null); }}
                >
                  <Percent size={15} /> Aplicar porcentaje
                </button>
              ) : (
                <div className={styles.confirmBar}>
                  <span className={styles.confirmText}>
                    ¿Aplicar {pctPositive ? "+" : ""}{pctNum}% a {selectedOS?.nombre} ({origen}) con vigencia {vigencia}?
                  </span>
                  <button type="button" className={styles.btnPrimary} disabled={applyMutation.isPending} onClick={() => applyMutation.mutate()}>
                    {applyMutation.isPending ? <Loader2 size={15} className={styles.spin} /> : <CheckCircle2 size={15} />}
                    Confirmar
                  </button>
                  <button type="button" className={styles.btnGhost} disabled={applyMutation.isPending} onClick={() => setConfirming(false)}>
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {error && <div className={styles.resultErr}><AlertTriangle size={15} /> {error}</div>}

            {result && (
              <div className={styles.resultBox}>
                <div className={styles.resultOk}>
                  <CheckCircle2 size={16} />
                  {result.actualizados} valor{result.actualizados !== 1 ? "es" : ""} actualizado{result.actualizados !== 1 ? "s" : ""}
                  {result.omitidos > 0 && (
                    <span className={styles.resultMuted}> · {result.omitidos} omitido{result.omitidos !== 1 ? "s" : ""} (calculables por galeno)</span>
                  )}
                </div>
                {result.errores.length > 0 && (
                  <div className={styles.resultErr}>
                    <AlertTriangle size={15} /> {result.errores.length} con error
                    <ul className={styles.errorList}>
                      {result.errores.slice(0, 8).map((e, i) => (
                        <li key={i}>{String((e as Record<string, unknown>).motivo ?? JSON.stringify(e))}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {showPreview && (
              <div className={styles.previewCard}>
                {previewQuery.isLoading ? (
                  <div className={styles.hintCenter}><Loader2 size={18} className={styles.spin} /> Calculando vista previa…</div>
                ) : (
                  <>
                    <div className={styles.previewStats}>
                      <span className={styles.statPill}>
                        <strong>{preview.afectados.length}</strong> afectado{preview.afectados.length !== 1 ? "s" : ""}
                      </span>
                      {preview.omitidosCount > 0 && (
                        <span className={`${styles.statPill} ${styles.statPillMuted}`}>
                          <strong>{preview.omitidosCount}</strong> omitido{preview.omitidosCount !== 1 ? "s" : ""} (galeno)
                        </span>
                      )}
                    </div>

                    {preview.afectados.length === 0 ? (
                      <p className={styles.hint}>No hay valores fijos que coincidan con el alcance elegido.</p>
                    ) : (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr><th>Código</th><th>Descripción</th><th className={styles.right}>Actual</th><th className={styles.right}>Nuevo</th></tr>
                          </thead>
                          <tbody>
                            {preview.afectados.slice(0, PREVIEW_SAMPLE).map((v) => {
                              const t = totalOf(v);
                              return (
                                <tr key={v.id}>
                                  <td className={styles.codeCell}>{v.codigo}{v.nivel != null ? ` · N${v.nivel}` : ""}</td>
                                  <td className={styles.descCell}>{v.descripcion ?? "—"}</td>
                                  <td className={`${styles.right} ${styles.oldVal}`}>{money.format(t)}</td>
                                  <td className={`${styles.right} ${styles.newVal}`}>{money.format(Math.round(t * factor * 100) / 100)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {preview.afectados.length > PREVIEW_SAMPLE && (
                          <p className={styles.hint}>…y {preview.afectados.length - PREVIEW_SAMPLE} más.</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>

          {/* Revertir */}
          <section className={`${styles.panel} ${styles.panelDanger}`}>
            <div className={styles.panelHeader}>
              <span className={`${styles.stepBadge} ${styles.stepBadgeDanger}`}><RotateCcw size={14} /></span>
              <div>
                <h2 className={styles.panelTitle}>Revertir una actualización</h2>
                <p className={styles.panelDesc}>
                  Elimina los valores cargados con una vigencia y reactiva los anteriores de {selectedOS?.nombre}.
                </p>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}><CalendarDays size={13} /> Vigencia a revertir</label>
                <input className={styles.dateInput} type="date" value={revertVigencia} onChange={(e) => { setRevertVigencia(e.target.value); setRevertResult(null); setRevertConfirming(false); setRevertError(null); }} />
              </div>
            </div>

            <div className={styles.actions}>
              {!revertConfirming ? (
                <button type="button" className={styles.btnDanger} disabled={!revertVigencia} onClick={() => { setRevertConfirming(true); setRevertResult(null); }}>
                  <RotateCcw size={15} /> Revertir
                </button>
              ) : (
                <div className={styles.confirmBar}>
                  <span className={styles.confirmText}>¿Revertir la vigencia {revertVigencia} de {selectedOS?.nombre}? Es un borrado definitivo de esa carga.</span>
                  <button type="button" className={styles.btnDanger} disabled={revertMutation.isPending} onClick={() => revertMutation.mutate()}>
                    {revertMutation.isPending ? <Loader2 size={15} className={styles.spin} /> : <RotateCcw size={15} />}
                    Sí, revertir
                  </button>
                  <button type="button" className={styles.btnGhost} disabled={revertMutation.isPending} onClick={() => setRevertConfirming(false)}>Cancelar</button>
                </div>
              )}
            </div>

            {revertError && <div className={styles.resultErr}><AlertTriangle size={15} /> {revertError}</div>}
            {revertResult && (
              <div className={styles.resultBox}>
                <div className={styles.resultOk}>
                  <CheckCircle2 size={16} />
                  {revertResult.actualizados} valor{revertResult.actualizados !== 1 ? "es" : ""} revertido{revertResult.actualizados !== 1 ? "s" : ""}
                </div>
                {revertResult.errores.length > 0 && (
                  <div className={styles.resultErr}><AlertTriangle size={15} /> {revertResult.errores.length} con error</div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {osNro == null && (
        <div className={styles.prompt}>
          <Building2 size={30} />
          <span>Elegí una obra social para empezar.</span>
        </div>
      )}
    </div>
  );
}
