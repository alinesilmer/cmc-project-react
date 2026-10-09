import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Loader2 } from "lucide-react";

import styles from "./ImportarValoresFijos.module.scss";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import Modal from "../../../components/ui/Modal/Modal";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import ReplicarFamiliaBlock from "../../../components/molecules/ReplicarFamilia/ReplicarFamiliaBlock";
import { destinosReplica, type ReplicaState } from "../../../components/molecules/ReplicarFamilia/replicaState";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import { readExcel } from "@/app/shared/lib/precios/readExcel";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { aplicarValoresFijos, getFamiliaObraSocial, previsualizarValoresFijos } from "../nomenclador.api";
import type {
  AccionFija,
  EstadoFilaFija,
  FilaPreviaOut,
  ImportarFijosAplicarOut,
  ImportarFijosFilaIn,
  ImportarFijosPreviewOut,
} from "../nomenclador.types";

const ENCABEZADO = ["CODIGO", "DESCRIPCION", "VALOR"];
const PAGE_SIZE = 50;

const ESTADOS: { id: EstadoFilaFija; label: string; tono: "info" | "ok" | "warn" | "bad" }[] = [
  { id: "rotar", label: "Precio vigente", tono: "info" },
  { id: "nuevo", label: "Sin precio NE", tono: "ok" },
  { id: "sin_alta", label: "Sin alta en la OS", tono: "warn" },
  { id: "sin_quien_factura", label: "Sin quién factura", tono: "warn" },
  { id: "sin_catalogo", label: "No existe en catálogo", tono: "warn" },
  { id: "duplicado", label: "Repetido", tono: "warn" },
  { id: "misma_vigencia", label: "Misma vigencia", tono: "info" },
  { id: "vigente_posterior", label: "Vigencia posterior", tono: "bad" },
  { id: "suspendido", label: "Suspendido", tono: "bad" },
  { id: "error", label: "Error", tono: "bad" },
];
const ESTADO = Object.fromEntries(ESTADOS.map((e) => [e.id, e])) as Record<EstadoFilaFija, (typeof ESTADOS)[number]>;

const ACCION_LABEL: Record<AccionFija, string> = {
  rotar: "Rotar precio",
  cargar: "Cargar",
  sobrescribir: "Sobrescribir esa vigencia",
  reemplazar: "Reemplazar (borra las posteriores)",
  alta_y_cargar: "Dar de alta y cargar",
  reactivar_y_cargar: "Reactivar y cargar",
  crear_y_cargar: "Crear en catálogo, dar de alta y cargar",
  omitir: "No cargar",
};
const ACCION_EN_REPLICA: Partial<Record<AccionFija, string>> = {
  alta_y_cargar: "se da de alta",
  rotar: "rota",
  cargar: "se carga",
  sobrescribir: "sobrescribe",
  reemplazar: "reemplaza posteriores",
};
const CATEGORIAS = ["Practica", "Consulta", "Honorarios individuales"];

const money = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 });
const fmt = (v: string | null) => (v == null ? "—" : money.format(Number(v)));
const fechaCorta = (iso: string) => iso.split("-").reverse().join("/");

type Decision = { accion: AccionFija | ""; especialidades: number[]; sinRestriccion: boolean; categoria: string };

/** Mayúsculas, sin tildes ni espacios sobrantes (mismo criterio que el backend). */
function norm(v: unknown): string {
  return String(v ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().trim().replace(/\s+/g, " ");
}

/** Lee la primera hoja y exige CODIGO | DESCRIPCION | VALOR en la fila 1. */
async function leerArchivo(file: File): Promise<{ encabezado: (string | null)[]; filas: ImportarFijosFilaIn[] }> {
  const [hoja] = await readExcel(file);
  const grid = hoja?.grid ?? [];
  const encabezado = (grid[0] ?? []).map((c) => (c == null ? null : String(c)));
  const recibido = encabezado.map(norm);
  while (recibido.length && !recibido[recibido.length - 1]) recibido.pop();
  if (recibido.join("|") !== ENCABEZADO.join("|")) {
    throw new Error(
      `El archivo no tiene el formato esperado. La primera fila tiene que ser ${ENCABEZADO.join(" | ")} ` +
        `y tiene: ${recibido.join(" | ") || "(vacía)"}.`,
    );
  }
  const filas: ImportarFijosFilaIn[] = [];
  grid.slice(1).forEach((r, i) => {
    const [codigo, descripcion, valor] = r ?? [];
    if ([codigo, descripcion, valor].every((c) => c == null || String(c).trim() === "")) return;
    filas.push({
      fila: i + 2,
      codigo: codigo == null ? null : String(codigo).trim(),
      descripcion: descripcion == null ? null : String(descripcion),
      valor: typeof valor === "number" ? valor : valor == null ? null : String(valor),
    });
  });
  if (!filas.length) throw new Error("El archivo no tiene filas debajo del encabezado.");
  return { encabezado, filas };
}

function decisionInicial(f: FilaPreviaOut): Decision {
  return {
    accion: f.accion_sugerida ?? "",
    especialidades: f.requiere_quien_factura ? f.especialidades : [],
    sinRestriccion: false,
    categoria: "Practica",
  };
}

function pendiente(f: FilaPreviaOut, d: Decision): boolean {
  if (!d.accion) return true;
  return d.accion !== "omitir" && f.requiere_quien_factura && !d.sinRestriccion && d.especialidades.length === 0;
}

function PrecioActual({ f }: { f: FilaPreviaOut }) {
  if (f.estado === "error" || f.estado === "sin_catalogo") return <span className={styles.muted}>—</span>;
  const vs = f.variantes;
  const conPrecio = vs.filter((v) => v.precio_actual != null);
  const quien = f.sin_restriccion
    ? "Sin restricción"
    : vs.length === 1
      ? vs[0].especialidad ?? "1 especialidad"
      : vs.length
        ? `${vs.length} especialidades`
        : "Nadie habilitado";
  const precios = [...new Set(conPrecio.map((v) => v.precio_actual))];
  const pct = conPrecio[0]?.variacion_pct ?? null;
  return (
    <div className={styles.actual}>
      {conPrecio.length === 0 ? (
        <span className={styles.muted}>Sin precio</span>
      ) : (
        <span>
          {precios.length === 1 ? fmt(precios[0]) : `${precios.length} precios distintos`}
          {precios.length === 1 && pct != null && (
            <span className={pct > 0 ? styles.up : pct < 0 ? styles.down : styles.muted}>
              {" "}
              {pct > 0 ? "+" : ""}
              {pct.toLocaleString("es-AR")} %
            </span>
          )}
        </span>
      )}
      <span className={styles.quien} title={vs.map((v) => v.especialidad).filter(Boolean).join(", ")}>
        {quien}
      </span>
    </div>
  );
}

/**
 * Importar valores fijos NE de una obra social desde un Excel CODIGO | DESCRIPCION | VALOR.
 * Primero se previsualiza (el backend dice qué pasa con cada código y qué se puede hacer),
 * el usuario decide fila por fila y recién al confirmar se guarda. Si la OS tiene otras
 * de su familia (planes de la misma empresa), se ofrece cargar lo mismo en ellas.
 */
export default function ImportarValoresFijos() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [os, setOs] = useState<number | null>(null);
  const [vigencia, setVigencia] = useState("");
  const [archivo, setArchivo] = useState<{ nombre: string; encabezado: (string | null)[]; filas: ImportarFijosFilaIn[] } | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);

  const [previa, setPrevia] = useState<ImportarFijosPreviewOut | null>(null);
  const [decisiones, setDecisiones] = useState<Map<number, Decision>>(new Map());
  const [previsualizando, setPrevisualizando] = useState(false);
  const [errorPrevia, setErrorPrevia] = useState<string | null>(null);

  const [filtro, setFiltro] = useState<EstadoFilaFija | null>(null);
  const [masiva, setMasiva] = useState<AccionFija | "">("");
  const [page, setPage] = useState(1);

  const [replica, setReplica] = useState<ReplicaState>({ activo: true, destinos: [] });
  const [confirmando, setConfirmando] = useState(false);
  const [aplicando, setAplicando] = useState(false);
  const [errorAplicar, setErrorAplicar] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ImportarFijosAplicarOut | null>(null);

  const osQuery = useObrasSociales();
  const osOptions = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ id: o.nro_obra_social, label: `${o.nro_obra_social} · ${o.nombre}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
    [osQuery.data],
  );
  const osNombre = osOptions.find((o) => o.id === os)?.label ?? "";

  const { data: familia = [] } = useQuery({
    queryKey: ["familia-os", os],
    queryFn: () => getFamiliaObraSocial(os as number),
    enabled: os != null,
    staleTime: 5 * 60 * 1000,
  });
  const nombreOS = useMemo(() => new Map(familia.map((f) => [f.nro_obra_social, f.nombre])), [familia]);
  // Replicar en la familia: marcado por defecto, con todas sus obras sociales.
  useEffect(() => {
    setReplica({ activo: familia.length > 0, destinos: familia.map((f) => f.nro_obra_social) });
  }, [familia]);
  const destinos = destinosReplica(replica);

  const espQuery = useQuery({ queryKey: ["especialidades"], queryFn: getEspecialidades, staleTime: 10 * 60 * 1000 });
  const espOptions = useMemo(
    () =>
      (espQuery.data ?? [])
        .map((e) => ({ value: e.id_colegio_espe, label: e.nombre, hint: String(e.id_colegio_espe) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [espQuery.data],
  );

  // Cambiar OS, vigencia o archivo invalida la vista previa y las decisiones.
  useEffect(() => {
    setPrevia(null);
    setDecisiones(new Map());
    setResultado(null);
    setErrorPrevia(null);
    setErrorAplicar(null);
    setFiltro(null);
    setPage(1);
  }, [os, vigencia, archivo]);
  useEffect(() => setPage(1), [filtro]);

  async function elegirArchivo(file: File | undefined) {
    if (!file) return;
    setLeyendo(true);
    setErrorArchivo(null);
    try {
      setArchivo({ nombre: file.name, ...(await leerArchivo(file)) });
    } catch (e) {
      setArchivo(null);
      setErrorArchivo(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function previsualizar() {
    if (os == null || !vigencia || !archivo) return;
    setPrevisualizando(true);
    setErrorPrevia(null);
    setResultado(null);
    setErrorAplicar(null);
    try {
      const r = await previsualizarValoresFijos({
        obra_social_nro: os,
        vigencia_desde: vigencia,
        encabezado: archivo.encabezado,
        filas: archivo.filas,
      });
      setPrevia(r);
      setDecisiones(new Map(r.filas.map((f) => [f.fila, decisionInicial(f)])));
    } catch (e) {
      setPrevia(null);
      setErrorPrevia(mensajeDeError(e, "No se pudo previsualizar el archivo."));
    } finally {
      setPrevisualizando(false);
    }
  }

  const filas = useMemo(() => previa?.filas ?? [], [previa]);
  const visibles = useMemo(() => filas.filter((f) => !filtro || f.estado === filtro), [filas, filtro]);
  const totalPages = Math.max(1, Math.ceil(visibles.length / PAGE_SIZE));
  const pagina = visibles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const accionesMasivas = useMemo(
    () => [...new Set(visibles.filter((f) => f.estado !== "duplicado").flatMap((f) => f.acciones))],
    [visibles],
  );
  useEffect(() => setMasiva(accionesMasivas[0] ?? ""), [accionesMasivas]);

  function decidir(fila: number, cambio: Partial<Decision>) {
    setDecisiones((prev) => {
      const next = new Map(prev);
      const actual = next.get(fila)!;
      next.set(fila, { ...actual, ...cambio });
      // Repetidas: a lo sumo una se carga; elegir una deja las otras en "No cargar".
      const f = filas.find((x) => x.fila === fila);
      if (f?.estado === "duplicado" && cambio.accion && cambio.accion !== "omitir") {
        filas
          .filter((o) => o.codigo === f.codigo && o.fila !== fila)
          .forEach((o) => next.set(o.fila, { ...next.get(o.fila)!, accion: "omitir" }));
      }
      return next;
    });
  }

  function aplicarMasiva() {
    if (!masiva) return;
    setDecisiones((prev) => {
      const next = new Map(prev);
      visibles
        .filter((f) => f.estado !== "duplicado" && f.acciones.includes(masiva))
        .forEach((f) => next.set(f.fila, { ...next.get(f.fila)!, accion: masiva }));
      return next;
    });
  }

  const cuentas = useMemo(() => {
    const c = { pendientes: 0, cargar: 0, conPrevio: 0, altas: 0, nuevos: 0, omitidas: 0, reemplazos: 0 };
    const porDestino = new Map<number, { carga: number; noCarga: number }>(destinos.map((d) => [d, { carga: 0, noCarga: 0 }]));
    for (const f of filas) {
      const d = decisiones.get(f.fila);
      if (!d || pendiente(f, d)) { c.pendientes++; continue; }
      if (d.accion === "omitir") { c.omitidas++; continue; }
      c.cargar++;
      if (["rotar", "sobrescribir", "reemplazar"].includes(d.accion)) c.conPrevio++;
      if (d.accion === "reemplazar") c.reemplazos++;
      if (["alta_y_cargar", "reactivar_y_cargar", "crear_y_cargar"].includes(d.accion)) c.altas++;
      if (d.accion === "crear_y_cargar") c.nuevos++;
      for (const r of f.replicas) {
        const t = porDestino.get(r.obra_social_nro);
        if (!t) continue;
        if (r.accion) t.carga++;
        else t.noCarga++;
      }
    }
    return { ...c, porDestino };
  }, [filas, decisiones, destinos]);

  async function confirmar() {
    if (!previa || !archivo || os == null) return;
    setAplicando(true);
    setErrorAplicar(null);
    try {
      const r = await aplicarValoresFijos({
        obra_social_nro: os,
        vigencia_desde: vigencia,
        encabezado: archivo.encabezado,
        filas: archivo.filas,
        replicar_en: destinos,
        decisiones: filas.map((f) => {
          const d = decisiones.get(f.fila)!;
          return {
            fila: f.fila,
            estado_visto: f.estado,
            accion: d.accion as AccionFija,
            especialidades: d.sinRestriccion ? null : d.especialidades,
            sin_restriccion: d.sinRestriccion || null,
            categoria: f.estado === "sin_catalogo" ? d.categoria : null,
          };
        }),
      });
      setResultado(r);
      setPrevia(null);
      setConfirmando(false);
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const detail = (e as { response?: { data?: { detail?: { mensaje?: string; errores?: string[] } } } })?.response?.data?.detail;
      setErrorAplicar(
        detail && typeof detail === "object" && detail.errores
          ? `${detail.mensaje ?? "No se pudo cargar"}: ${detail.errores.slice(0, 5).join(" · ")}`
          : status === 409
            ? `${mensajeDeError(e)} Tocá «Previsualizar» otra vez.`
            : mensajeDeError(e, "No se pudo cargar. No se guardó nada."),
      );
      setConfirmando(false);
    } finally {
      setAplicando(false);
    }
  }

  const puedePrevisualizar = os != null && !!vigencia && !!archivo && !previsualizando && !leyendo;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span className={styles.headerIcon}><FileSpreadsheet size={22} /></span>
        <div>
          <h1 className={styles.title}>Importar valores fijos</h1>
          <p className={styles.subtitle}>
            Carga precios NE fijos de una obra social desde un Excel. Primero revisás qué pasa con cada código y
            decidís qué hacer; recién al confirmar se guarda.
          </p>
        </div>
      </header>

      <section className={styles.panel} aria-label="Archivo a importar">
        <div className={styles.carga}>
          <div className={styles.campo}>
            <label className={styles.label}>Obra social</label>
            <AppSearchSelect
              options={osOptions}
              value={os}
              loading={osQuery.isLoading}
              disabled={osQuery.isLoading || aplicando}
              onChange={(v) => setOs(v == null ? null : Number(v))}
            />
          </div>
          <div className={styles.campo}>
            <label className={styles.label} htmlFor="ivf-vig">Vigencia desde</label>
            <input id="ivf-vig" type="date" className={styles.input} value={vigencia} onChange={(e) => setVigencia(e.target.value)} disabled={aplicando} />
          </div>
          <div className={styles.campo}>
            <span className={styles.label}>Archivo (.xlsx)</span>
            <button type="button" className={styles.archivo} onClick={() => inputRef.current?.click()} disabled={leyendo || aplicando}>
              {leyendo ? <Loader2 size={16} className={styles.spin} /> : <FileUp size={16} />}
              {archivo ? (
                <>
                  <b>{archivo.nombre}</b>
                  <span>{archivo.filas.length} filas</span>
                </>
              ) : (
                <span>Elegir archivo…</span>
              )}
            </button>
            <input ref={inputRef} type="file" accept=".xlsx,.xls" hidden onChange={(e) => elegirArchivo(e.target.files?.[0])} />
          </div>
          <button type="button" className={styles.btnPrimary} onClick={previsualizar} disabled={!puedePrevisualizar}>
            {previsualizando && <Loader2 size={15} className={styles.spin} />}
            Previsualizar
          </button>
        </div>
        <p className={styles.formato}>
          Formato exigido, primera hoja, fila 1 (sin importar mayúsculas):
          {ENCABEZADO.map((c) => <span key={c} className={styles.col}>{c}</span>)}
          · VALOR acepta 37965, "$ 1.234.567" o PRESUPUESTO. Todo se carga como NE fijo, en Honorarios.
        </p>
        <ReplicarFamiliaBlock
          familia={familia}
          value={replica}
          onChange={setReplica}
          disabled={aplicando}
          descripcion="Se carga lo mismo en los planes elegidos. Lo que ahí tenga una vigencia igual o posterior, o esté suspendido, no se toca."
        />
        {errorArchivo && <p className={styles.error} role="alert"><AlertCircle size={15} /> {errorArchivo}</p>}
        {errorPrevia && <p className={styles.error} role="alert"><AlertCircle size={15} /> {errorPrevia}</p>}
      </section>

      {resultado && (
        <section className={`${styles.panel} ${styles.panelOk}`} role="status">
          <h2 className={styles.okTitle}><CheckCircle2 size={18} /> Precios cargados en {osNombre}</h2>
          <ul className={styles.okList}>
            <li><b>{resultado.filas_cargadas}</b> códigos ({resultado.precios_creados} precios por especialidad)</li>
            <li><b>{resultado.filas_rotadas}</b> reemplazan un precio anterior{resultado.vigencias_borradas ? ` (${resultado.vigencias_borradas} vigencias borradas)` : ""}</li>
            <li><b>{resultado.altas}</b> altas en la obra social{resultado.codigos_creados ? `, ${resultado.codigos_creados} códigos nuevos en el catálogo` : ""}</li>
            <li><b>{resultado.omitidas}</b> filas no se cargaron</li>
          </ul>
          {resultado.replicas.map((r) => (
            <div key={r.obra_social_nro} className={r.estado === "ok" ? styles.replicaOk : styles.replicaError}>
              <b>{r.obra_social_nro} · {r.nombre}:</b>{" "}
              {r.estado === "ok"
                ? `${r.filas_cargadas} códigos cargados (${r.altas} altas)`
                : `no se cargó nada. ${r.motivo ?? ""}`}
              {r.omitidas.length > 0 && (
                <details>
                  <summary>{r.omitidas.length} no se replicaron</summary>
                  <ul>
                    {r.omitidas.map((o) => <li key={o.fila}>Fila {o.fila} · {o.codigo}: {o.motivo}</li>)}
                  </ul>
                </details>
              )}
            </div>
          ))}
        </section>
      )}

      {previa && (
        <>
          <div className={styles.resumen} role="group" aria-label="Filtrar por estado">
            <button type="button" className={styles.chip} aria-pressed={filtro === null} onClick={() => setFiltro(null)}>
              Todas <span>{previa.total}</span>
            </button>
            {ESTADOS.filter((e) => previa.por_estado[e.id]).map((e) => (
              <button
                key={e.id}
                type="button"
                className={`${styles.chip} ${styles[`tono_${e.tono}`]}`}
                aria-pressed={filtro === e.id}
                onClick={() => setFiltro(e.id)}
              >
                {e.label} <span>{previa.por_estado[e.id]}</span>
              </button>
            ))}
          </div>

          <section className={styles.tablaPanel}>
            <div className={styles.barra}>
              <span className={styles.muted}>{visibles.length} fila{visibles.length === 1 ? "" : "s"} en esta vista</span>
              <span className={styles.grow} />
              {accionesMasivas.length > 1 && (
                <>
                  <label htmlFor="ivf-masiva" className={styles.muted}>Para todas las filtradas:</label>
                  <select id="ivf-masiva" className={styles.select} value={masiva} onChange={(e) => setMasiva(e.target.value as AccionFija)}>
                    {accionesMasivas.map((a) => <option key={a} value={a}>{ACCION_LABEL[a]}</option>)}
                  </select>
                  <button type="button" className={styles.btnSecondary} onClick={aplicarMasiva}>Aplicar</button>
                </>
              )}
            </div>
            <div className={styles.tablaWrap}>
              <table className={styles.tabla}>
                <thead>
                  <tr>
                    <th>Fila</th>
                    <th>Código</th>
                    <th>Descripción</th>
                    <th className={styles.r}>Valor nuevo</th>
                    <th>Precio NE actual</th>
                    <th>Estado</th>
                    <th>Qué hacer</th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.map((f) => {
                    const d = decisiones.get(f.fila) ?? decisionInicial(f);
                    const estado = ESTADO[f.estado];
                    const carga = d.accion && d.accion !== "omitir";
                    const cls = pendiente(f, d) ? styles.pend : d.accion === "omitir" ? styles.omit : "";
                    const replicas = carga ? f.replicas.filter((r) => destinos.includes(r.obra_social_nro)) : [];
                    return (
                      <tr key={f.fila} className={cls}>
                        <td className={styles.fila}>{f.fila}</td>
                        <td className={styles.cod}>{f.codigo || "—"}</td>
                        <td className={styles.desc}>
                          {f.descripcion_excel ?? <em className={styles.muted}>(sin descripción)</em>}
                          {f.descripcion_os && f.descripcion_os !== f.descripcion_excel && (
                            <span className={styles.sub}>En la OS: {f.descripcion_os}</span>
                          )}
                        </td>
                        <td className={`${styles.r} ${styles.monto}`}>
                          {f.por_presupuesto ? <span className={styles.presu}>PRESUPUESTO</span> : fmt(f.valor)}
                        </td>
                        <td><PrecioActual f={f} /></td>
                        <td>
                          <span className={`${styles.pill} ${styles[`tono_${estado.tono}`]}`}>{estado.label}</span>
                          {f.motivo && <span className={styles.sub}>{f.motivo}</span>}
                          {f.avisos.map((a) => <span key={a} className={styles.aviso}>{a}</span>)}
                        </td>
                        <td className={styles.acc}>
                          <select
                            className={styles.select}
                            aria-label={`Qué hacer con la fila ${f.fila}`}
                            value={d.accion}
                            disabled={f.acciones.length < 2}
                            onChange={(e) => decidir(f.fila, { accion: e.target.value as AccionFija })}
                          >
                            {!d.accion && <option value="">Elegí qué hacer…</option>}
                            {f.acciones.map((a) => <option key={a} value={a}>{ACCION_LABEL[a]}</option>)}
                          </select>
                          {carga && f.requiere_quien_factura && (
                            <div className={styles.extra}>
                              <span className={styles.label}>¿Quién lo factura?</span>
                              <label className={styles.check}>
                                <input
                                  type="checkbox"
                                  checked={d.sinRestriccion}
                                  onChange={(e) => decidir(f.fila, { sinRestriccion: e.target.checked })}
                                />
                                Sin restricción (cualquier médico)
                              </label>
                              {!d.sinRestriccion && (
                                <MultiSelectBuscable
                                  options={espOptions}
                                  selected={d.especialidades}
                                  onChange={(v) => decidir(f.fila, { especialidades: v })}
                                  noun="especialidades"
                                  loading={espQuery.isLoading}
                                />
                              )}
                              {f.estado === "sin_catalogo" && (
                                <>
                                  <label className={styles.label} htmlFor={`ivf-cat-${f.fila}`}>Categoría del código nuevo</label>
                                  <select
                                    id={`ivf-cat-${f.fila}`}
                                    className={styles.select}
                                    value={d.categoria}
                                    onChange={(e) => decidir(f.fila, { categoria: e.target.value })}
                                  >
                                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c === "Practica" ? "Práctica" : c}</option>)}
                                  </select>
                                </>
                              )}
                            </div>
                          )}
                          {replicas.length > 0 && (
                            <ul className={styles.replicas}>
                              {replicas.map((r) => (
                                <li key={r.obra_social_nro} className={r.accion ? "" : styles.replicaNo}>
                                  {r.obra_social_nro}: {r.accion ? ACCION_EN_REPLICA[r.accion] ?? ACCION_LABEL[r.accion] : `no se replica (${r.motivo})`}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className={styles.paginacion} role="navigation" aria-label="Paginación">
                <button type="button" className={styles.btnSecondary} disabled={page === 1} onClick={() => setPage((p) => p - 1)}>‹ Anterior</button>
                <span className={styles.muted}>Página {page} de {totalPages}</span>
                <button type="button" className={styles.btnSecondary} disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Siguiente ›</button>
              </div>
            )}
          </section>

          <div className={styles.pie}>
            <span className={styles.grow}>
              {cuentas.pendientes > 0 ? (
                <><b>{cuentas.pendientes} fila{cuentas.pendientes === 1 ? "" : "s"} sin decidir</b> · elegí qué hacer en las resaltadas para poder confirmar.</>
              ) : (
                <><b>{cuentas.cargar}</b> a cargar ({cuentas.conPrevio} con precio anterior) · <b>{cuentas.altas}</b> altas · <b>{cuentas.omitidas}</b> no se cargan</>
              )}
            </span>
            {errorAplicar && <span className={styles.error} role="alert"><AlertCircle size={15} /> {errorAplicar}</span>}
            <button
              type="button"
              className={styles.btnPrimary}
              disabled={cuentas.pendientes > 0 || cuentas.cargar === 0 || aplicando}
              onClick={() => setConfirmando(true)}
            >
              Confirmar y cargar
            </button>
          </div>
        </>
      )}

      <Modal isOpen={confirmando} onClose={() => !aplicando && setConfirmando(false)} title="Confirmar la carga" size="small">
        <p className={styles.muted}>
          {osNombre} · vigencia desde {vigencia && fechaCorta(vigencia)}. En esta obra social se carga todo o nada: si
          una fila falla, no se guarda ninguna.
        </p>
        <ul className={styles.confirmList}>
          <li><span>Precios nuevos (sin precio anterior)</span><b>{cuentas.cargar - cuentas.conPrevio}</b></li>
          <li><span>Precios que reemplazan uno anterior</span><b>{cuentas.conPrevio}</b></li>
          <li><span>Códigos que se dan de alta en la OS</span><b>{cuentas.altas}</b></li>
          <li><span>Códigos que se crean en el catálogo</span><b>{cuentas.nuevos}</b></li>
          <li><span>Filas que no se cargan</span><b>{cuentas.omitidas}</b></li>
          {[...cuentas.porDestino].map(([nro, t]) => (
            <li key={nro}>
              <span>También en {nro} · {nombreOS.get(nro)}</span>
              <b>{t.carga}{t.noCarga ? ` (${t.noCarga} no)` : ""}</b>
            </li>
          ))}
        </ul>
        {cuentas.reemplazos > 0 && (
          <p className={styles.warnBox}>
            {cuentas.reemplazos} código{cuentas.reemplazos === 1 ? " tiene" : "s tienen"} vigencias posteriores al{" "}
            {fechaCorta(vigencia)} que se van a borrar.
          </p>
        )}
        <div className={styles.modalAcciones}>
          <button type="button" className={styles.btnSecondary} onClick={() => setConfirmando(false)} disabled={aplicando}>Volver</button>
          <button type="button" className={styles.btnPrimary} onClick={confirmar} disabled={aplicando}>
            {aplicando && <Loader2 size={15} className={styles.spin} />}
            Cargar precios
          </button>
        </div>
      </Modal>
    </div>
  );
}
