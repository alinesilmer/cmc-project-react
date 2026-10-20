import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ClipboardList, Pencil } from "lucide-react";

import base from "../NomencladorCodigos/NomencladorCodigos.module.scss";
import styles from "./CodigosPorOS.module.scss";
import AppSearchSelect from "../../../components/ui/AppSearchSelect/AppSearchSelect";
import Modal from "../../../components/ui/Modal/Modal";
import MultiSelectBuscable from "../../../components/molecules/MultiSelectBuscable/MultiSelectBuscable";
import EstadoCodigoPill from "../components/EstadoCodigoPill";
import { usePermisos } from "../../../auth/usePermisos";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import {
  accionCodigosOS,
  cambiarEstadoCodigoOS,
  darDeAltaCodigos,
  getCodigoOS,
  listCodigosPorOS,
  updateCodigoOS,
} from "../nomenclador.api";
import type {
  AccionCodigosOS,
  AccionCodigosResult,
  AltaCodigoResultado,
  CodigoObraSocialOut,
  CodigoPorOSItem,
  Complejidad,
  EstadoCodigoOS,
  PreciosDependientes,
  TipoCodigo,
} from "../nomenclador.types";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { fechaCorta } from "@/app/pages/NomencladorNacional/utiles";
import { detalleError } from "@/app/pages/NomencladorNacional/utiles";
import { TIPOS_CODIGO } from "../components/tipoCodigo";
const PRECIOS_PATH = "/panel/nomenclador/precios/por-obra-social";
const PAGE_SIZE = 50;
type Toast = { type: "success" | "error"; msg: string };

const FILTROS: { id: "todos" | EstadoCodigoOS; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "con_precio", label: "Con precio" },
  { id: "sin_precio", label: "Sin precio" },
  { id: "sin_alta", label: "Sin alta" },
  { id: "suspendido", label: "Suspendidos" },
];
function quienFactura(i: CodigoPorOSItem): React.ReactNode {
  if (i.estado === "sin_alta") {
    if (i.plantilla_sin_restriccion) return <span className={base.hintText}>Plantilla: sin restricción</span>;
    if (i.especialidades_plantilla) return <span className={base.hintText}>Plantilla: {i.especialidades_plantilla} especialidades</span>;
    return <span className={styles.alerta}>Sin plantilla</span>;
  }
  if (i.sin_restriccion_especialidad) return "Sin restricción";
  if (i.especialidades_os) return `${i.especialidades_os} especialidades`;
  return <span className={styles.peligro}>Nadie</span>;
}

type AccionElegida = "alta" | AccionCodigosOS;

const TEXTO_ACCION: Record<AccionCodigosOS, string> = {
  suspender: "Suspender códigos",
  reactivar: "Reactivar códigos",
  activar_documentacion: "Activar documentación digital",
  desactivar_documentacion: "Desactivar documentación digital",
};

/**
 * Las opciones del menú de acciones según lo marcado en la tabla. Cada una trae los ids a los que
 * aplica: el resto de lo marcado no corresponde y no se toca. Las de documentación digital sólo
 * aparecen si la obra social la tiene habilitada.
 */
function opcionesDeAccion(
  marcados: CodigoPorOSItem[],
  conDocumentacion: boolean,
): { id: AccionElegida; label: string; ids: number[] }[] {
  const ids = (f: (i: CodigoPorOSItem) => boolean) => marcados.filter(f).map((i) => i.nomenclador_id);
  const sinAlta = ids((i) => i.estado === "sin_alta");
  const activos = ids((i) => i.estado === "sin_precio" || i.estado === "con_precio");
  const suspendidos = ids((i) => i.estado === "suspendido");
  const sinDoc = ids((i) => i.estado !== "sin_alta" && !i.requiere_documentacion);
  const conDoc = ids((i) => i.estado !== "sin_alta" && i.requiere_documentacion);
  const out: { id: AccionElegida; label: string; ids: number[] }[] = [];
  if (sinAlta.length) out.push({ id: "alta", label: `Dar de alta (${sinAlta.length})`, ids: sinAlta });
  if (activos.length) out.push({ id: "suspender", label: TEXTO_ACCION.suspender, ids: activos });
  if (suspendidos.length) out.push({ id: "reactivar", label: TEXTO_ACCION.reactivar, ids: suspendidos });
  if (conDocumentacion && sinDoc.length) out.push({ id: "activar_documentacion", label: TEXTO_ACCION.activar_documentacion, ids: sinDoc });
  if (conDocumentacion && conDoc.length) out.push({ id: "desactivar_documentacion", label: TEXTO_ACCION.desactivar_documentacion, ids: conDoc });
  return out;
}

/** Etapa 3 del nomenclador — "Códigos por obra social". */
export default function CodigosPorOS() {
  const [params, setParams] = useSearchParams();
  const { can } = usePermisos();
  const puedeEditar = can("nomenclador:editar");
  const osParam = params.get("os");
  const [os, setOs] = useState<number | null>(osParam ? Number(osParam) : null);
  const [filtro, setFiltro] = useState<"todos" | EstadoCodigoOS>("todos");
  const [tipo, setTipo] = useState<TipoCodigo | "">("");
  const [q, setQ] = useState(params.get("codigo") ?? "");
  const [qDebounced, setQDebounced] = useState(q);
  // Rango de códigos (sólo dígitos). Se aplica con una pausa, igual que el buscador.
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [rango, setRango] = useState({ desde: "", hasta: "" });
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Map<number, CodigoPorOSItem>>(new Map());
  const [altaOpen, setAltaOpen] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  // Barra de acciones (estilo Django Admin): la elegida, la confirmación pendiente y el resultado.
  const [accion, setAccion] = useState<AccionElegida | "">("");
  const [aConfirmar, setAConfirmar] = useState<{ accion: AccionCodigosOS; ids: number[] } | null>(null);
  const [ejecutando, setEjecutando] = useState(false);
  const [resultado, setResultado] = useState<AccionCodigosResult | null>(null);

  const showToast = useCallback((type: Toast["type"], msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => setRango({ desde, hasta }), 300);
    return () => clearTimeout(t);
  }, [desde, hasta]);
  useEffect(() => {
    setPage(1);
    setSel(new Map());
  }, [os, filtro, qDebounced, tipo, rango]);

  const osQuery = useObrasSociales();
  const osOptions = useMemo(
    () =>
      (osQuery.data ?? [])
        .map((o) => ({ id: o.nro_obra_social, label: `${o.nro_obra_social} · ${o.nombre}` }))
        .sort((a, b) => a.label.localeCompare(b.label, "es", { numeric: true })),
    [osQuery.data],
  );
  const osNombre = osOptions.find((o) => o.id === os)?.label ?? "";

  const listado = useQuery({
    queryKey: ["codigos-por-os", os, filtro, qDebounced, tipo, rango, page],
    queryFn: () =>
      listCodigosPorOS({
        obra_social_nro: os as number,
        estado: filtro === "todos" ? undefined : filtro,
        q: qDebounced.trim() || undefined,
        tipo: tipo || undefined,
        codigo_desde: rango.desde ? Number(rango.desde) : undefined,
        codigo_hasta: rango.hasta ? Number(rango.hasta) : undefined,
        page,
        size: PAGE_SIZE,
      }),
    enabled: os !== null,
    placeholderData: (prev) => prev,
  });
  const datos = listado.data;

  function elegirOs(v: number | null) {
    setOs(v);
    const next = new URLSearchParams(params);
    if (v == null) next.delete("os");
    else next.set("os", String(v));
    setParams(next, { replace: true });
  }

  function toggle(i: CodigoPorOSItem) {
    setSel((prev) => {
      const n = new Map(prev);
      if (n.has(i.nomenclador_id)) n.delete(i.nomenclador_id);
      else n.set(i.nomenclador_id, i);
      return n;
    });
  }

  async function reactivar(i: CodigoPorOSItem) {
    if (os == null) return;
    try {
      await cambiarEstadoCodigoOS(os, i.nomenclador_id, "reactivar");
      showToast("success", `${i.codigo} reactivado.`);
      listado.refetch();
    } catch (e) {
      showToast("error", detalleError(e, "No se pudo reactivar."));
    }
  }

  const items = datos?.items ?? [];
  const totalPaginas = datos ? Math.max(1, Math.ceil(datos.total / PAGE_SIZE)) : 1;
  const conDocumentacion = !!datos?.documentacion_digital;
  const columnas = 6 + (conDocumentacion ? 1 : 0);

  // Qué se puede hacer con lo marcado: las opciones del menú salen de ahí.
  const marcados = useMemo(() => [...sel.values()], [sel]);
  const opciones = useMemo(() => opcionesDeAccion(marcados, conDocumentacion), [marcados, conDocumentacion]);
  useEffect(() => {
    if (accion && !opciones.some((o) => o.id === accion)) setAccion("");
  }, [accion, opciones]);

  function ejecutarAccion() {
    if (!accion) return;
    if (accion === "alta") {
      setAltaOpen(true);
      return;
    }
    const op = opciones.find((o) => o.id === accion);
    if (op) setAConfirmar({ accion, ids: op.ids });
  }

  async function confirmarAccion() {
    if (os == null || !aConfirmar) return;
    setEjecutando(true);
    try {
      const r = await accionCodigosOS({ obra_social_nro: os, nomenclador_ids: aConfirmar.ids, accion: aConfirmar.accion });
      setAConfirmar(null);
      setAccion("");
      setSel(new Map());
      listado.refetch();
      if (r.resultados.some((x) => x.estado === "no_aplica")) setResultado(r);
      else showToast("success", `${TEXTO_ACCION[aConfirmar.accion]}: ${r.aplicados} código${r.aplicados === 1 ? "" : "s"}.`);
    } catch (e) {
      setAConfirmar(null);
      showToast("error", detalleError(e, "No se pudo aplicar la acción."));
    } finally {
      setEjecutando(false);
    }
  }

  return (
    <div className={base.container}>
      <div className={base.header}>
        <div className={base.headerLeft}>
          <span className={base.headerIcon}><ClipboardList size={20} /></span>
          <div>
            <h1 className={base.title}>Códigos por obra social</h1>
          </div>
        </div>
      </div>

      <section className={`${base.body} ${styles.section}`}>
        <div className={styles.filtrosTop}>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="cpo-os">Obra social</label>
            <AppSearchSelect
              options={osOptions}
              value={os}
              loading={osQuery.isLoading}
              disabled={osQuery.isLoading}
              onChange={(v) => elegirOs(v == null ? null : Number(v))}
            />
          </div>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="cpo-q">Buscar código</label>
            <input
              id="cpo-q"
              className={base.formInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Código o descripción…"
              disabled={os === null}
            />
          </div>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="cpo-tipo">Tipo</label>
            <select
              id="cpo-tipo"
              className={base.formSelect}
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoCodigo | "")}
              disabled={os === null}
            >
              <option value="">Todos</option>
              {TIPOS_CODIGO.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="cpo-desde">Código desde</label>
            <input
              id="cpo-desde"
              className={base.formInput}
              inputMode="numeric"
              value={desde}
              onChange={(e) => setDesde(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 170000"
              disabled={os === null}
            />
          </div>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="cpo-hasta">Código hasta</label>
            <input
              id="cpo-hasta"
              className={base.formInput}
              inputMode="numeric"
              value={hasta}
              onChange={(e) => setHasta(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 420200"
              disabled={os === null}
            />
          </div>
        </div>

        {os === null ? (
          <p className={base.emptyText}>Elegí una obra social para ver sus códigos.</p>
        ) : (
          <>
            <div className={styles.kpis} role="group" aria-label="Filtrar por estado">
              {FILTROS.map((f) => {
                const n = !datos ? "—" : f.id === "todos"
                  ? Object.values(datos.conteos).reduce((a, b) => a + b, 0)
                  : datos.conteos[f.id];
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filtro === f.id}
                    className={`${styles.kpi} ${styles[`kpi_${f.id}`] ?? ""} ${filtro === f.id ? styles.kpiOn : ""}`}
                    onClick={() => setFiltro(f.id)}
                  >
                    <strong>{n}</strong>
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>

            {puedeEditar && (
              <div className={styles.barraAcciones}>
                <div className={styles.accionFila}>
                  <label htmlFor="cpo-accion">Acción:</label>
                  <select
                    id="cpo-accion"
                    className={`${base.formSelect} ${styles.accionSelect}`}
                    value={accion}
                    onChange={(e) => setAccion(e.target.value as AccionElegida | "")}
                  >
                    <option value="">---------</option>
                    {opciones.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <button type="button" className={base.btnGhost} disabled={!accion || ejecutando} onClick={ejecutarAccion}>
                    Ir
                  </button>
                </div>
                <span className={base.hintText} aria-live="polite">
                  {sel.size} de {items.length} seleccionados
                </span>
              </div>
            )}

            <div className={base.tableWrap}>
              <Tabla className={base.table}>
                <thead>
                  <tr>
                    <th>
                      {puedeEditar && (
                        <input
                          type="checkbox"
                          aria-label="Seleccionar todos los códigos de esta página"
                          disabled={items.length === 0}
                          checked={items.length > 0 && items.every((i) => sel.has(i.nomenclador_id))}
                          onChange={(e) =>
                            setSel((prev) => {
                              const n = new Map(prev);
                              for (const i of items) {
                                if (e.target.checked) n.set(i.nomenclador_id, i);
                                else n.delete(i.nomenclador_id);
                              }
                              return n;
                            })
                          }
                        />
                      )}
                    </th>
                    <th>Código</th>
                    <th>Descripción en la obra social</th>
                    <th>Quién factura</th>
                    <th>Estado</th>
                    {conDocumentacion && <th>Doc. digital</th>}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {listado.isLoading ? (
                    <tr><td colSpan={columnas} className={base.loadingCell}>Cargando…</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td colSpan={columnas} className={base.emptyCell}>No hay códigos con ese filtro.</td></tr>
                  ) : items.map((i) => (
                    <tr key={i.nomenclador_id} className={sel.has(i.nomenclador_id) ? styles.filaSel : undefined}>
                      <td>
                        {puedeEditar && (
                          <input type="checkbox" aria-label={`Seleccionar ${i.codigo}`} checked={sel.has(i.nomenclador_id)} onChange={() => toggle(i)} />
                        )}
                      </td>
                      <td className={styles.codigo}>
                        <Link to={`/panel/nomenclador/codigos/${i.nomenclador_id}/editar`}>{i.codigo}</Link>
                      </td>
                      <td className={styles.desc}>
                        {i.descripcion_os ?? <span className={base.hintText}>{i.descripcion_colegio ?? "—"}</span>}
                      </td>
                      <td>{quienFactura(i)}</td>
                      <td><EstadoCodigoPill estado={i.estado} /></td>
                      {conDocumentacion && (
                        <td className={i.requiere_documentacion ? styles.docSi : styles.docNo}>
                          {i.requiere_documentacion ? "Sí" : "—"}
                        </td>
                      )}
                      <td className={styles.acciones}>
                        {i.estado === "sin_alta" && puedeEditar && (
                          <button type="button" className={base.btnGhost} onClick={() => { setSel(new Map([[i.nomenclador_id, i]])); setAltaOpen(true); }}>
                            Dar de alta
                          </button>
                        )}
                        {i.estado === "suspendido" && puedeEditar && (
                          <button type="button" className={base.btnGhost} onClick={() => reactivar(i)}>Reactivar</button>
                        )}
                        {(i.estado === "sin_precio" || i.estado === "con_precio") && (
                          <>
                            {puedeEditar && (
                              <button type="button" className={base.btnGhost} onClick={() => setEditando(i.nomenclador_id)} aria-label={`Editar ${i.codigo}`}>
                                <Pencil size={13} /> Editar
                              </button>
                            )}
                            <Link className={i.estado === "sin_precio" ? base.btnPrimary : base.btnGhost} to={`${PRECIOS_PATH}?os=${os}&codigo=${i.codigo}`}>
                              {i.estado === "sin_precio" ? "Cargar precio" : "Precio"}
                            </Link>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            </div>

            {datos && datos.total > PAGE_SIZE && (
              <div className={styles.paginacion}>
                <button type="button" className={base.btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
                <span className={base.hintText}>Página {page} de {totalPaginas} · {datos.total} códigos</span>
                <button type="button" className={base.btnGhost} disabled={page >= totalPaginas} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
              </div>
            )}
          </>
        )}
      </section>

      {os !== null && (
        <AltaModal
          isOpen={altaOpen}
          os={os}
          osNombre={osNombre}
          items={marcados.filter((i) => i.estado === "sin_alta")}
          onClose={() => setAltaOpen(false)}
          onHecho={(n) => {
            setAltaOpen(false);
            setSel(new Map());
            listado.refetch();
            showToast("success", `${n} código${n === 1 ? "" : "s"} dado${n === 1 ? "" : "s"} de alta, sin precio.`);
          }}
        />
      )}
      {os !== null && editando !== null && (
        <EditarAltaModal
          os={os}
          nomencladorId={editando}
          onClose={() => setEditando(null)}
          onGuardado={(msg) => { setEditando(null); listado.refetch(); showToast("success", msg); }}
        />
      )}

      {aConfirmar && (
        <Modal isOpen onClose={() => !ejecutando && setAConfirmar(null)} title={TEXTO_ACCION[aConfirmar.accion]} size="small">
          <div className={styles.modalBody}>
            <p>
              Se aplica a <strong>{aConfirmar.ids.length}</strong> de los <strong>{sel.size}</strong> códigos seleccionados
              {aConfirmar.ids.length < sel.size ? ". Los demás no corresponden a esta acción y no se tocan." : "."}
            </p>
            <div className={styles.modalFooter}>
              <span className={styles.flex1} />
              <button type="button" className={base.btnGhost} onClick={() => setAConfirmar(null)} disabled={ejecutando}>Cancelar</button>
              <button type="button" className={base.btnPrimary} onClick={() => void confirmarAccion()} disabled={ejecutando}>
                {ejecutando ? <><span className={base.spinner} /> Aplicando…</> : "Confirmar"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {resultado && (
        <Modal isOpen onClose={() => setResultado(null)} title={TEXTO_ACCION[resultado.accion]} size="small">
          <div className={styles.modalBody}>
            <p>Se aplicó a <strong>{resultado.aplicados}</strong> código{resultado.aplicados === 1 ? "" : "s"}. No correspondió en:</p>
            <ul className={styles.noAplica}>
              {resultado.resultados.filter((x) => x.estado === "no_aplica").map((x) => (
                <li key={x.nomenclador_id}><strong>{x.codigo}</strong>: {x.motivo}</li>
              ))}
            </ul>
            <div className={styles.modalFooter}>
              <span className={styles.flex1} />
              <button type="button" className={base.btnPrimary} onClick={() => setResultado(null)}>Cerrar</button>
            </div>
          </div>
        </Modal>
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

// ─── Dar de alta (uno o varios) ───────────────────────────────────────────────

function AltaModal({
  isOpen,
  os,
  osNombre,
  items,
  onClose,
  onHecho,
}: {
  isOpen: boolean;
  os: number;
  osNombre: string;
  items: CodigoPorOSItem[];
  onClose: () => void;
  onHecho: (n: number) => void;
}) {
  const [descripciones, setDescripciones] = useState<Record<number, string>>({});
  const [sinRestriccion, setSinRestriccion] = useState<Record<number, boolean>>({});
  const [requiereAut, setRequiereAut] = useState(false);
  const [ayudantes, setAyudantes] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<AltaCodigoResultado[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setDescripciones(Object.fromEntries(items.map((i) => [i.nomenclador_id, i.descripcion_colegio ?? ""])));
    setSinRestriccion(Object.fromEntries(items.map((i) => [i.nomenclador_id, i.plantilla_sin_restriccion])));
    setRequiereAut(false);
    setAyudantes("");
    setErrores([]);
  }, [isOpen, items]);

  const sinQuien = items.filter(
    (i) => !sinRestriccion[i.nomenclador_id] && i.especialidades_plantilla === 0,
  );

  async function confirmar() {
    setGuardando(true);
    setErrores([]);
    try {
      const r = await darDeAltaCodigos({
        items: items.map((i) => ({
          obra_social_nro: os,
          nomenclador_id: i.nomenclador_id,
          descripcion: descripciones[i.nomenclador_id]?.trim() || null,
          sin_restriccion_especialidad: sinRestriccion[i.nomenclador_id] ?? null,
        })),
        requiere_autorizacion: requiereAut,
        cantidad_ayudantes: ayudantes.trim() === "" ? null : Number(ayudantes),
      });
      const fallidos = r.resultados.filter((x) => x.estado === "error");
      if (fallidos.length > 0) {
        setErrores(fallidos);
        return;
      }
      onHecho(r.resultados.filter((x) => x.estado !== "ya_existia").length);
    } catch (e) {
      setErrores([{ obra_social_nro: os, nomenclador_id: 0, codigo: "", estado: "error", motivo: detalleError(e, "No se pudo dar de alta."), sin_quien_factura: false }]);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dar de alta ${items.length} código${items.length === 1 ? "" : "s"} en ${osNombre}`} size="large">
      <div className={styles.modalBody}>
        <p className={base.hintText}>
          No se pide precio. Cada código toma las especialidades de su plantilla del Colegio, salvo
          que lo marques «sin restricción».
        </p>
        <div className={base.formRow2}>
          <label className={styles.check}>
            <input type="checkbox" checked={requiereAut} onChange={(e) => setRequiereAut(e.target.checked)} />
            Requiere autorización de la obra social
          </label>
          <div className={base.formGroup}>
            <label className={base.formLabel} htmlFor="alta-ayud">Cantidad de ayudantes</label>
            <input id="alta-ayud" type="number" min="0" className={base.formInput} value={ayudantes} onChange={(e) => setAyudantes(e.target.value)} placeholder="Vacío = no lleva" />
          </div>
        </div>
        <div className={base.tableWrap}>
          <Tabla className={base.table}>
            <thead><tr><th>Código</th><th>Descripción en la obra social</th><th>Quién factura</th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.nomenclador_id}>
                  <td className={styles.codigo}>{i.codigo}</td>
                  <td>
                    <input
                      className={base.formInput}
                      aria-label={`Descripción de ${i.codigo} en la obra social`}
                      value={descripciones[i.nomenclador_id] ?? ""}
                      onChange={(e) => setDescripciones((p) => ({ ...p, [i.nomenclador_id]: e.target.value }))}
                    />
                  </td>
                  <td>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={!!sinRestriccion[i.nomenclador_id]}
                        onChange={(e) => setSinRestriccion((p) => ({ ...p, [i.nomenclador_id]: e.target.checked }))}
                      />
                      Sin restricción
                    </label>
                    {!sinRestriccion[i.nomenclador_id] && (
                      <span className={i.especialidades_plantilla ? base.hintText : styles.peligro}>
                        {i.especialidades_plantilla ? `${i.especialidades_plantilla} especialidades (plantilla)` : "Nadie"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </div>
        {sinQuien.length > 0 && (
          <p className={styles.aviso}>
            {sinQuien.map((i) => i.codigo).join(", ")} no tiene{sinQuien.length === 1 ? "" : "n"} plantilla de especialidades.
            Se puede dar de alta igual, pero hasta que elijas quién lo factura (con «Editar») ningún médico va a poder cargarlo.
          </p>
        )}
        {errores.length > 0 && (
          <div className={styles.error}>
            {errores.map((e, idx) => <div key={idx}>{e.codigo ? `${e.codigo}: ` : ""}{e.motivo}</div>)}
          </div>
        )}
        <div className={styles.modalFooter}>
          <button type="button" className={base.btnGhost} onClick={onClose}>Cancelar</button>
          <button type="button" className={base.btnPrimary} onClick={confirmar} disabled={guardando || items.length === 0}>
            {guardando ? <><span className={base.spinner} /> Dando de alta…</> : `Dar de alta ${items.length}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Editar el alta (datos del código en la O.S. + quién factura) ─────────────

function EditarAltaModal({
  os,
  nomencladorId,
  onClose,
  onGuardado,
}: {
  os: number;
  nomencladorId: number;
  onClose: () => void;
  onGuardado: (msg: string) => void;
}) {
  const [par, setPar] = useState<CodigoObraSocialOut | null>(null);
  const [form, setForm] = useState({
    descripcion: "", categoria: "", complejidad: "" as Complejidad | "", requiere_autorizacion: false,
    requiere_documentacion: false, cantidad_ayudantes: "", observacion: "", sin_restriccion: false, especialidades: [] as number[],
  });
  const [guardando, setGuardando] = useState(false);
  // Quitar especialidades con precio: qué precios se cerrarían si se confirma.
  const [cierre, setCierre] = useState<PreciosDependientes | null>(null);
  const [error, setError] = useState<string | null>(null);

  const espQuery = useQuery({ queryKey: ["especialidades"], queryFn: getEspecialidades, staleTime: 10 * 60 * 1000 });
  const espOptions = useMemo(
    () =>
      (espQuery.data ?? [])
        .map((e) => ({ value: e.id_colegio_espe, label: e.nombre, hint: String(e.id_colegio_espe) }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [espQuery.data],
  );

  useEffect(() => {
    let vivo = true;
    getCodigoOS(os, nomencladorId)
      .then((p) => {
        if (!vivo) return;
        setPar(p);
        setForm({
          descripcion: p.descripcion ?? "",
          categoria: p.categoria ?? "",
          complejidad: p.complejidad ?? "",
          requiere_autorizacion: !!p.requiere_autorizacion,
          requiere_documentacion: p.requiere_documentacion,
          cantidad_ayudantes: p.cantidad_ayudantes != null ? String(p.cantidad_ayudantes) : "",
          observacion: p.observacion ?? "",
          sin_restriccion: p.sin_restriccion_especialidad,
          especialidades: p.especialidades,
        });
      })
      .catch((e) => vivo && setError(detalleError(e, "No se pudo cargar el código.")));
    return () => {
      vivo = false;
    };
  }, [os, nomencladorId]);

  async function guardar(cerrarPrecios = false) {
    setGuardando(true);
    setError(null);
    try {
      await updateCodigoOS(os, nomencladorId, {
        cerrar_precios: cerrarPrecios,
        descripcion: form.descripcion.trim() || null,
        categoria: form.categoria || null,
        complejidad: form.complejidad || null,
        requiere_autorizacion: form.requiere_autorizacion,
        // Con la obra social sin documentación digital el check no se puede tocar: no se manda.
        ...(par?.documentacion_digital ? { requiere_documentacion: form.requiere_documentacion } : {}),
        cantidad_ayudantes: form.cantidad_ayudantes.trim() === "" ? null : Number(form.cantidad_ayudantes),
        observacion: form.observacion.trim() || null,
        sin_restriccion_especialidad: form.sin_restriccion,
        especialidades: form.sin_restriccion ? undefined : form.especialidades,
      });
      onGuardado(
        cerrarPrecios
          ? "Datos guardados y precios cerrados."
          : "Datos del código en la obra social guardados.",
      );
    } catch (e) {
      const d = (e as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
      const det = d?.data?.detail as PreciosDependientes | undefined;
      if (d?.status === 409 && det && typeof det === "object" && det.tipo === "precios_dependientes") {
        setCierre(det);
      } else {
        setError(detalleError(e, "No se pudo guardar."));
      }
    } finally {
      setGuardando(false);
    }
  }

  async function suspender() {
    setGuardando(true);
    try {
      await cambiarEstadoCodigoOS(os, nomencladorId, "suspender");
      onGuardado("Código suspendido: facturación ya no lo acepta en esta obra social.");
    } catch (e) {
      setError(detalleError(e, "No se pudo suspender."));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={par ? `${par.codigo} en la obra social` : "Código en la obra social"} size="large">
      <div className={styles.modalBody}>
        {!par && !error ? (
          <p className={base.emptyText}>Cargando…</p>
        ) : par && (
          <>
            <div className={styles.cabecera}>
              <EstadoCodigoPill estado={par.estado} />
              <span className={base.hintText}>Del Colegio: {par.descripcion_colegio ?? "—"}</span>
            </div>
            <div className={base.formGroup}>
              <label className={base.formLabel} htmlFor="ed-desc">Descripción en la obra social</label>
              <input id="ed-desc" className={base.formInput} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div className={base.formRow3}>
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="ed-cat">Categoría</label>
                <select id="ed-cat" className={base.formSelect} value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
                  <option value="">— La del Colegio —</option>
                  <option value="Consulta">Consulta</option>
                  <option value="Practica">Práctica</option>
                  <option value="Honorarios individuales">Honorarios individuales</option>
                </select>
              </div>
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="ed-comp">Complejidad</label>
                <select id="ed-comp" className={base.formSelect} value={form.complejidad} onChange={(e) => setForm((f) => ({ ...f, complejidad: e.target.value as Complejidad | "" }))}>
                  <option value="">— La del Colegio —</option>
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                </select>
              </div>
              <div className={base.formGroup}>
                <label className={base.formLabel} htmlFor="ed-ayud">Cantidad de ayudantes</label>
                <input id="ed-ayud" type="number" min="0" className={base.formInput} value={form.cantidad_ayudantes} onChange={(e) => setForm((f) => ({ ...f, cantidad_ayudantes: e.target.value }))} placeholder="Vacío = no lleva" />
              </div>
            </div>
            <label className={styles.check}>
              <input type="checkbox" checked={form.requiere_autorizacion} onChange={(e) => setForm((f) => ({ ...f, requiere_autorizacion: e.target.checked }))} />
              Requiere autorización de la obra social
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={form.requiere_documentacion}
                disabled={!par.documentacion_digital}
                onChange={(e) => setForm((f) => ({ ...f, requiere_documentacion: e.target.checked }))}
              />
              Lleva documentación digital
              {!par.documentacion_digital && (
                <span className={base.hintText}> (la obra social no la tiene habilitada)</span>
              )}
            </label>

            <h3 className={styles.subtitulo}>Quién lo factura en esta obra social</h3>
            <label className={styles.check}>
              <input type="checkbox" checked={form.sin_restriccion} onChange={(e) => setForm((f) => ({ ...f, sin_restriccion: e.target.checked }))} />
              Sin restricción: lo puede facturar cualquier especialidad
            </label>
            {!form.sin_restriccion && (
              <MultiSelectBuscable
                options={espOptions}
                selected={form.especialidades}
                onChange={(v) => setForm((f) => ({ ...f, especialidades: v }))}
                noun="especialidades"
                loading={espQuery.isLoading}
              />
            )}
            <div className={base.formGroup}>
              <label className={base.formLabel} htmlFor="ed-obs">Observación</label>
              <textarea id="ed-obs" className={base.formTextarea} value={form.observacion} onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))} />
            </div>
          </>
        )}
        {error && <div className={styles.error}>{error}</div>}
        {cierre ? (
          <div className={styles.cierre} role="alertdialog" aria-labelledby="cierre-titulo">
            <strong id="cierre-titulo">{cierre.mensaje}</strong>
            <span>
              ¿Querés cerrar {cierre.precios.length === 1 ? "ese precio" : "esos precios"}? {cierre.precios.length === 1 ? "Queda" : "Quedan"} vigente{cierre.precios.length === 1 ? "" : "s"} hasta el {fechaCorta(cierre.cierre)} y se dejan de cotizar.
            </span>
            <ul>
              {cierre.precios.map((p) => (
                <li key={p.id}>{p.especialidad} · vigente desde {fechaCorta(p.vigencia_desde)}</li>
              ))}
            </ul>
            <div className={styles.cierreAcciones}>
              <button type="button" className={base.btnGhost} onClick={() => setCierre(null)} disabled={guardando}>
                Volver
              </button>
              <button
                type="button"
                className={`${base.btnPrimary} ${styles.btnPeligro}`}
                onClick={() => { setCierre(null); void guardar(true); }}
                disabled={guardando}
              >
                Cerrar {cierre.precios.length === 1 ? "precio" : "precios"} y guardar
              </button>
            </div>
          </div>
        ) : (
        <div className={styles.modalFooter}>
          {par && par.estado !== "suspendido" && (
            <button type="button" className={`${base.btnGhost} ${styles.suspender}`} onClick={suspender} disabled={guardando}>
              Suspender en esta obra social
            </button>
          )}
          <span className={styles.flex1} />
          <button type="button" className={base.btnGhost} onClick={onClose}>Cancelar</button>
          <button type="button" className={base.btnPrimary} onClick={() => void guardar()} disabled={guardando || !par}>
            {guardando ? <><span className={base.spinner} /> Guardando…</> : "Guardar"}
          </button>
        </div>
        )}
      </div>
    </Modal>
  );
}
