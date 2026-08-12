import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileUp,
  Layers,
  Loader2,
  Trash2,
} from "lucide-react";

import { readCsv } from "../../../utils/precios/readCsv";
import { readExcel } from "../../../utils/precios/readExcel";
import type { SheetData } from "../../../utils/precios/types";
// El lector de PDF de `precios` devuelve filas ya interpretadas y descarta los
// niveles; acá se necesita la grilla cruda.
import { readPdfGrid } from "../../../utils/galenos/readPdfGrid";
import { parseGalenos } from "../../../utils/galenos/parseGalenos";
import type { GalenoParseado, ResultadoParse } from "../../../utils/galenos/parseGalenos";
import { importarLoteGalenos } from "../nomenclador.api";
import type {
  GalenoImportarLoteResult,
  GalenoLoteItem,
} from "../nomenclador.types";
import styles from "./ImportarGalenos.module.scss";

const fmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

const ACCEPT = ".xlsx,.xls,.csv,.pdf";

export default function ImportarGalenos() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Qué galenos del archivo se van a importar (todos salvo los destildados).
  const [excluidos, setExcluidos] = useState<Set<number>>(new Set());
  const [abiertos, setAbiertos] = useState<Set<number>>(new Set());

  const [obraSocial, setObraSocial] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [siExiste, setSiExiste] = useState<"omitir" | "rotar">("omitir");

  const [importing, setImporting] = useState(false);
  const [resultado, setResultado] = useState<GalenoImportarLoteResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const parsed: ResultadoParse | null = useMemo(
    () => (sheets[sheetIdx] ? parseGalenos(sheets[sheetIdx]) : null),
    [sheets, sheetIdx]
  );

  // Un bloque con niveles que no es ninguno de los conocidos arranca destildado:
  // se muestra para revisarlo, pero no se importa sin que alguien lo confirme.
  useEffect(() => {
    if (!parsed) return;
    const noReconocidos = parsed.galenos
      .map((g, i) => (g.reconocido ? -1 : i))
      .filter((i) => i >= 0);
    setExcluidos(new Set(noReconocidos));
  }, [parsed]);

  const seleccionados = useMemo(
    () => (parsed?.galenos ?? []).filter((_, i) => !excluidos.has(i)),
    [parsed, excluidos]
  );

  const totalNiveles = seleccionados.reduce(
    (acc, g) => acc + (g.plano ? 1 : g.niveles.length),
    0
  );
  const noReconcilian = seleccionados.reduce(
    (acc, g) => acc + g.niveles.filter((n) => !n.reconcilia).length,
    0
  );

  const limpiar = () => {
    setFileName(null);
    setSheets([]);
    setSheetIdx(0);
    setExcluidos(new Set());
    setAbiertos(new Set());
    setResultado(null);
    setImportError(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onFile = async (file: File) => {
    setParsing(true);
    setError(null);
    setResultado(null);
    setImportError(null);
    setExcluidos(new Set());
    try {
      const ext = file.name.toLowerCase().split(".").pop() ?? "";
      const hojas: SheetData[] =
        ext === "csv"
          ? await readCsv(file)
          : ext === "pdf"
            ? await readPdfGrid(file)
            : await readExcel(file);
      setSheets(hojas);
      setSheetIdx(0);
      setFileName(file.name);
      // Abrimos el primer nivelado para que se vea qué se detectó.
      const r = hojas[0] ? parseGalenos(hojas[0]) : null;
      const idx = r?.galenos.findIndex((g) => !g.plano) ?? -1;
      setAbiertos(idx >= 0 ? new Set([idx]) : new Set());
    } catch (e: any) {
      setError(e?.message ?? "No se pudo leer el archivo.");
      setSheets([]);
      setFileName(null);
    } finally {
      setParsing(false);
    }
  };

  const toggle = (set: Set<number>, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  };

  const puedeImportar =
    seleccionados.length > 0 &&
    obraSocial.trim() !== "" &&
    vigencia.trim() !== "" &&
    !importing;

  const importar = async () => {
    setImporting(true);
    setImportError(null);
    setResultado(null);
    try {
      const r = await importarLoteGalenos({
        obra_social_nro: Number(obraSocial.trim()),
        vigencia_desde: vigencia.trim(),
        si_existe: siExiste,
        observacion: fileName ? `Importado de ${fileName}` : null,
        galenos: seleccionados.map((g): GalenoLoteItem => ({
          nombre: g.nombre,
          // Plano = una sola fila con nivel null; nivelado = una fila por nivel,
          // todas con el mismo valor de unidad y sus propias unidades.
          niveles: g.plano
            ? [{ nivel: null, valor_unitario: g.valorUnitario }]
            : g.niveles.map((n) => ({
                nivel: n.nivel,
                valor_unitario: g.valorUnitario,
                unidades_honorarios: n.unidades,
                unidades_ayudante: n.ayudantes ?? null,
              })),
        })),
      });
      setResultado(r);
    } catch (e: any) {
      setImportError(
        e?.response?.data?.detail ?? e?.message ?? "No se pudo importar el lote."
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link to="/panel/nomenclador/galenos" className={styles.back}>
        <ArrowLeft size={16} /> Volver a Galenos
      </Link>

      <header className={styles.header}>
        <Layers size={32} className={styles.headerIcon} />
        <div>
          <h1 className={styles.title}>Importar galenos</h1>
          <p className={styles.subtitle}>
            Subí la planilla y el sistema detecta solo los galenos planos y los
            nivelados. De los nivelados guarda el valor de la unidad y las unidades
            de cada nivel; el importe de la planilla se usa para verificar la cuenta.
          </p>
        </div>
      </header>

      {/* ── Paso 1: archivo y datos comunes ── */}
      <section className={styles.card}>
        <div className={styles.fileRow}>
          <button
            type="button"
            className={styles.fileBtn}
            onClick={() => inputRef.current?.click()}
            disabled={parsing}
          >
            {parsing ? <Loader2 size={18} className={styles.spin} /> : <FileUp size={18} />}
            {fileName ?? "Elegir planilla (.xlsx, .csv, .pdf)"}
          </button>
          {fileName && (
            <button type="button" className={styles.linkBtn} onClick={limpiar}>
              <Trash2 size={15} /> Quitar
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
        </div>

        {sheets.length > 1 && (
          <div className={styles.field}>
            <label className={styles.label}>Hoja</label>
            <select
              className={styles.input}
              value={sheetIdx}
              onChange={(e) => {
                setSheetIdx(Number(e.target.value));
                setExcluidos(new Set());
              }}
            >
              {sheets.map((s, i) => (
                <option key={s.name} value={i}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.grid}>
          <div className={styles.field}>
            <label className={styles.label}>N.º de obra social</label>
            <input
              type="number"
              inputMode="numeric"
              className={styles.input}
              placeholder="Ej: 411"
              value={obraSocial}
              onChange={(e) => setObraSocial(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Vigencia desde</label>
            <input
              type="date"
              className={styles.input}
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Si el galeno ya existe</label>
            <select
              className={styles.input}
              value={siExiste}
              onChange={(e) => setSiExiste(e.target.value as "omitir" | "rotar")}
            >
              <option value="omitir">Omitirlo (no toca lo cargado)</option>
              <option value="rotar">Rotar precio (cierra el vigente)</option>
            </select>
          </div>
        </div>

        {error && (
          <p className={styles.error}>
            <AlertCircle size={16} /> {error}
          </p>
        )}
      </section>

      {/* ── Paso 2: vista previa ── */}
      {parsed && (
        <section className={styles.card}>
          <div className={styles.previewHead}>
            <h2 className={styles.cardTitle}>
              Detectado: {parsed.galenos.length}{" "}
              {parsed.galenos.length === 1 ? "galeno" : "galenos"}
            </h2>
            <span className={styles.previewMeta}>
              {seleccionados.length} seleccionados · {totalNiveles} filas a crear
            </span>
          </div>

          {parsed.galenos.length === 0 && (
            <p className={styles.empty}>
              No se reconoció ningún galeno en esta hoja. Probá con otra hoja o
              revisá que la planilla tenga los nombres y los importes en la misma fila.
            </p>
          )}

          {noReconcilian > 0 && (
            <p className={styles.warn}>
              <AlertTriangle size={16} />
              {noReconcilian} {noReconcilian === 1 ? "nivel no cierra" : "niveles no cierran"}:
              el importe de la planilla no coincide con unidades × valor de la unidad.
              Podés importarlos igual — se guarda el valor de la unidad, no el importe.
            </p>
          )}

          <ul className={styles.lista}>
            {parsed.galenos.map((g, i) => (
              <GalenoFila
                key={`${g.nombre}-${g.fila}`}
                galeno={g}
                incluido={!excluidos.has(i)}
                abierto={abiertos.has(i)}
                onToggleIncluir={() => setExcluidos((s) => toggle(s, i))}
                onToggleAbrir={() => setAbiertos((s) => toggle(s, i))}
              />
            ))}
          </ul>

          {parsed.avisos.length > 0 && (
            <details className={styles.avisos}>
              <summary>{parsed.avisos.length} aviso(s) de lectura</summary>
              <ul>
                {parsed.avisos.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Las filas descartadas se calculaban pero no se mostraban: si un
              galeno no se reconocía, desaparecía sin dejar rastro y no había
              forma de darse cuenta salvo contando los detectados. */}
          {parsed.descartadas.length > 0 && (
            <details className={styles.avisos}>
              <summary>
                {parsed.descartadas.length} fila(s) con nombre e importe que no
                se tomaron como galeno
              </summary>
              <p className={styles.descartadasNota}>
                Es lo esperable para el nomenclador de prácticas y las notas al
                pie. Si ves acá un galeno que debería importarse, avisá: falta
                contemplar cómo lo escribe esta planilla.
              </p>
              <ul>
                {parsed.descartadas.map((d, i) => (
                  <li key={i}>
                    {d.nombre} — {fmt.format(d.importe)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {/* ── Paso 3: importar ── */}
      {parsed && parsed.galenos.length > 0 && (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Importar</h2>
          <p className={styles.cardSub}>
            Crea los galenos en <strong>nm_galenos</strong> para la obra social{" "}
            {obraSocial || "…"} con vigencia desde {vigencia || "…"}. Los nivelados
            generan una fila por nivel.
          </p>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={importar}
            disabled={!puedeImportar}
          >
            {importing ? (
              <>
                <Loader2 size={17} className={styles.spin} /> Importando…
              </>
            ) : (
              <>
                <CheckCircle2 size={17} /> Importar {seleccionados.length} galeno
                {seleccionados.length !== 1 ? "s" : ""} ({totalNiveles} filas)
              </>
            )}
          </button>

          {importError && (
            <p className={styles.error}>
              <AlertCircle size={16} /> {importError}
            </p>
          )}

          {resultado && (
            <div className={styles.resultado}>
              <div className={styles.resumen}>
                <span className={styles.okChip}>{resultado.creados} creados</span>
                {resultado.rotados > 0 && (
                  <span className={styles.infoChip}>{resultado.rotados} rotados</span>
                )}
                {resultado.omitidos > 0 && (
                  <span className={styles.muteChip}>{resultado.omitidos} omitidos</span>
                )}
                {resultado.errores > 0 && (
                  <span className={styles.errChip}>{resultado.errores} con error</span>
                )}
              </div>
              <ul className={styles.resultadoLista}>
                {resultado.items.map((it) => (
                  <li key={it.codigo} className={styles[`estado_${it.estado}`]}>
                    <strong>{it.nombre}</strong>
                    <span className={styles.resultadoEstado}>{it.estado}</span>
                    {it.detalle && <em>{it.detalle}</em>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

// ─── Fila de la vista previa ──────────────────────────────────────────────────

function GalenoFila({
  galeno,
  incluido,
  abierto,
  onToggleIncluir,
  onToggleAbrir,
}: {
  galeno: GalenoParseado;
  incluido: boolean;
  abierto: boolean;
  onToggleIncluir: () => void;
  onToggleAbrir: () => void;
}) {
  const fallan = galeno.niveles.filter((n) => !n.reconcilia).length;

  return (
    <li className={`${styles.item} ${incluido ? "" : styles.itemOff}`}>
      <div className={styles.itemHead}>
        <input
          type="checkbox"
          checked={incluido}
          onChange={onToggleIncluir}
          aria-label={`Incluir ${galeno.nombre}`}
        />

        {galeno.plano ? (
          <span className={styles.itemSpacer} />
        ) : (
          <button
            type="button"
            className={styles.itemToggle}
            onClick={onToggleAbrir}
            aria-expanded={abierto}
            aria-label={abierto ? "Contraer niveles" : "Ver niveles"}
          >
            {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}

        <span className={styles.itemNombre}>{galeno.nombre}</span>

        <span className={styles.itemTipo}>
          {galeno.plano ? "valor general" : `${galeno.niveles.length} niveles`}
        </span>

        {!galeno.reconocido && (
          <span className={styles.itemDudoso} title="No es uno de los nomencladores conocidos">
            revisar
          </span>
        )}

        <span className={styles.itemValor}>
          {fmt.format(galeno.valorUnitario)}
          {!galeno.plano && <em className={styles.itemUnidad}> / unidad</em>}
        </span>

        {fallan > 0 && (
          <span className={styles.itemWarn} title={`${fallan} nivel(es) no cierran`}>
            <AlertTriangle size={14} /> {fallan}
          </span>
        )}
      </div>

      {!galeno.plano && abierto && (
        <table className={styles.niveles}>
          <thead>
            <tr>
              <th>Nivel</th>
              <th className={styles.num}>Unidades</th>
              <th className={styles.num}>Ayudantes</th>
              <th className={styles.num}>Calculado</th>
              <th className={styles.num}>En la planilla</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {galeno.niveles.map((n) => {
              const calculado = n.unidades * galeno.valorUnitario;
              return (
                <tr key={n.nivel} className={n.reconcilia ? "" : styles.filaMal}>
                  <td>
                    {n.nivel}
                    {n.codigoArchivo && (
                      <span className={styles.codigoArchivo}>{n.codigoArchivo}</span>
                    )}
                  </td>
                  <td className={styles.num}>{n.unidades}</td>
                  <td className={styles.num}>{n.ayudantes ?? "—"}</td>
                  <td className={styles.num}>{fmt.format(calculado)}</td>
                  <td className={styles.num}>
                    {n.importeArchivo != null ? fmt.format(n.importeArchivo) : "—"}
                  </td>
                  <td className={styles.num}>
                    {n.reconcilia ? (
                      <CheckCircle2 size={15} className={styles.okIcon} />
                    ) : (
                      <AlertTriangle size={15} className={styles.warnIcon} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </li>
  );
}
