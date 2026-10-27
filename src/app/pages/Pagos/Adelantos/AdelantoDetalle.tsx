import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRightToLine, Loader2, X } from "lucide-react";
import { delJSON, getJSON, patchJSON, postJSON } from "@/app/shared/lib/http";
import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Dialogo, { DialogoAviso } from "@/app/components/ui/Dialogo/Dialogo";
import AppSearchSelect, { type AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "@/app/pages/Deducciones/api";
import type { MedicoOption } from "@/app/pages/Deducciones/types";
import lq from "../Liquidacion.module.scss";
import s from "./Adelantos.module.scss";
import paleta from "@/app/styles/paleta.module.scss";
import { fmt, mesLabel, nroFacturaMarcado } from "../types";
import {
  ADELANTO_ESTADO_URL,
  ADELANTO_ITEMS_URL,
  ADELANTO_ITEM_URL,
  ADELANTO_PRESTACIONES_URL,
  ADELANTO_URL,
  type Adelanto,
  type PrestacionFactura,
  type PrestacionesPage,
  estadoAdelantoLabel,
  etiquetaEstadoPrestacion,
  fechaCorta,
} from "./utiles";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const PAGE_SIZE = 50;

const ESTADO_TONO: Record<string, string> = { A: "abierto", C: "cerrado", L: "enLiquidacion", AP: "aplicado" };

const CHIP_DE: Record<PrestacionFactura["estado"], string> = {
  disponible: s.chipDisponible,
  en_este: s.chipEste,
  en_otro: s.chipOtro,
  en_pago: s.chipOtro,
  pagada: s.chipPagada,
  sin_medico: s.chipSin,
  sin_importe: s.chipSin,
};

type Transicion = "cerrar" | "reabrir" | "al_pago" | "quitar" | "eliminar";

const TRANSICION: Record<Transicion, { titulo: string; texto: string; peligro?: boolean; boton: string }> = {
  cerrar: {
    titulo: "Cerrar adelanto",
    texto: "¿Cerrar este adelanto? Ya no se podrán agregar ni quitar prestaciones.",
    boton: "Cerrar adelanto",
  },
  reabrir: {
    titulo: "Reabrir adelanto",
    texto: "¿Reabrir este adelanto? Vuelve a estar abierto para cambiar sus prestaciones.",
    boton: "Reabrir",
  },
  al_pago: {
    titulo: "Pasar al pago",
    texto: "¿Pasar este adelanto al pago abierto? Sus prestaciones se pagan en ese pago, con sus deducciones.",
    boton: "Pasar al pago",
  },
  quitar: {
    titulo: "Quitar del pago",
    texto: "¿Quitar este adelanto del pago? Vuelve a estar cerrado.",
    peligro: true,
    boton: "Quitar del pago",
  },
  eliminar: {
    titulo: "Eliminar adelanto",
    texto: "¿Eliminar este adelanto? Sus prestaciones quedan libres. No se puede deshacer.",
    peligro: true,
    boton: "Eliminar",
  },
};

const mensajeDe = (e: any, porDefecto: string) => {
  const detail = e?.response?.data?.detail;
  return typeof detail === "string" ? detail : (e?.message ?? porDefecto);
};

type Marcada = { importe: number; medicoId: number | null };

const AdelantoDetalle: React.FC = () => {
  const { adelantoId } = useParams();
  const id = Number(adelantoId);
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [adelanto, setAdelanto] = useState<Adelanto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  // Prestaciones de la factura
  const [pagina, setPagina] = useState<PrestacionesPage | null>(null);
  const [page, setPage] = useState(1);
  const [cargandoPagina, setCargandoPagina] = useState(false);
  const [q, setQ] = useState("");
  const [qAplicada, setQAplicada] = useState("");
  const [medicoId, setMedicoId] = useState<number | null>(null);
  const [soloDisponibles, setSoloDisponibles] = useState(true);
  const [medicos, setMedicos] = useState<MedicoOption[]>([]);
  const [medicosLoading, setMedicosLoading] = useState(false);

  // Selección: persiste al cambiar de página y de filtro.
  const [marcadas, setMarcadas] = useState<Map<number, Marcada>>(new Map());
  const [agregando, setAgregando] = useState(false);

  const [transicion, setTransicion] = useState<Transicion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [quitandoId, setQuitandoId] = useState<number | null>(null);

  const abierto = adelanto?.estado === "A";

  // ── Carga ─────────────────────────────────────────────────────────────────
  const cargarAdelanto = useCallback(async () => {
    try {
      setAdelanto(await getJSON<Adelanto>(ADELANTO_URL(id)));
      setError(null);
    } catch (e: any) {
      setError(mensajeDe(e, "No se pudo cargar el adelanto."));
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    void cargarAdelanto();
  }, [cargarAdelanto]);

  const pedido = useRef(0);
  const cargarPrestaciones = useCallback(async () => {
    const mio = ++pedido.current;
    setCargandoPagina(true);
    try {
      const params: Record<string, string | number | boolean> = { page, size: PAGE_SIZE, solo_disponibles: soloDisponibles };
      if (qAplicada) params.q = qAplicada;
      if (medicoId) params.medico_id = medicoId;
      const data = await getJSON<PrestacionesPage>(ADELANTO_PRESTACIONES_URL(id), params);
      if (mio === pedido.current) setPagina(data);
    } catch (e: any) {
      if (mio === pedido.current) notify(mensajeDe(e, "No se pudieron cargar las prestaciones."), "error");
    } finally {
      if (mio === pedido.current) setCargandoPagina(false);
    }
  }, [id, page, qAplicada, medicoId, soloDisponibles, notify]);

  useEffect(() => {
    if (abierto) void cargarPrestaciones();
  }, [abierto, cargarPrestaciones]);

  // La búsqueda por texto espera a que se termine de tipear.
  useEffect(() => {
    const t = setTimeout(() => {
      setQAplicada(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const ultimaBusqueda = useRef(0);
  const searchMedicos = async (query: string) => {
    const mia = ++ultimaBusqueda.current;
    setMedicosLoading(true);
    try {
      const rows = await fetchMedicos(query);
      if (mia === ultimaBusqueda.current) setMedicos(rows);
    } finally {
      if (mia === ultimaBusqueda.current) setMedicosLoading(false);
    }
  };
  useEffect(() => { void searchMedicos(""); }, []);

  const opcionesMedico = useMemo<AppSearchSelectOption[]>(
    () => medicos.map((m) => ({ id: m.id, label: m.nombre, subtitle: m.nro_socio ? `#${m.nro_socio}` : undefined })),
    [medicos],
  );

  // ── Selección ─────────────────────────────────────────────────────────────
  const alternar = (p: PrestacionFactura) => {
    setMarcadas((prev) => {
      const sig = new Map(prev);
      if (sig.has(p.id)) sig.delete(p.id);
      else sig.set(p.id, { importe: Number(p.importe_total), medicoId: p.medico_id });
      return sig;
    });
  };

  const disponiblesDeLaPagina = (pagina?.items ?? []).filter((p) => p.estado === "disponible");
  const todasMarcadas = disponiblesDeLaPagina.length > 0 && disponiblesDeLaPagina.every((p) => marcadas.has(p.id));
  const algunaMarcada = disponiblesDeLaPagina.some((p) => marcadas.has(p.id));
  const alternarTodas = () => {
    setMarcadas((prev) => {
      const sig = new Map(prev);
      if (todasMarcadas) disponiblesDeLaPagina.forEach((p) => sig.delete(p.id));
      else disponiblesDeLaPagina.forEach((p) => sig.set(p.id, { importe: Number(p.importe_total), medicoId: p.medico_id }));
      return sig;
    });
  };

  const totalMarcado = useMemo(() => [...marcadas.values()].reduce((acc, m) => acc + m.importe, 0), [marcadas]);
  const medicosMarcados = useMemo(() => new Set([...marcadas.values()].map((m) => m.medicoId)).size, [marcadas]);

  const agregar = async () => {
    if (marcadas.size === 0) return;
    setAgregando(true);
    try {
      const r = await postJSON<{ agregadas: number; rechazadas: { id: number; motivo: string }[] }>(
        ADELANTO_ITEMS_URL(id),
        { detalle_ids: [...marcadas.keys()] },
      );
      if (r.agregadas) notify(`${r.agregadas} prestación${r.agregadas !== 1 ? "es agregadas" : " agregada"} al adelanto.`);
      if (r.rechazadas.length) {
        const ejemplos = r.rechazadas.slice(0, 3).map((x) => `#${x.id}: ${x.motivo}`).join("; ");
        notify(
          `${r.rechazadas.length} no se pudo${r.rechazadas.length !== 1 ? "ieron" : ""} agregar (${ejemplos}${r.rechazadas.length > 3 ? "…" : ""}).`,
          "error",
        );
      }
      setMarcadas(new Map());
      await Promise.all([cargarAdelanto(), cargarPrestaciones()]);
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudieron agregar las prestaciones."), "error");
    } finally {
      setAgregando(false);
    }
  };

  const quitar = async (itemId: number) => {
    setQuitandoId(itemId);
    try {
      await delJSON(ADELANTO_ITEM_URL(id, itemId));
      await Promise.all([cargarAdelanto(), cargarPrestaciones()]);
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo quitar la prestación."), "error");
    } finally {
      setQuitandoId(null);
    }
  };

  // ── Cambios de estado ─────────────────────────────────────────────────────
  const confirmarTransicion = async () => {
    if (!transicion) return;
    setProcesando(true);
    try {
      if (transicion === "eliminar") {
        await delJSON(ADELANTO_URL(id));
        notify("Adelanto eliminado.");
        navigate("/panel/adelantos");
        return;
      }
      const estado = { cerrar: "C", reabrir: "A", al_pago: "L", quitar: "C" }[transicion];
      setAdelanto(await patchJSON<Adelanto>(ADELANTO_ESTADO_URL(id), { estado }));
      notify(
        {
          cerrar: "Adelanto cerrado.",
          reabrir: "Adelanto reabierto.",
          al_pago: "Adelanto pasado al pago abierto.",
          quitar: "Adelanto quitado del pago.",
        }[transicion],
      );
      setTransicion(null);
    } catch (e: any) {
      notify(mensajeDe(e, "No se pudo completar la acción."), "error");
      setTransicion(null);
    } finally {
      setProcesando(false);
    }
  };

  const lastPage = Math.max(1, Math.ceil((pagina?.total ?? 0) / PAGE_SIZE));
  const periodo = adelanto ? `${mesLabel(adelanto.mes_periodo)} ${adelanto.anio_periodo}` : "";

  return (
    <div className={lq.pagina}>
      <Franja titulo={`Adelanto ${adelantoId}`} icono={ArrowRightToLine} lateral={<span className={lq.franjaDato}>{periodo}</span>} />
      <BackButton label="Volver" to="/panel/adelantos" />

      {error && <div className={lq.error} role="alert">{error}</div>}
      {cargando && !adelanto && (
        <div className={lq.cargando}>
          <Loader2 size={18} className={lq.gira} aria-hidden="true" /> Cargando adelanto…
        </div>
      )}

      {adelanto && (
        <>
          <div className={lq.tira}>
            <span className={`${lq.estado} ${lq[ESTADO_TONO[adelanto.estado] ?? "cerrado"]}`}>
              {estadoAdelantoLabel(adelanto.estado)}
            </span>
            <div className={lq.tiraDato}>
              <span>Obra social</span>
              <b>
                #{adelanto.obra_social_id} · {adelanto.obra_social_nombre} · Factura{" "}
                {nroFacturaMarcado(adelanto.nro_factura, adelanto.factura_version)}
              </b>
            </div>
            <div className={lq.tiraDato}>
              <span>Adelantado</span>
              <b>${fmt(adelanto.importe)}</b>
            </div>
            {adelanto.observacion && <span className={lq.tiraTexto}>{adelanto.observacion}</span>}
            {adelanto.pago_id && (
              <div className={lq.tiraDato}>
                <span>Pago</span>
                <b>#{adelanto.pago_id}</b>
              </div>
            )}
            {adelanto.estado === "C" && !adelanto.pago_abierto_id && (
              <span className={lq.tiraTexto}>No hay un pago abierto al que pasarlo.</span>
            )}
            <div className={`${lq.tiraAccion} ${lq.acciones}`}>
              {adelanto.estado === "A" && (
                <>
                  <Button variant="danger" size="md" onClick={() => setTransicion("eliminar")}>
                    Eliminar adelanto
                  </Button>
                  <Button variant="primary" size="md" disabled={adelanto.prestaciones === 0} onClick={() => setTransicion("cerrar")}>
                    Cerrar adelanto
                  </Button>
                </>
              )}
              {adelanto.estado === "C" && (
                <>
                  <Button variant="ghost" size="md" onClick={() => setTransicion("reabrir")}>
                    Reabrir
                  </Button>
                  <Button variant="primary" size="md" disabled={!adelanto.pago_abierto_id} onClick={() => setTransicion("al_pago")}>
                    Pasar al pago
                  </Button>
                </>
              )}
              {adelanto.estado === "L" && (
                <Button variant="danger" size="md" onClick={() => setTransicion("quitar")}>
                  Quitar del pago
                </Button>
              )}
            </div>
          </div>

          <section className={s.seccion} aria-labelledby="adel-en">
            <div className={s.seccionCabeza}>
              <h2 id="adel-en">En este adelanto</h2>
              <span>
                <b>{adelanto.prestaciones} prestación{adelanto.prestaciones !== 1 ? "es" : ""}</b> · {adelanto.medicos} médico
                {adelanto.medicos !== 1 ? "s" : ""} · <b>${fmt(adelanto.importe)}</b>
              </span>
            </div>
            <div className={s.tablaCaja}>
              {adelanto.items.length === 0 ? (
                <div className={s.vacio}>
                  {abierto ? "Todavía no hay prestaciones. Elegilas en la lista de abajo." : "Este adelanto no tiene prestaciones."}
                </div>
              ) : (
                <Tabla>
                  <thead>
                    <tr>
                      <th>Prestación</th>
                      <th>Código</th>
                      <th>Médico</th>
                      <th>Función</th>
                      <th>Honorarios</th>
                      <th>Importe</th>
                      {abierto && <th aria-label="Quitar" />}
                    </tr>
                  </thead>
                  <tbody>
                    {adelanto.items.map((it) => (
                      <tr key={it.id}>
                        <td>
                          <span className={lq.mono}>#{it.detalle_id}</span>
                          <br />
                          <small className={lq.tenue}>{fechaCorta(it.fecha_practica)}</small>
                        </td>
                        <td>
                          <span className={lq.mono}>{it.codigo ?? "—"}</span>
                          {it.descripcion && (
                            <>
                              <br />
                              <small className={lq.tenue}>{it.descripcion}</small>
                            </>
                          )}
                        </td>
                        <td>{it.medico_nombre ?? "—"}</td>
                        <td>{it.funcion ?? "—"}</td>
                        <td className={s.monto}>${fmt(it.honorarios)}</td>
                        <td className={s.monto}>${fmt(it.importe_total)}</td>
                        {abierto && (
                          <td>
                            {quitandoId === it.id ? (
                              <Loader2 size={16} className={lq.gira} aria-label="Quitando" />
                            ) : (
                              <BotonPlano
                                type="button"
                                className={lq.botonIconoPeligro}
                                title="Quitar del adelanto"
                                aria-label={`Quitar la prestación ${it.detalle_id} del adelanto`}
                                onClick={() => void quitar(it.id)}
                              >
                                <X size={16} />
                              </BotonPlano>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              )}
            </div>
          </section>

          {abierto && (
            <section className={s.seccion} aria-labelledby="adel-fac">
              <div className={s.seccionCabeza}>
                <h2 id="adel-fac">Prestaciones de la factura</h2>
                {pagina && (
                  <span>
                    {pagina.disponibles.toLocaleString("es-AR")} disponibles de {pagina.total_factura.toLocaleString("es-AR")}
                  </span>
                )}
              </div>

              <div className={s.filtrosPrestaciones}>
                <label className={`${lq.campo} ${s.buscar}`}>
                  <span className={lq.rotulo}>Buscar</span>
                  <input
                    className={lq.input}
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="N° de prestación, orden, código o afiliado"
                  />
                </label>
                <div className={`${lq.campo} ${s.medico}`}>
                  <span className={lq.rotulo}>Médico</span>
                  <AppSearchSelect
                    options={opcionesMedico}
                    value={medicoId}
                    onChange={(v) => {
                      setMedicoId(v ? Number(v) : null);
                      setPage(1);
                    }}
                    onQueryChange={searchMedicos}
                    loading={medicosLoading}
                  />
                </div>
                <label className={s.soloDisponibles}>
                  <input
                    type="checkbox"
                    checked={soloDisponibles}
                    onChange={(e) => {
                      setSoloDisponibles(e.target.checked);
                      setPage(1);
                    }}
                  />
                  Solo disponibles
                </label>
              </div>

              <div className={s.tablaCaja} style={cargandoPagina && pagina ? { opacity: 0.55 } : undefined}>
                {!pagina ? (
                  <div className={lq.cargando}>
                    <Loader2 size={18} className={lq.gira} aria-hidden="true" /> Cargando prestaciones…
                  </div>
                ) : pagina.items.length === 0 ? (
                  <div className={s.vacio}>Sin prestaciones para los filtros actuales.</div>
                ) : (
                  <Tabla>
                    <thead>
                      <tr>
                        <th className={s.celdaCheck}>
                          <input
                            type="checkbox"
                            checked={todasMarcadas}
                            disabled={disponiblesDeLaPagina.length === 0}
                            ref={(el) => { if (el) el.indeterminate = algunaMarcada && !todasMarcadas; }}
                            onChange={alternarTodas}
                            aria-label="Elegir o soltar las prestaciones disponibles de esta página"
                          />
                        </th>
                        <th>Prestación</th>
                        <th>Código</th>
                        <th>Médico</th>
                        <th>Función</th>
                        <th>Equipo</th>
                        <th>Importe</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagina.items.map((p) => {
                        const libre = p.estado === "disponible";
                        const marcada = marcadas.has(p.id);
                        return (
                          <tr key={p.id} className={`${marcada ? s.filaSeleccionada : ""} ${libre ? "" : s.filaBloqueada}`}>
                            <td className={s.celdaCheck}>
                              <input
                                type="checkbox"
                                checked={marcada}
                                disabled={!libre}
                                onChange={() => alternar(p)}
                                aria-label={`Elegir la prestación ${p.id}`}
                              />
                            </td>
                            <td>
                              <span className={lq.mono}>#{p.id}</span>
                              <br />
                              <small className={lq.tenue}>{fechaCorta(p.fecha_practica)}</small>
                            </td>
                            <td>
                              <span className={lq.mono}>{p.codigo ?? "—"}</span>
                              {p.descripcion && (
                                <>
                                  <br />
                                  <small className={lq.tenue}>{p.descripcion}</small>
                                </>
                              )}
                            </td>
                            <td>
                              {p.medico_nombre ?? <span className={lq.tenue}>—</span>}
                              {p.medico_nro_socio ? (
                                <>
                                  <br />
                                  <small className={lq.tenue}>Socio {p.medico_nro_socio}</small>
                                </>
                              ) : null}
                            </td>
                            <td>{p.funcion ?? "—"}</td>
                            <td>{p.equipo ?? <span className={lq.tenue}>—</span>}</td>
                            <td className={s.monto}>${fmt(p.importe_total)}</td>
                            <td>
                              <span className={`${s.chip} ${CHIP_DE[p.estado]}`}>{etiquetaEstadoPrestacion(p)}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Tabla>
                )}
              </div>

              {pagina && pagina.total > 0 && (
                <div className={s.pie}>
                  <span>
                    {((page - 1) * PAGE_SIZE + 1).toLocaleString("es-AR")}–{Math.min(page * PAGE_SIZE, pagina.total).toLocaleString("es-AR")} de{" "}
                    {pagina.total.toLocaleString("es-AR")}
                  </span>
                  <nav className={s.pieNav} aria-label="Paginación">
                    <BotonPlano type="button" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || cargandoPagina}>← Anterior</BotonPlano>
                    <span>Página {page} de {lastPage.toLocaleString("es-AR")}</span>
                    <BotonPlano type="button" onClick={() => setPage((p) => p + 1)} disabled={page >= lastPage || cargandoPagina}>Siguiente →</BotonPlano>
                  </nav>
                </div>
              )}

              {marcadas.size > 0 && (
                <div className={s.barraSeleccion} role="region" aria-label="Prestaciones elegidas">
                  <span>
                    <b>{marcadas.size} elegida{marcadas.size !== 1 ? "s" : ""}</b> · <b>${fmt(totalMarcado)}</b> · {medicosMarcados} médico
                    {medicosMarcados !== 1 ? "s" : ""}
                  </span>
                  <span className={s.barraAcciones}>
                    {/* El ghost lleva texto oscuro: sobre la barra azul no se lee, se pasa a blanco. */}
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setMarcadas(new Map())}
                      disabled={agregando}
                      sx={{
                        color: paleta.white,
                        borderColor: "rgba(255,255,255,0.65)",
                        "&:hover": { backgroundColor: "rgba(255,255,255,0.14)", borderColor: paleta.white },
                      }}
                    >
                      Limpiar
                    </Button>
                    <Button variant="secondary" size="md" onClick={() => void agregar()} disabled={agregando}>
                      {agregando ? "Agregando…" : "Agregar al adelanto"}
                    </Button>
                  </span>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {transicion && (
        <Dialogo
          titulo={TRANSICION[transicion].titulo}
          peligro={TRANSICION[transicion].peligro}
          onClose={procesando ? undefined : () => setTransicion(null)}
          acciones={
            <>
              <Button variant="ghost" onClick={() => setTransicion(null)} disabled={procesando}>
                Cancelar
              </Button>
              <Button
                variant={TRANSICION[transicion].peligro ? "danger" : "primary"}
                onClick={() => void confirmarTransicion()}
                disabled={procesando}
              >
                {procesando ? "Procesando…" : TRANSICION[transicion].boton}
              </Button>
            </>
          }
        >
          <p>{TRANSICION[transicion].texto}</p>
          {transicion === "al_pago" && adelanto && (
            <DialogoAviso>
              Se paga a {adelanto.medicos} médico{adelanto.medicos !== 1 ? "s" : ""} por ${fmt(adelanto.importe)}. Los porcentuales
              (contribuciones) se descuentan de ese importe, como en cualquier pago.
            </DialogoAviso>
          )}
        </Dialogo>
      )}
    </div>
  );
};

export default AdelantoDetalle;
