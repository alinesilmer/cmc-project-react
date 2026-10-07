import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ListOrdered, Save } from "lucide-react";

import base from "../NomencladorCodigos/NomencladorCodigos.module.scss";
import styles from "./NomencladorCodigoForm.module.scss";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import EstadoCodigoPill from "../components/EstadoCodigoPill";
import { usePermisos } from "../../../auth/usePermisos";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import {
  aplicarEspecialidades,
  cambiarEstadoCodigoOS,
  createNomenclador,
  getFichaCodigo,
  getNomencladorById,
  guardarPlantillaEspecialidades,
  listValores,
  propagarPlantillaEspecialidades,
  updateNomenclador,
} from "../nomenclador.api";
import type {
  AplicarAltaItem,
  Complejidad,
  EstadoCodigoOS,
  FichaCodigoOut,
  PropagarEspecialidadesResult,
  PropagarModo,
  ValorOut,
} from "../nomenclador.types";

const LISTADO_PATH = "/panel/nomenclador/codigos";
const CODIGOS_OS_PATH = "/panel/nomenclador/codigos-por-os";
const PRECIOS_PATH = "/panel/nomenclador/precios/por-obra-social";

type Toast = { type: "success" | "error"; msg: string };
type Tab = "obras" | "datos" | "especialidades" | "boletin";
const TABS: { id: Tab; label: string }[] = [
  { id: "obras", label: "Obras sociales" },
  { id: "datos", label: "1 · Datos del código" },
  { id: "especialidades", label: "2 · Quién factura" },
  { id: "boletin", label: "Boletín" },
];

const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

function detalleError(e: unknown, fallback: string): string {
  const d = (e as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof d === "string" ? d : fallback;
}

function fechaAR(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

function montoDe(v: ValorOut, concepto: string): number {
  return v.componentes
    .filter((c) => c.concepto === concepto && c.activo)
    .reduce((acc, c) => acc + (parseFloat(c.subtotal) || 0), 0);
}

/**
 * Página de un código del Colegio.
 *
 * Nuevo (`/codigos/nuevo`): solo la etapa 1 (datos de la práctica). Al crearlo se
 * pasa a su ficha, que ofrece seguir con las otras etapas sin obligar a ninguna.
 *
 * Existente (`/codigos/:id/editar`): la Ficha del código, con pestañas —
 * Obras sociales (estado en cada O.S. y alta en bloque), Datos (etapa 1), Quién
 * factura (etapa 2) y Boletín. La pestaña va en `?tab=` para poder enlazarla.
 */
export default function NomencladorCodigoForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const nomId = id ? Number(id) : null;
  const tab = (params.get("tab") as Tab) || "obras";
  const recienCreado = params.get("nuevo") === "1";

  const [toast, setToast] = useState<Toast | null>(null);
  const showToast = useCallback((type: Toast["type"], msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const espQuery = useQuery({ queryKey: ["especialidades"], queryFn: getEspecialidades, staleTime: 10 * 60 * 1000 });
  const osQuery = useObrasSociales();
  const espOptions = useMemo(
    () =>
      (espQuery.data ?? [])
        .map((e) => ({ value: e.id_colegio_espe, label: e.nombre, hint: String(e.id_colegio_espe) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [espQuery.data],
  );
  const osOptions = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ value: o.nro_obra_social, label: o.nombre, hint: String(o.nro_obra_social) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [osQuery.data],
  );
  const espNombre = useMemo(() => new Map(espOptions.map((o) => [o.value, o.label])), [espOptions]);

  const fichaQuery = useQuery({
    queryKey: ["ficha-codigo", nomId],
    queryFn: () => getFichaCodigo(nomId as number),
    enabled: nomId !== null,
  });
  const ficha = fichaQuery.data;

  function irATab(t: Tab) {
    const next = new URLSearchParams(params);
    next.set("tab", t);
    next.delete("nuevo");
    setParams(next, { replace: true });
  }

  return (
    <div className={base.container}>
      <button type="button" className={styles.backBtn} onClick={() => navigate(LISTADO_PATH)}>
        <ArrowLeft size={14} /> Volver a Gestión de Códigos
      </button>

      <div className={base.header}>
        <div className={base.headerLeft}>
          <span className={base.headerIcon}><ListOrdered size={20} /></span>
          <div>
            <h1 className={base.title}>
              {nomId === null ? "Nuevo código" : ficha ? `${ficha.codigo} · ${ficha.descripcion ?? "Sin descripción"}` : "Código"}
            </h1>
            <p className={base.subtitle}>
              {nomId === null
                ? "Etapa 1: los datos de la práctica. Las obras sociales, quién lo factura y los precios se cargan después."
                : ficha
                  ? [ficha.categoria, ficha.complejidad && `Complejidad ${ficha.complejidad}`].filter(Boolean).join(" · ") || "Catálogo del Colegio"
                  : "Catálogo del Colegio"}
            </p>
          </div>
        </div>
      </div>

      {nomId === null ? (
        <DatosCodigo
          nomId={null}
          onGuardado={(nid) => navigate(`/panel/nomenclador/codigos/${nid}/editar?tab=obras&nuevo=1`)}
          showToast={showToast}
        />
      ) : (
        <div className={styles.stack}>
          {recienCreado && (
            <div className={`${styles.result} ${styles.resultOk}`} role="status">
              <strong>Código creado.</strong> Podés seguir ahora o más tarde desde esta ficha:
              <div className={styles.siguientes}>
                <button type="button" className={base.btnGhost} onClick={() => irATab("especialidades")}>
                  Definir quién puede facturarlo <ArrowRight size={14} />
                </button>
                <button type="button" className={base.btnGhost} onClick={() => irATab("obras")}>
                  Darlo de alta en obras sociales <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {ficha && <ChecklistEtapas ficha={ficha} onTab={irATab} />}

          <nav className={styles.tabs} role="tablist" aria-label="Secciones del código">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={tab === t.id}
                className={`${styles.tab} ${tab === t.id ? styles.tabOn : ""}`}
                onClick={() => irATab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "obras" && (
            <TabObras
              ficha={ficha}
              cargando={fichaQuery.isLoading}
              recargar={() => fichaQuery.refetch()}
              showToast={showToast}
            />
          )}
          {tab === "datos" && (
            <DatosCodigo nomId={nomId} onGuardado={() => { fichaQuery.refetch(); showToast("success", "Datos guardados."); }} showToast={showToast} />
          )}
          {tab === "especialidades" && (
            <TabEspecialidades
              nomId={nomId}
              ficha={ficha}
              espOptions={espOptions}
              espLoading={espQuery.isLoading}
              espNombre={espNombre}
              onGuardado={() => fichaQuery.refetch()}
              showToast={showToast}
            />
          )}
          {tab === "boletin" && (
            <Boletin
              codigoInicial={ficha?.codigo ?? ""}
              osOptions={osOptions}
              espNombre={espNombre}
              osLoading={osQuery.isLoading}
            />
          )}
        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            className={`${base.toast} ${toast.type === "success" ? base.toastSuccess : base.toastError}`}
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

// ─── Avance por etapa ─────────────────────────────────────────────────────────

function ChecklistEtapas({ ficha, onTab }: { ficha: FichaCodigoOut; onTab: (t: Tab) => void }) {
  const total = ficha.obras_sociales.length;
  const conAlta = total - ficha.conteos.sin_alta;
  const quien = ficha.plantilla_sin_restriccion
    ? "Sin restricción"
    : ficha.plantilla_especialidades.length
      ? `${ficha.plantilla_especialidades.length} especialidades`
      : "Sin definir";
  return (
    <div className={styles.etapas}>
      <div className={`${styles.etapa} ${styles.e1}`}>
        <span className={styles.etapaT}>1 · Código</span>
        <span className={styles.etapaV}>{ficha.activo ? "Activo" : "Inactivo"}</span>
        <button type="button" className={styles.etapaL} onClick={() => onTab("datos")}>Editar datos</button>
      </div>
      <div className={`${styles.etapa} ${styles.e2}`}>
        <span className={styles.etapaT}>2 · Quién factura</span>
        <span className={styles.etapaV}>{quien}</span>
        <button type="button" className={styles.etapaL} onClick={() => onTab("especialidades")}>Editar plantilla</button>
      </div>
      <div className={`${styles.etapa} ${styles.e3}`}>
        <span className={styles.etapaT}>3 · Alta en O.S.</span>
        <span className={styles.etapaV}>{conAlta} de {total}</span>
        <button type="button" className={styles.etapaL} onClick={() => onTab("obras")}>{ficha.conteos.sin_alta} sin alta</button>
      </div>
      <div className={`${styles.etapa} ${styles.e4}`}>
        <span className={styles.etapaT}>4 · Precio</span>
        <span className={styles.etapaV}>{ficha.conteos.con_precio} de {conAlta}</span>
        <button type="button" className={styles.etapaL} onClick={() => onTab("obras")}>{ficha.conteos.sin_precio} sin precio</button>
      </div>
    </div>
  );
}

// ─── Pestaña Obras sociales (Ficha) ───────────────────────────────────────────

const FILTROS: { id: "todas" | EstadoCodigoOS; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "con_precio", label: "Con precio" },
  { id: "sin_precio", label: "Sin precio" },
  { id: "sin_alta", label: "Sin alta" },
  { id: "suspendido", label: "Suspendidas" },
];

function TabObras({
  ficha,
  cargando,
  recargar,
  showToast,
}: {
  ficha: FichaCodigoOut | undefined;
  cargando: boolean;
  recargar: () => void;
  showToast: (t: Toast["type"], m: string) => void;
}) {
  const { can } = usePermisos();
  const puedeEditar = can("nomenclador:editar");
  const [filtro, setFiltro] = useState<"todas" | EstadoCodigoOS>("todas");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [trabajando, setTrabajando] = useState(false);
  const [resultado, setResultado] = useState<AplicarAltaItem[] | null>(null);

  const filas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (ficha?.obras_sociales ?? []).filter(
      (o) =>
        (filtro === "todas" || o.estado === filtro) &&
        (!t || o.nombre.toLowerCase().includes(t) || String(o.obra_social_nro).includes(t)),
    );
  }, [ficha, filtro, q]);

  if (cargando || !ficha) return <p className={base.emptyText}>Cargando ficha…</p>;

  const seleccionables = filas.filter((o) => o.estado === "sin_alta");
  const todasSel = seleccionables.length > 0 && seleccionables.every((o) => sel.has(o.obra_social_nro));
  const sinPlantilla = !ficha.plantilla_sin_restriccion && ficha.plantilla_especialidades.length === 0;

  function toggle(nro: number) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(nro)) n.delete(nro);
      else n.add(nro);
      return n;
    });
  }

  async function darDeAlta(nros: number[]) {
    if (!ficha || nros.length === 0) return;
    setTrabajando(true);
    setResultado(null);
    try {
      const r = await aplicarEspecialidades(ficha.nomenclador_id, nros);
      setResultado(r.resultados);
      setSel(new Set());
      recargar();
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo dar de alta."));
    } finally {
      setTrabajando(false);
    }
  }

  async function reactivar(nro: number) {
    if (!ficha) return;
    try {
      await cambiarEstadoCodigoOS(nro, ficha.nomenclador_id, "reactivar");
      showToast("success", "Código reactivado en la obra social.");
      recargar();
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo reactivar."));
    }
  }

  return (
    <section className={`${base.body} ${styles.section}`}>
      <div className={styles.kpis} role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => {
          const n = f.id === "todas" ? ficha.obras_sociales.length : ficha.conteos[f.id];
          return (
            <button
              key={f.id}
              type="button"
              className={`${styles.kpi} ${styles[`kpi_${f.id}`] ?? ""} ${filtro === f.id ? styles.kpiOn : ""}`}
              onClick={() => setFiltro(f.id)}
              aria-pressed={filtro === f.id}
            >
              <strong>{n}</strong>
              <span>{f.label}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <input
          className={base.formInput}
          placeholder="Buscar obra social por número o nombre…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar obra social"
        />
        {puedeEditar && (
          <button
            type="button"
            className={base.btnPrimary}
            disabled={sel.size === 0 || trabajando}
            onClick={() => darDeAlta([...sel])}
          >
            {trabajando ? <><span className={base.spinner} /> Dando de alta…</> : `Dar de alta en ${sel.size} seleccionada${sel.size === 1 ? "" : "s"}`}
          </button>
        )}
      </div>

      {sinPlantilla && (
        <p className={styles.aviso}>
          Este código todavía no tiene definido quién puede facturarlo. Podés darlo de alta igual,
          pero ningún médico va a poder cargarlo hasta que elijas las especialidades (acá, en
          «2 · Quién factura», o en cada obra social).
        </p>
      )}

      {resultado && <ResultadoAlta resultado={resultado} />}

      <div className={base.tableWrap}>
        <table className={base.table}>
          <thead>
            <tr>
              <th>
                {puedeEditar && (
                  <input
                    type="checkbox"
                    aria-label="Seleccionar todas las obras sociales sin alta"
                    checked={todasSel}
                    disabled={seleccionables.length === 0}
                    onChange={(e) =>
                      setSel(e.target.checked ? new Set(seleccionables.map((o) => o.obra_social_nro)) : new Set())
                    }
                  />
                )}
              </th>
              <th>Obra social</th>
              <th>Estado</th>
              <th>Quién factura</th>
              <th>Precio vigente</th>
              <th>Desde</th>
              <th className={styles.num}>En $0</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={8} className={base.emptyCell}>No hay obras sociales con ese filtro.</td></tr>
            ) : filas.map((o) => (
              <tr key={o.obra_social_nro} className={sel.has(o.obra_social_nro) ? styles.filaSel : undefined}>
                <td>
                  {puedeEditar && o.estado === "sin_alta" && (
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${o.nombre}`}
                      checked={sel.has(o.obra_social_nro)}
                      onChange={() => toggle(o.obra_social_nro)}
                    />
                  )}
                </td>
                <td>{o.obra_social_nro} · {o.nombre}</td>
                <td><EstadoCodigoPill estado={o.estado} /></td>
                <td>
                  {o.estado === "sin_alta" ? "—" : o.sin_restriccion_especialidad
                    ? "Sin restricción"
                    : o.especialidades ? `${o.especialidades} especialidades` : <span className={styles.motivo}>Nadie</span>}
                </td>
                <td>
                  {o.precio_tipo === "igual" && o.precio_total != null
                    ? `${moneda.format(Number(o.precio_total))} · todas`
                    : o.precio_tipo === "por_especialidad"
                      ? `${o.variantes} variante${o.variantes === 1 ? "" : "s"}`
                      : "—"}
                </td>
                <td>{fechaAR(o.vigencia_desde)}</td>
                <td className={styles.num}>{o.prestaciones_sin_valorizar || "—"}</td>
                <td className={styles.acciones}>
                  {o.estado === "sin_alta" && puedeEditar && (
                    <button type="button" className={base.btnGhost} disabled={trabajando} onClick={() => darDeAlta([o.obra_social_nro])}>
                      Dar de alta
                    </button>
                  )}
                  {o.estado === "suspendido" && puedeEditar && (
                    <button type="button" className={base.btnGhost} onClick={() => reactivar(o.obra_social_nro)}>Reactivar</button>
                  )}
                  {(o.estado === "sin_precio" || o.estado === "con_precio") && (
                    <>
                      <Link className={base.btnGhost} to={`${CODIGOS_OS_PATH}?os=${o.obra_social_nro}&codigo=${ficha.codigo}`}>Alta</Link>
                      <Link className={o.estado === "sin_precio" ? base.btnPrimary : base.btnGhost} to={`${PRECIOS_PATH}?os=${o.obra_social_nro}&codigo=${ficha.codigo}`}>
                        {o.estado === "sin_precio" ? "Cargar precio" : "Precio"}
                      </Link>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={base.hintText}>
        «Dar de alta» deja el código en la obra social sin precio, con las especialidades de la
        plantilla. Si ya estaba dado de alta, le suma las especialidades de la plantilla que le falten.
      </p>
    </section>
  );
}

function ResultadoAlta({ resultado }: { resultado: AplicarAltaItem[] }) {
  const errores = resultado.filter((r) => r.estado === "error");
  const altas = resultado.filter((r) => r.estado === "alta_creada");
  const agregadas = resultado.filter((r) => r.estado === "especialidades_agregadas");
  const sinQuien = resultado.filter((r) => r.sin_quien_factura);
  return (
    <div className={`${styles.result} ${errores.length ? styles.resultWarn : styles.resultOk}`} role="status">
      <strong>
        {altas.length > 0 && `Dado de alta en ${altas.length} obra${altas.length === 1 ? "" : "s"} social${altas.length === 1 ? "" : "es"}, sin precio. `}
        {agregadas.length > 0 && `Especialidades agregadas en ${agregadas.length}. `}
        {altas.length === 0 && agregadas.length === 0 && errores.length === 0 && "No había nada para cambiar."}
      </strong>
      {sinQuien.length > 0 && (
        <p>Ojo: en {sinQuien.map((r) => r.nombre).join(", ")} nadie puede facturarlo todavía (no hay especialidades).</p>
      )}
      {errores.length > 0 && (
        <ul>
          {errores.map((r) => (
            <li key={r.obra_social_nro}>{r.nombre}: <span className={styles.motivo}>{r.motivo}</span></li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Etapa 1 · Datos del código ───────────────────────────────────────────────

function DatosCodigo({
  nomId,
  onGuardado,
  showToast,
}: {
  nomId: number | null;
  onGuardado: (id: number) => void;
  showToast: (t: Toast["type"], m: string) => void;
}) {
  const [cargando, setCargando] = useState(nomId !== null);
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState("");
  const [complejidad, setComplejidad] = useState<Complejidad | "">("");
  const [observacion, setObservacion] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (nomId === null) return;
    let vivo = true;
    getNomencladorById(nomId)
      .then((d) => {
        if (!vivo) return;
        setCodigo(d.codigo);
        setDescripcion(d.descripcion ?? "");
        setCategoria(d.categoria ?? "");
        setComplejidad(d.complejidad ?? "");
        setObservacion(d.observacion ?? "");
      })
      .catch(() => vivo && showToast("error", "No se pudo cargar el código."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [nomId, showToast]);

  async function guardar() {
    if (!codigo.trim()) {
      setErrorCodigo("Requerido");
      return;
    }
    setGuardando(true);
    try {
      const datos = {
        descripcion: descripcion.trim(),
        categoria: categoria.trim() || null,
        complejidad: complejidad || null,
        observacion: observacion.trim() || null,
      };
      if (nomId !== null) {
        // Sin `especialidades` ni `sin_restriccion`: la plantilla (etapa 2) no se toca.
        await updateNomenclador(nomId, datos);
        onGuardado(nomId);
      } else {
        const creado = await createNomenclador({ codigo: codigo.trim(), ...datos });
        onGuardado(creado.id);
      }
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo guardar el código."));
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className={base.emptyText}>Cargando…</p>;

  return (
    <section className={`${base.body} ${styles.section}`}>
      <h2 className={styles.sectionHeading}>Datos del código</h2>
      <div className={base.formRow3}>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="cod-codigo">
            Código <span className={base.req}>*</span>
          </label>
          <input
            id="cod-codigo"
            className={`${base.formInput} ${errorCodigo ? base.inputError : ""}`}
            value={codigo}
            disabled={nomId !== null}
            onChange={(e) => { setCodigo(e.target.value); setErrorCodigo(""); }}
            placeholder="ej: 420101"
          />
          {errorCodigo && <span className={base.errorMsg}>{errorCodigo}</span>}
        </div>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="cod-categoria">Categoría</label>
          <select id="cod-categoria" className={base.formSelect} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            <option value="">— Sin especificar —</option>
            <option value="Consulta">Consulta</option>
            <option value="Practica">Práctica</option>
            <option value="Honorarios individuales">Honorarios individuales</option>
          </select>
        </div>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="cod-complejidad">Complejidad</label>
          <select id="cod-complejidad" className={base.formSelect} value={complejidad} onChange={(e) => setComplejidad(e.target.value as Complejidad | "")}>
            <option value="">— Sin especificar —</option>
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
        </div>
      </div>
      <div className={base.formGroup}>
        <label className={base.formLabel} htmlFor="cod-desc">Descripción del Colegio</label>
        <input
          id="cod-desc"
          className={base.formInput}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Se ofrece como nombre al darlo de alta en una obra social"
        />
      </div>
      <div className={base.formGroup}>
        <label className={base.formLabel} htmlFor="cod-obs">Observación</label>
        <textarea id="cod-obs" className={base.formTextarea} value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Observaciones opcionales…" />
      </div>
      <div className={styles.actions}>
        <button type="button" className={base.btnPrimary} onClick={guardar} disabled={guardando}>
          {guardando ? <><span className={base.spinner} /> Guardando…</> : <><Save size={15} /> {nomId === null ? "Crear código" : "Guardar datos"}</>}
        </button>
      </div>
    </section>
  );
}

// ─── Etapa 2 · Quién factura ──────────────────────────────────────────────────

function TabEspecialidades({
  nomId,
  ficha,
  espOptions,
  espLoading,
  espNombre,
  onGuardado,
  showToast,
}: {
  nomId: number;
  ficha: FichaCodigoOut | undefined;
  espOptions: { value: number; label: string; hint?: string }[];
  espLoading: boolean;
  espNombre: Map<number, string>;
  onGuardado: () => void;
  showToast: (t: Toast["type"], m: string) => void;
}) {
  const { can } = usePermisos();
  const puedeEditar = can("nomenclador:editar");
  const [sinRestriccion, setSinRestriccion] = useState(false);
  const [espSel, setEspSel] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cambio, setCambio] = useState(false);

  // Actualizar en obras sociales
  const [osSel, setOsSel] = useState<number[]>([]);
  const [modo, setModo] = useState<PropagarModo>("agregar");
  const [preview, setPreview] = useState<PropagarEspecialidadesResult | null>(null);
  const [propagando, setPropagando] = useState<null | "preview" | "aplicar">(null);

  useEffect(() => {
    if (!ficha) return;
    setSinRestriccion(ficha.plantilla_sin_restriccion);
    setEspSel(ficha.plantilla_especialidades);
  }, [ficha]);

  const conAlta = useMemo(
    () => (ficha?.obras_sociales ?? [])
      .filter((o) => o.estado !== "sin_alta")
      .map((o) => ({ value: o.obra_social_nro, label: o.nombre, hint: String(o.obra_social_nro) })),
    [ficha],
  );

  async function guardar() {
    setGuardando(true);
    try {
      await guardarPlantillaEspecialidades(nomId, {
        sin_restriccion_especialidad: sinRestriccion,
        especialidades: sinRestriccion ? [] : espSel,
      });
      showToast("success", "Plantilla guardada.");
      setCambio(true);
      setPreview(null);
      onGuardado();
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo guardar la plantilla."));
    } finally {
      setGuardando(false);
    }
  }

  async function propagar(dry: boolean) {
    if (osSel.length === 0) return;
    setPropagando(dry ? "preview" : "aplicar");
    try {
      const r = await propagarPlantillaEspecialidades(nomId, { obra_social_nros: osSel, modo, dry_run: dry });
      setPreview(r);
      if (!dry) {
        const n = r.resultados.filter((x) => x.estado === "actualizada").length;
        showToast("success", `Se actualizaron ${n} obra${n === 1 ? "" : "s"} social${n === 1 ? "" : "es"}.`);
        onGuardado();
      }
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo actualizar en las obras sociales."));
    } finally {
      setPropagando(null);
    }
  }

  const nombres = (ids: number[]) => ids.map((i) => espNombre.get(i) ?? i).join(", ");

  return (
    <>
      <section className={`${base.body} ${styles.section}`}>
        <h2 className={styles.sectionHeading}>Quién puede facturarlo</h2>
        <p className={base.hintText}>
          Es la regla del Colegio. Se copia a cada obra social cuando le das el alta al código, y
          ahí se puede ajustar. Guardarla no cambia las obras sociales que ya lo tienen.
        </p>
        <label className={styles.checkLine}>
          <input type="checkbox" checked={sinRestriccion} disabled={!puedeEditar} onChange={(e) => setSinRestriccion(e.target.checked)} />
          Sin restricción: lo puede facturar cualquier especialidad
        </label>
        {sinRestriccion ? (
          <p className={styles.sinRestriccionInfo}>Cualquier especialidad puede facturar este código.</p>
        ) : (
          <MultiSelectBuscable options={espOptions} selected={espSel} onChange={setEspSel} noun="especialidades" loading={espLoading} />
        )}
        {puedeEditar && (
          <div className={styles.actions}>
            <button type="button" className={base.btnPrimary} onClick={guardar} disabled={guardando}>
              {guardando ? <><span className={base.spinner} /> Guardando…</> : <><Save size={15} /> Guardar plantilla</>}
            </button>
          </div>
        )}
      </section>

      {puedeEditar && (
        <section className={`${base.body} ${styles.section}`}>
          <h2 className={styles.sectionHeading}>Actualizar en obras sociales <span className={styles.opcional}>opcional</span></h2>
          <p className={base.hintText}>
            {cambio
              ? "Cambiaste la plantilla. Las obras sociales que ya tienen el código conservan su lista hasta que las actualices acá."
              : "Lleva la plantilla a obras sociales que ya tienen el código dado de alta."}{" "}
            Las que son «sin restricción» se saltean.
          </p>
          <MultiSelectBuscable options={conAlta} selected={osSel} onChange={(v) => { setOsSel(v); setPreview(null); }} noun="obras sociales con el código" />
          <div className={styles.modos} role="radiogroup" aria-label="Modo">
            <label className={styles.checkLine}>
              <input type="radio" name="modo" checked={modo === "agregar"} onChange={() => { setModo("agregar"); setPreview(null); }} />
              Solo agregar las nuevas (no le saca nada a nadie)
            </label>
            <label className={styles.checkLine}>
              <input type="radio" name="modo" checked={modo === "igualar"} onChange={() => { setModo("igualar"); setPreview(null); }} />
              Igualar a la plantilla (también quita lo que sobre; si una especialidad que se quita tiene precio, ese precio se da de baja y deja de poder facturar)
            </label>
          </div>

          {preview && (
            <div className={base.tableWrap}>
              <table className={base.table}>
                <thead><tr><th>Obra social</th><th>Cambios</th></tr></thead>
                <tbody>
                  {preview.resultados.map((r) => (
                    <tr key={r.obra_social_nro}>
                      <td>{r.obra_social_nro} · {r.nombre}</td>
                      <td>
                        {r.agrega.length > 0 && <span className={styles.mas}>+ {nombres(r.agrega)} </span>}
                        {r.quita.length > 0 && <span className={styles.motivo}>− {nombres(r.quita)} </span>}
                        {r.quita_con_precio.length > 0 && <span className={styles.bloq}>Se da{r.quita_con_precio.length === 1 ? "" : "n"} de baja su precio: {nombres(r.quita_con_precio)} </span>}
                        {r.estado === "sin_cambios" && <span className={base.hintText}>Sin cambios</span>}
                        {(r.estado === "salteada" || r.estado === "error") && <span className={base.hintText}>{r.motivo}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={base.btnGhost} disabled={osSel.length === 0 || propagando !== null} onClick={() => propagar(true)}>
              {propagando === "preview" ? <><span className={base.spinner} /> Calculando…</> : "Ver cambios"}
            </button>
            <button
              type="button"
              className={base.btnPrimary}
              disabled={!preview || preview.dry_run === false || propagando !== null}
              onClick={() => propagar(false)}
            >
              {propagando === "aplicar" ? <><span className={base.spinner} /> Actualizando…</> : `Actualizar ${osSel.length} obra${osSel.length === 1 ? "" : "s"} social${osSel.length === 1 ? "" : "es"}`}
            </button>
          </div>
        </section>
      )}
    </>
  );
}

// ─── Boletín (solo lectura) ───────────────────────────────────────────────────

function Boletin({
  codigoInicial,
  osOptions,
  espNombre,
  osLoading,
}: {
  codigoInicial: string;
  osOptions: { value: number; label: string; hint?: string }[];
  espNombre: Map<number, string>;
  osLoading: boolean;
}) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [os, setOs] = useState<number | "">("");
  const [valores, setValores] = useState<ValorOut[] | null>(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    setCodigo((prev) => (prev === "" ? codigoInicial : prev));
  }, [codigoInicial]);

  useEffect(() => {
    const c = codigo.trim();
    if (!c || os === "") {
      setValores(null);
      return;
    }
    let vivo = true;
    setCargando(true);
    const t = setTimeout(() => {
      listValores({ obra_social_nro: os, codigo: c, estado: "activo", size: 200 })
        .then((v) => vivo && setValores(v))
        .catch(() => vivo && setValores([]))
        .finally(() => vivo && setCargando(false));
    }, 350);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [codigo, os]);

  return (
    <section className={`${base.body} ${styles.section}`}>
      <h2 className={styles.sectionHeading}>Boletín</h2>
      <div className={styles.filters}>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="bol-codigo">Código</label>
          <input id="bol-codigo" className={base.formInput} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ej: 420101" />
        </div>
        <div className={base.formGroup}>
          <label className={base.formLabel} htmlFor="bol-os">Obra social</label>
          <AppSearchSelect
            options={osOptions.map((o) => ({ id: o.value, label: `${o.value} · ${o.label}` }))}
            value={os === "" ? null : os}
            loading={osLoading}
            disabled={osLoading}
            onChange={(v) => setOs(v == null ? "" : Number(v))}
          />
        </div>
      </div>
      <div className={base.tableWrap}>
        <table className={base.table}>
          <thead>
            <tr>
              <th>Origen</th>
              <th>Especialidad</th>
              <th className={styles.num}>Honorarios</th>
              <th className={styles.num}>Gastos</th>
              <th className={styles.num}>Ayudante</th>
              <th className={styles.num}>Total</th>
              <th>Vigencia desde</th>
            </tr>
          </thead>
          <tbody>
            {valores === null ? (
              <tr><td colSpan={7} className={base.emptyCell}>Elegí un código y una obra social para consultar.</td></tr>
            ) : cargando ? (
              <tr><td colSpan={7} className={base.loadingCell}>Cargando…</td></tr>
            ) : valores.length === 0 ? (
              <tr><td colSpan={7} className={base.emptyCell}>Esa obra social no tiene precio cargado para el código.</td></tr>
            ) : valores.map((v) => {
              const h = montoDe(v, "Honorarios");
              const g = montoDe(v, "Gastos");
              const a = montoDe(v, "Ayudante");
              return (
                <tr key={v.id}>
                  <td><span className={base.badge}>{v.origen}</span></td>
                  <td>{v.especialidad_id_colegio != null ? (espNombre.get(v.especialidad_id_colegio) ?? v.especialidad_id_colegio) : "—"}</td>
                  <td className={styles.num}>{moneda.format(h)}</td>
                  <td className={styles.num}>{moneda.format(g)}</td>
                  <td className={styles.num}>{moneda.format(a)}</td>
                  <td className={styles.num}>{moneda.format(h + g + a)}</td>
                  <td>{v.vigencia_desde}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
