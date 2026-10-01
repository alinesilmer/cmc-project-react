import { useMemo, useState } from "react";
import {
  Search,
  X as XIcon,
  Percent,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Building2,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

import styles from "./AumentoPorcentual.module.scss";
import {
  listGalenos,
  actualizarPorcentajeValores,
  revertirActualizacionValores,
} from "../nomenclador.api";
import { ORIGEN_LABELS } from "../nomenclador.types";
import type {
  Origen,
  AumentoPorcentualResult,
  AumentoDetalleItem,
  ActualizarPorcentajePayload,
} from "../nomenclador.types";
import type { ValorOut, ActualizacionMasivaResult } from "../nomenclador.types";
import { paginar } from "@/app/shared/lib/paginar";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Scope = "todos" | "codigos" | "rango";
type FiltroEstado = "todos" | "actualiza" | "omitido";
const ORIGENES: Origen[] = ["NE", "NN"];
const LIMITE_FILAS = 100;

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function fmtMonto(v: string | null): string {
  if (v == null) return "—";
  const n = parseFloat(v);
  return Number.isFinite(n) ? money.format(n) : "—";
}

// ─── Tabla de detalle (vista previa, resultado y reversión) ──────────────────

function DetalleTabla({
  items,
  espMap,
  labelNuevo = "Nuevo",
}: {
  items: AumentoDetalleItem[];
  espMap: Map<number, string>;
  labelNuevo?: string;
}) {
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [q, setQ] = useState("");

  const visibles = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((it) => {
      if (filtro === "actualiza" && it.estado !== "actualiza") return false;
      if (filtro === "omitido" && it.estado === "actualiza") return false;
      if (!qq) return true;
      return (
        it.codigo.toLowerCase().includes(qq) ||
        (it.descripcion ?? "").toLowerCase().includes(qq)
      );
    });
  }, [items, filtro, q]);

  const cuenta = (f: FiltroEstado) =>
    f === "todos"
      ? items.length
      : f === "actualiza"
        ? items.filter((i) => i.estado === "actualiza").length
        : items.filter((i) => i.estado !== "actualiza").length;

  if (items.length === 0) {
    return (
      <p className={styles.hint}>No hay nada dentro del alcance elegido.</p>
    );
  }

  return (
    <div className={styles.detalle}>
      <div className={styles.filterRow}>
        <div className={styles.scopeTabs}>
          {(
            [
              ["todos", "Todos"],
              ["actualiza", "Se actualizan"],
              ["omitido", "Omitidos"],
            ] as [FiltroEstado, string][]
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={`${styles.scopeTab} ${filtro === k ? styles.scopeTabActive : ""}`}
              onClick={() => setFiltro(k)}
            >
              {label} ({cuenta(k)})
            </button>
          ))}
        </div>
        <div className={styles.inputWrap} style={{ maxWidth: 280 }}>
          <Search size={15} className={styles.inputIcon} />
          <input
            className={styles.input}
            placeholder="Buscar código o descripción…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar en el detalle"
          />
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Código</th>
              <th>Descripción / Galeno</th>
              <th>Nivel / Especialidad</th>
              <th className={styles.right}>Actual</th>
              <th className={styles.right}>{labelNuevo}</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.slice(0, LIMITE_FILAS).map((it, i) => (
              <tr
                key={`${it.tipo}-${it.codigo}-${it.nivel ?? ""}-${it.especialidad_id_colegio ?? ""}-${i}`}
              >
                <td>
                  <span
                    className={`${styles.tipoBadge} ${it.tipo === "galeno" ? styles.tipoGaleno : ""}`}
                  >
                    {it.tipo === "galeno" ? "Galeno" : "Valor"}
                  </span>
                </td>
                <td className={styles.codeCell}>
                  {it.tipo === "galeno" ? "—" : it.codigo}
                </td>
                <td className={styles.descCell}>{it.descripcion ?? "—"}</td>
                <td className={styles.codeCell}>
                  {[
                    it.nivel != null
                      ? `Nivel ${it.nivel}`
                      : it.tipo === "galeno"
                        ? "Sin niveles"
                        : null,
                    it.especialidad_id_colegio != null
                      ? (espMap.get(it.especialidad_id_colegio) ??
                        `Esp. ${it.especialidad_id_colegio}`)
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>
                <td className={`${styles.right} ${styles.oldVal}`}>
                  {fmtMonto(it.actual)}
                </td>
                <td
                  className={`${styles.right} ${it.estado === "actualiza" ? styles.newVal : styles.oldVal}`}
                >
                  {it.estado === "actualiza" ? fmtMonto(it.nuevo) : "—"}
                </td>
                <td>
                  {it.estado === "actualiza" ? (
                    <span className={styles.estadoOk}>Se actualiza</span>
                  ) : (
                    <span
                      className={
                        it.estado === "error"
                          ? styles.estadoErr
                          : styles.estadoOmit
                      }
                    >
                      {it.estado === "error" ? "Error" : "Omitido"}
                      {it.motivo ? ` · ${it.motivo}` : ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibles.length > LIMITE_FILAS && (
        <p className={styles.hint}>…y {visibles.length - LIMITE_FILAS} más.</p>
      )}
      {visibles.length === 0 && (
        <p className={styles.hint}>Sin coincidencias.</p>
      )}
    </div>
  );
}

function Resumen({ r, verbo }: { r: AumentoPorcentualResult; verbo: string }) {
  return (
    <div className={styles.previewStats}>
      <span className={styles.statPill}>
        <strong>{r.actualizados}</strong> valor
        {r.actualizados !== 1 ? "es" : ""} {verbo}
      </span>
      <span className={styles.statPill}>
        <strong>{r.galenos_actualizados}</strong> galeno
        {r.galenos_actualizados !== 1 ? "s" : ""} {verbo}
      </span>
      {r.omitidos > 0 && (
        <span className={`${styles.statPill} ${styles.statPillMuted}`}>
          <strong>{r.omitidos}</strong> omitido{r.omitidos !== 1 ? "s" : ""}
        </span>
      )}
      {r.errores.length > 0 && (
        <span className={`${styles.statPill} ${styles.statPillErr}`}>
          <strong>{r.errores.length}</strong> con error
        </span>
      )}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function AumentoPorcentual() {
  // Obra social
  const [selectedOS, setSelectedOS] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  // Qué aumentar
  const [incluirFijos, setIncluirFijos] = useState(true);
  const [incluirGalenos, setIncluirGalenos] = useState(false);
  const [galenosSel, setGalenosSel] = useState<string[]>([]);

  // Parámetros
  const [origen, setOrigen] = useState<Origen>("NE");
  const [vigencia, setVigencia] = useState("");
  const [pct, setPct] = useState("");

  // Alcance (solo valores fijos)
  const [scope, setScope] = useState<Scope>("todos");
  const [codeInput, setCodeInput] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [rangeDesde, setRangeDesde] = useState("");
  const [rangeHasta, setRangeHasta] = useState("");

  // Vista previa (backend, dry_run) + aplicar
  const [preview, setPreview] = useState<{
    key: string;
    res: AumentoPorcentualResult;
  } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<AumentoPorcentualResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reversión
  const [revertVigencia, setRevertVigencia] = useState("");
  const [revertPreview, setRevertPreview] =
    useState<AumentoPorcentualResult | null>(null);
  const [revertConfirming, setRevertConfirming] = useState(false);
  const [revertResult, setRevertResult] =
    useState<AumentoPorcentualResult | null>(null);
  const [revertError, setRevertError] = useState<string | null>(null);

  const osNro = selectedOS?.nro_obra_social ?? null;

  const { data: osList = [] } = useObrasSociales();
  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });
  const espMap = useMemo(
    () => new Map(especialidades.map((e) => [e.id_colegio_espe, e.nombre])),
    [especialidades],
  );

  const galenosQuery = useQuery({
    queryKey: ["galenos-os", osNro],
    queryFn: () => listGalenos({ obra_social_nro: osNro! }),
    enabled: osNro != null && incluirGalenos,
    staleTime: 60 * 1000,
  });

  // Una opción por código de galeno vigente (todos sus niveles se aumentan juntos).
  const galenoOptions = useMemo(() => {
    const porCodigo = new Map<string, { nombre: string; niveles: number[] }>();
    for (const g of galenosQuery.data ?? []) {
      if (!g.activo || g.vigencia_hasta) continue;
      const prev = porCodigo.get(g.codigo) ?? { nombre: g.nombre, niveles: [] };
      if (g.nivel != null) prev.niveles.push(g.nivel);
      porCodigo.set(g.codigo, prev);
    }
    return [...porCodigo.entries()].map(([codigo, { nombre, niveles }]) => ({
      value: codigo,
      label: nombre,
      hint:
        niveles.length === 0
          ? "Sin niveles"
          : `${niveles.length} nivel${niveles.length === 1 ? "" : "es"} (${Math.min(...niveles)}–${Math.max(...niveles)})`,
    }));
  }, [galenosQuery.data]);

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const q = osSearch.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre.toLowerCase().includes(q) ||
          String(os.nro_obra_social).includes(q),
      )
      .slice(0, 50);
  }, [osList, osSearch]);

  const pctNum = useMemo(() => {
    const n = parseFloat(pct.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }, [pct]);

  const pctPositive = pctNum !== null && pctNum > 0;
  const pctNegative = pctNum !== null && pctNum < 0;

  const scopeValid =
    scope === "todos" ||
    (scope === "codigos" && codes.length > 0) ||
    (scope === "rango" && rangeDesde.trim() !== "" && rangeHasta.trim() !== "");

  const galenosElegidos = incluirGalenos ? galenosSel : [];
  const algoQueAumentar = incluirFijos || galenosElegidos.length > 0;

  const payload: ActualizarPorcentajePayload | null =
    osNro != null &&
    vigencia &&
    pctNum !== null &&
    pctNum !== 0 &&
    algoQueAumentar &&
    (!incluirFijos || scopeValid)
      ? {
          obra_social_nro: osNro,
          origen,
          porcentaje: pctNum,
          vigencia_desde: vigencia,
          incluir_valores_fijos: incluirFijos,
          galeno_codigos: galenosElegidos.length ? galenosElegidos : null,
          filtro_codigos: incluirFijos && scope === "codigos" ? codes : null,
          filtro_rango:
            incluirFijos && scope === "rango"
              ? { desde: rangeDesde.trim(), hasta: rangeHasta.trim() }
              : null,
        }
      : null;

  const payloadKey = payload ? JSON.stringify(payload) : "";
  // Vista previa vigente solo si se hizo con exactamente estos parámetros.
  const previewVigente =
    preview && preview.key === payloadKey ? preview.res : null;
  const hayParaAplicar =
    !!previewVigente &&
    previewVigente.actualizados + previewVigente.galenos_actualizados > 0;

  function addCode() {
    const c = codeInput.trim();
    if (!c || codes.includes(c)) {
      setCodeInput("");
      return;
    }
    setCodes((prev) => [...prev, c]);
    setCodeInput("");
  }

  const previewMutation = useMutation({
    mutationFn: (p: ActualizarPorcentajePayload) =>
      actualizarPorcentajeValores({ ...p, dry_run: true }),
    onMutate: () => {
      setError(null);
      setResult(null);
      setConfirming(false);
    },
    onSuccess: (res, p) => setPreview({ key: JSON.stringify(p), res }),
    onError: (e) =>
      setError(mensajeDeError(e, "No se pudo calcular la vista previa.")),
  });

  const applyMutation = useMutation({
    mutationFn: (p: ActualizarPorcentajePayload) =>
      actualizarPorcentajeValores({ ...p, dry_run: false }),
    onSuccess: (res) => {
      setResult(res);
      setConfirming(false);
      setPreview(null);
      void galenosQuery.refetch();
    },
    onError: (e) => {
      setConfirming(false);
      setError(mensajeDeError(e, "No se pudo aplicar la actualización."));
    },
  });

  const revertPreviewMutation = useMutation({
    mutationFn: () =>
      revertirActualizacionValores({
        obra_social_nro: osNro!,
        vigencia_revertir: revertVigencia,
        dry_run: true,
      }),
    onMutate: () => {
      setRevertError(null);
      setRevertResult(null);
      setRevertConfirming(false);
    },
    onSuccess: (res) => setRevertPreview(res),
    onError: (e) =>
      setRevertError(mensajeDeError(e, "No se pudo calcular qué se revierte.")),
  });

  const revertMutation = useMutation({
    mutationFn: () =>
      revertirActualizacionValores({
        obra_social_nro: osNro!,
        vigencia_revertir: revertVigencia,
        dry_run: false,
      }),
    onSuccess: (res) => {
      setRevertResult(res);
      setRevertPreview(null);
      setRevertConfirming(false);
      void galenosQuery.refetch();
    },
    onError: (e) => {
      setRevertConfirming(false);
      setRevertError(mensajeDeError(e, "No se pudo revertir."));
    },
  });

  function resetOS(os: ObraSocialListItem | null) {
    setSelectedOS(os);
    setOsSearch("");
    setOsOpen(false);
    setGalenosSel([]);
    setPreview(null);
    setResult(null);
    setConfirming(false);
    setError(null);
    setRevertPreview(null);
    setRevertResult(null);
    setRevertError(null);
    setRevertConfirming(false);
  }

  const revertHayAlgo =
    !!revertPreview &&
    revertPreview.actualizados + revertPreview.galenos_actualizados > 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <Percent size={20} />
        </span>
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
            <p className={styles.panelDesc}>
              Elegí la obra social cuyos valores vas a actualizar.
            </p>
          </div>
        </div>

        {selectedOS ? (
          <div className={styles.chosen}>
            <span className={styles.chosenNro}>
              {selectedOS.nro_obra_social}
            </span>
            <span className={styles.chosenName}>{selectedOS.nombre}</span>
            <button
              type="button"
              className={styles.chosenClear}
              onClick={() => resetOS(null)}
              title="Cambiar"
            >
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
                onChange={(e) => {
                  setOsSearch(e.target.value);
                  setOsOpen(true);
                }}
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
                    onMouseDown={(e) => {
                      e.preventDefault();
                      resetOS(os);
                    }}
                  >
                    <span className={styles.optionNro}>
                      {os.nro_obra_social}
                    </span>
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
          {/* 2 · Qué aumentar */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepBadge}>2</span>
              <div>
                <h2 className={styles.panelTitle}>Qué aumentar</h2>
                <p className={styles.panelDesc}>
                  Valores de precio fijo, galenos o ambos.
                </p>
              </div>
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={incluirFijos}
                onChange={(e) => setIncluirFijos(e.target.checked)}
              />
              <span>
                <strong>Valores de precio fijo</strong>
                <small className={styles.hint}>
                  Los valores con importe fijo del origen y los códigos que
                  elijas abajo.
                </small>
              </span>
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={incluirGalenos}
                onChange={(e) => setIncluirGalenos(e.target.checked)}
              />
              <span>
                <strong>Galenos</strong>
                <small className={styles.hint}>
                  Aumentar un galeno actualiza todos los valores que se calculan
                  con él (NN y NE por galeno), sin importar el origen ni el
                  alcance de códigos.
                </small>
              </span>
            </label>

            {incluirGalenos && (
              <div className={styles.scopeBody}>
                {galenosQuery.isError ? (
                  <p className={styles.resultErr}>
                    <AlertTriangle size={15} /> No se pudieron cargar los
                    galenos.
                  </p>
                ) : (
                  <MultiSelectBuscable
                    options={galenoOptions}
                    selected={galenosSel}
                    onChange={setGalenosSel}
                    noun="galenos"
                    loading={galenosQuery.isLoading}
                  />
                )}
              </div>
            )}

            {!algoQueAumentar && (
              <p className={styles.hint}>
                Elegí valores fijos, al menos un galeno, o ambos.
              </p>
            )}
          </section>

          {/* 3 · Parámetros */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepBadge}>3</span>
              <div>
                <h2 className={styles.panelTitle}>Parámetros</h2>
                <p className={styles.panelDesc}>
                  Vigencia del nuevo precio y porcentaje.
                </p>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              {incluirFijos && (
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>
                    Origen (valores fijos)
                  </label>
                  <select
                    className={styles.select}
                    value={origen}
                    onChange={(e) => setOrigen(e.target.value as Origen)}
                  >
                    {ORIGENES.map((o) => (
                      <option key={o} value={o}>
                        {o} — {ORIGEN_LABELS[o]}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <CalendarDays size={13} /> Vigencia desde
                </label>
                <input
                  className={styles.dateInput}
                  type="date"
                  value={vigencia}
                  onChange={(e) => setVigencia(e.target.value)}
                />
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

            <p className={styles.hint}>
              La vigencia tiene que ser posterior a la del precio actual: lo que
              ya tenga esa fecha o una posterior se omite, así un aumento
              aplicado dos veces no se acumula.
            </p>

            {pctNum !== null && pctNum !== 0 && (
              <div
                className={`${styles.indicator} ${pctPositive ? styles.indicatorUp : styles.indicatorDown}`}
              >
                {pctPositive ? (
                  <TrendingUp size={15} />
                ) : (
                  <TrendingDown size={15} />
                )}
                <span>
                  Los precios {pctPositive ? "subirán" : "bajarán"} un{" "}
                  {Math.abs(pctNum)}%
                  {vigencia && ` a partir del ${fmtFecha(vigencia)}`}.
                </span>
              </div>
            )}
          </section>

          {/* 4 · Alcance (solo valores fijos) */}
          {incluirFijos && (
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <span className={styles.stepBadge}>4</span>
                <div>
                  <h2 className={styles.panelTitle}>
                    Alcance de valores fijos
                  </h2>
                  <p className={styles.panelDesc}>
                    A qué códigos se aplica el porcentaje. No afecta a los
                    galenos.
                  </p>
                </div>
              </div>

              <div className={styles.scopeTabs}>
                {(
                  [
                    { key: "todos", label: "Todos los códigos" },
                    { key: "codigos", label: "Por códigos" },
                    { key: "rango", label: "Por rango" },
                  ] as { key: Scope; label: string }[]
                ).map(({ key, label }) => (
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
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCode();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={addCode}
                      disabled={!codeInput.trim()}
                    >
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
                            onClick={() =>
                              setCodes((prev) => prev.filter((x) => x !== c))
                            }
                            aria-label={`Quitar ${c}`}
                          >
                            <XIcon size={11} />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        className={styles.chipClear}
                        onClick={() => setCodes([])}
                      >
                        Limpiar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {scope === "rango" && (
                <div className={styles.scopeBody}>
                  <div className={styles.rangeRow}>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Código desde</label>
                      <input
                        className={styles.input}
                        placeholder="ej: 420000"
                        value={rangeDesde}
                        onChange={(e) => setRangeDesde(e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>Código hasta</label>
                      <input
                        className={styles.input}
                        placeholder="ej: 429999"
                        value={rangeHasta}
                        onChange={(e) => setRangeHasta(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className={styles.hint}>
                    Incluye ambos extremos. La comparación es numérica.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* 5 · Vista previa + aplicar */}
          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <span className={styles.stepBadge}>{incluirFijos ? 5 : 4}</span>
              <div>
                <h2 className={styles.panelTitle}>Revisar y aplicar</h2>
                <p className={styles.panelDesc}>
                  La vista previa muestra exactamente lo que se va a guardar.
                </p>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={!payload || previewMutation.isPending}
                onClick={() => payload && previewMutation.mutate(payload)}
              >
                {previewMutation.isPending ? (
                  <Loader2 size={15} className={styles.spin} />
                ) : (
                  <Eye size={15} />
                )}
                {previewVigente ? "Actualizar vista previa" : "Vista previa"}
              </button>

              {!confirming ? (
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={!hayParaAplicar || applyMutation.isPending}
                  onClick={() => {
                    setConfirming(true);
                    setResult(null);
                  }}
                  title={
                    !previewVigente
                      ? "Primero generá la vista previa"
                      : undefined
                  }
                >
                  <Percent size={15} /> Aplicar porcentaje
                </button>
              ) : (
                <div className={styles.confirmBar}>
                  <span className={styles.confirmText}>
                    ¿Aplicar {pctPositive ? "+" : ""}
                    {pctNum}% a {selectedOS?.nombre} con vigencia{" "}
                    {fmtFecha(vigencia)}? Se actualizan{" "}
                    {previewVigente?.actualizados ?? 0} valores y{" "}
                    {previewVigente?.galenos_actualizados ?? 0} galenos.
                  </span>
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    disabled={applyMutation.isPending || !payload}
                    onClick={() => payload && applyMutation.mutate(payload)}
                  >
                    {applyMutation.isPending ? (
                      <Loader2 size={15} className={styles.spin} />
                    ) : (
                      <CheckCircle2 size={15} />
                    )}
                    Confirmar
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={applyMutation.isPending}
                    onClick={() => setConfirming(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {preview && !previewVigente && !result && (
              <p className={styles.hint}>
                Cambiaste los parámetros: generá la vista previa de nuevo antes
                de aplicar.
              </p>
            )}

            {error && (
              <div className={styles.resultErr}>
                <AlertTriangle size={15} /> {error}
              </div>
            )}

            {previewVigente && (
              <div className={styles.previewCard}>
                <Resumen r={previewVigente} verbo="a actualizar" />
                {!hayParaAplicar && (
                  <p className={styles.hint}>
                    No hay nada para actualizar con estos parámetros. Revisá los
                    omitidos y su motivo.
                  </p>
                )}
                <DetalleTabla items={previewVigente.detalle} espMap={espMap} />
              </div>
            )}

            {result && (
              <div className={styles.resultBox}>
                <div className={styles.resultOk}>
                  <CheckCircle2 size={16} />
                  Listo: {result.actualizados} valor
                  {result.actualizados !== 1 ? "es" : ""} y{" "}
                  {result.galenos_actualizados} galeno
                  {result.galenos_actualizados !== 1 ? "s" : ""} actualizados
                  {result.omitidos > 0 && (
                    <span className={styles.resultMuted}>
                      {" "}
                      · {result.omitidos} omitido
                      {result.omitidos !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {result.errores.length > 0 && (
                  <div className={styles.resultErr}>
                    <AlertTriangle size={15} /> {result.errores.length} con
                    error
                    <ul className={styles.errorList}>
                      {result.errores.slice(0, 8).map((e, i) => (
                        <li key={i}>
                          {String(e.codigo ?? "")} {String(e.motivo ?? "")}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <DetalleTabla items={result.detalle} espMap={espMap} />
              </div>
            )}
          </section>

          {/* Revertir */}
          <section className={`${styles.panel} ${styles.panelDanger}`}>
            <div className={styles.panelHeader}>
              <span className={`${styles.stepBadge} ${styles.stepBadgeDanger}`}>
                <RotateCcw size={14} />
              </span>
              <div>
                <h2 className={styles.panelTitle}>Revertir un aumento</h2>
                <p className={styles.panelDesc}>
                  Deshace solo lo que abrió un aumento en esa fecha en{" "}
                  {selectedOS?.nombre} (no altas ni ediciones) y los galenos
                  rotados ese día. Lo que quedaría sin precio se omite.
                </p>
              </div>
            </div>

            <div className={styles.fieldsRow}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>
                  <CalendarDays size={13} /> Vigencia a revertir
                </label>
                <input
                  className={styles.dateInput}
                  type="date"
                  value={revertVigencia}
                  onChange={(e) => {
                    setRevertVigencia(e.target.value);
                    setRevertPreview(null);
                    setRevertResult(null);
                    setRevertConfirming(false);
                    setRevertError(null);
                  }}
                />
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btnSecondary}
                disabled={!revertVigencia || revertPreviewMutation.isPending}
                onClick={() => revertPreviewMutation.mutate()}
              >
                {revertPreviewMutation.isPending ? (
                  <Loader2 size={15} className={styles.spin} />
                ) : (
                  <Eye size={15} />
                )}
                Ver qué se revierte
              </button>

              {!revertConfirming ? (
                <button
                  type="button"
                  className={styles.btnDanger}
                  disabled={!revertHayAlgo || revertMutation.isPending}
                  onClick={() => {
                    setRevertConfirming(true);
                    setRevertResult(null);
                  }}
                >
                  <RotateCcw size={15} /> Revertir
                </button>
              ) : (
                <div className={styles.confirmBar}>
                  <span className={styles.confirmText}>
                    ¿Revertir el aumento del {fmtFecha(revertVigencia)} de{" "}
                    {selectedOS?.nombre}? Vuelven a su precio anterior{" "}
                    {revertPreview?.actualizados ?? 0} valores y{" "}
                    {revertPreview?.galenos_actualizados ?? 0} galenos.
                  </span>
                  <button
                    type="button"
                    className={styles.btnDanger}
                    disabled={revertMutation.isPending}
                    onClick={() => revertMutation.mutate()}
                  >
                    {revertMutation.isPending ? (
                      <Loader2 size={15} className={styles.spin} />
                    ) : (
                      <RotateCcw size={15} />
                    )}
                    Sí, revertir
                  </button>
                  <button
                    type="button"
                    className={styles.btnGhost}
                    disabled={revertMutation.isPending}
                    onClick={() => setRevertConfirming(false)}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>

            {revertError && (
              <div className={styles.resultErr}>
                <AlertTriangle size={15} /> {revertError}
              </div>
            )}

            {revertPreview && (
              <div className={styles.previewCard}>
                <Resumen r={revertPreview} verbo="a revertir" />
                {!revertHayAlgo && (
                  <p className={styles.hint}>
                    No hay ningún aumento para revertir con esa vigencia.
                  </p>
                )}
                <DetalleTabla
                  items={revertPreview.detalle}
                  espMap={espMap}
                  labelNuevo="Vuelve a"
                />
              </div>
            )}

            {revertResult && (
              <div className={styles.resultBox}>
                <div className={styles.resultOk}>
                  <CheckCircle2 size={16} />
                  Revertidos: {revertResult.actualizados} valor
                  {revertResult.actualizados !== 1 ? "es" : ""} y{" "}
                  {revertResult.galenos_actualizados} galeno
                  {revertResult.galenos_actualizados !== 1 ? "s" : ""}
                </div>
                {revertResult.errores.length > 0 && (
                  <div className={styles.resultErr}>
                    <AlertTriangle size={15} /> {revertResult.errores.length}{" "}
                    con error
                    <ul className={styles.errorList}>
                      {revertResult.errores.slice(0, 8).map((e, i) => (
                        <li key={i}>
                          {String(e.codigo ?? "")} {String(e.motivo ?? "")}
                        </li>
                      ))}
                    </ul>
                  </div>
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
