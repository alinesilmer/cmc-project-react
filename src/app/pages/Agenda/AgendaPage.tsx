import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useNotify } from "../../hooks/useNotify";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { usePermisos } from "../../auth/usePermisos";
import ResponsableSelect from "./ResponsableSelect";
import {
  createEvento,
  deleteEvento,
  getMes,
  listEventos,
  listResponsables,
  updateEvento,
} from "./agenda.api";
import {
  colorDe,
  DIAS_SEMANA,
  MESES,
  TIPOS,
  describirCuando,
  diasEnMes,
  offsetPrimerDia,
  type EventoAgenda,
  type EventoInput,
  type OcurrenciaAgenda,
  type Recurrencia,
  type Responsable,
  type TipoEvento,
} from "./agenda.types";
import { fijosDelMes, fijosSinRepetir } from "./diasFijos";
import s from "./Agenda.module.scss";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Franja from "@/app/components/layout/Franja/Franja";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import Button from "@/app/components/ui/Button/Button";
import BotonAccion from "@/app/components/ui/BotonAccion/BotonAccion";

const AGENDA_KEY = ["agenda"] as const;
const SIN_RESPONSABLES: Responsable[] = [];
const SIN_OCURRENCIAS: OcurrenciaAgenda[] = [];
const SIN_EVENTOS: EventoAgenda[] = [];
const POR_PAGINA = 10;

/** Recurrencia por defecto de cada calendario. Igual que el backend. */
const RECURRENCIA_POR_TIPO: Record<TipoEvento, Recurrencia> = {
  feriado: "unica",
  cumpleanos: "anual",
  tarea: "mensual",
};

const RECURRENCIAS: { valor: Recurrencia; label: string }[] = [
  { valor: "unica", label: "Una vez" },
  { valor: "anual", label: "Cada año" },
  { valor: "mensual", label: "Cada mes" },
];

function eventoVacio(tipo: TipoEvento): EventoInput {
  return {
    tipo,
    titulo: "",
    descripcion: "",
    recurrencia: RECURRENCIA_POR_TIPO[tipo],
    fecha: null,
    dia: null,
    mes: null,
    medico_id: null,
    responsable: "",
    color: null,
    activo: true,
  };
}

/** El texto del botón de alta de cada calendario. */
const NUEVO: Record<TipoEvento, string> = {
  feriado: "Nuevo feriado",
  cumpleanos: "Nuevo cumpleaños",
  tarea: "Nueva tarea",
};

/** El sello de fecha de cada fila: el día en grande y debajo el mes (o «C/MES» si se repite todos los meses). */
function chipFecha(e: EventoAgenda): { dia: string; mes: string } {
  const abreviado = (m: number) => MESES[m - 1].slice(0, 3).toUpperCase();
  if (e.recurrencia === "unica" && e.fecha) {
    const [, m, d] = e.fecha.split("-");
    return { dia: String(Number(d)), mes: abreviado(Number(m)) };
  }
  if (e.recurrencia === "anual" && e.dia && e.mes) return { dia: String(e.dia), mes: abreviado(e.mes) };
  if (e.recurrencia === "mensual" && e.dia) return { dia: String(e.dia), mes: "C/MES" };
  return { dia: "—", mes: "" };
}

/** Hoy, en componentes locales — nunca `toISOString()`, que adelanta el día. */
function hoyPartes() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

/** Los tres calendarios del Colegio: feriados, cumpleaños y tareas del mes. */
export default function AgendaPage() {
  const { error: avisarError, success: avisarOk } = useNotify();
  const { can } = usePermisos();
  const puedeEditar = can("catalogo:editar");

  const hoy = useMemo(hoyPartes, []);
  const [anio, setAnio] = useState(hoy.anio);
  const [mes, setMes] = useState(hoy.mes);

  /** El calendario que se está administrando abajo. */
  const [tipo, setTipo] = useState<TipoEvento>("feriado");
  /** Filtro del almanaque: `null` = los tres juntos. */
  const [filtro, setFiltro] = useState<TipoEvento | null>(null);

  const queryClient = useQueryClient();

  const [editando, setEditando] = useState<{ id?: number; body: EventoInput } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // El personal del Colegio para el selector de responsable.
  const consultaResp = useQuery({
    queryKey: [...AGENDA_KEY, "responsables"],
    queryFn: listResponsables,
    staleTime: 30 * 60 * 1000,
  });
  const responsables = consultaResp.data ?? SIN_RESPONSABLES;
  const cargandoResp = consultaResp.isPending;

  // El almanaque y la lista de abajo son dos consultas independientes y se cargan por separado a propósito.
  const consultaMes = useQuery({
    queryKey: [...AGENDA_KEY, "mes", anio, mes],
    queryFn: () => getMes(anio, mes),
    placeholderData: (prev) => prev,
  });
  const ocurrencias = consultaMes.data ?? SIN_OCURRENCIAS;
  const cargandoMes = consultaMes.isPending || consultaMes.isPlaceholderData;

  const consultaLista = useQuery({
    queryKey: [...AGENDA_KEY, "eventos", tipo],
    queryFn: () => listEventos({ tipo }),
  });
  const cargados = consultaLista.data ?? SIN_EVENTOS;
  const cargandoLista = consultaLista.isPending;
  const eventos = useMemo(
    () => [...cargados, ...fijosSinRepetir(cargados, tipo)],
    [cargados, tipo]
  );

  const [pagina, setPagina] = useState(1);
  const totalPaginas = Math.max(1, Math.ceil(eventos.length / POR_PAGINA));
  // Si se borra el último de la página, se vuelve a la anterior en vez de quedar vacía.
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = eventos.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);

  useEffect(() => {
    if (consultaMes.isError) avisarError("No se pudo cargar el calendario.");
  }, [consultaMes.isError, avisarError]);

  useEffect(() => {
    if (consultaLista.isError) avisarError("No se pudieron cargar los eventos.");
  }, [consultaLista.isError, avisarError]);

  /** Tras crear, editar o borrar hay que refrescar las dos: la fila cambió y su ocurrencia en el almanaque también. */
  const cargar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [...AGENDA_KEY, "mes"] }),
      queryClient.invalidateQueries({ queryKey: [...AGENDA_KEY, "eventos"] }),
    ]);

  const irA = (delta: number) => {
    const m = mes + delta;
    if (m < 1) { setMes(12); setAnio(anio - 1); }
    else if (m > 12) { setMes(1); setAnio(anio + 1); }
    else setMes(m);
  };

  /** Las ocurrencias agrupadas por día del mes, para pintar la grilla. */
  /** Todo lo del mes elegido, de los tres calendarios; las cuentas de cada solapa salen de acá. */
  const delMes = useMemo(
    () => [...ocurrencias, ...fijosDelMes(anio, mes, ocurrencias, null)],
    [ocurrencias, anio, mes]
  );

  const conteoMes = useMemo(() => {
    const cuenta: Record<TipoEvento, number> = { feriado: 0, cumpleanos: 0, tarea: 0 };
    for (const o of delMes) cuenta[o.tipo] += 1;
    return cuenta;
  }, [delMes]);

  const porDia = useMemo(() => {
    const mapa = new Map<number, OcurrenciaAgenda[]>();
    for (const o of delMes) {
      if (filtro && o.tipo !== filtro) continue;
      const d = Number(o.ocurre_el.slice(8, 10));
      mapa.set(d, [...(mapa.get(d) ?? []), o]);
    }
    return mapa;
  }, [delMes, filtro]);

  const celdas = useMemo(() => {
    const offset = offsetPrimerDia(anio, mes);
    const total = diasEnMes(anio, mes);
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: total }, (_, i) => i + 1),
    ];
  }, [anio, mes]);

  // ── Alta y edición ─────────────────────────────────────────────────────────

  const guardar = async () => {
    if (!editando || guardando) return;
    const { id, body } = editando;
    if (!body.titulo.trim()) return;

    setGuardando(true);
    try {
      await (id ? updateEvento(id, body) : createEvento(body));
      setEditando(null);
      await cargar();
      avisarOk(id ? "Evento actualizado." : "Evento agregado.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo guardar el evento."));
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (e: EventoAgenda) => {
    try {
      await deleteEvento(e.id);
      await cargar();
      avisarOk("Evento eliminado.");
    } catch (err) {
      avisarError(mensajeDeError(err, "No se pudo eliminar el evento."));
    }
  };

  const cambiar = (parche: Partial<EventoInput>) =>
    setEditando((prev) => (prev ? { ...prev, body: { ...prev.body, ...parche } } : prev));

  /** Al cambiar la recurrencia se limpian los campos que dejan de aplicar. */
  const cambiarRecurrencia = (recurrencia: Recurrencia) =>
    cambiar({
      recurrencia,
      fecha: recurrencia === "unica" ? editando?.body.fecha ?? null : null,
      dia: recurrencia === "unica" ? null : editando?.body.dia ?? null,
      mes: recurrencia === "anual" ? editando?.body.mes ?? null : null,
    });

  const esHoy = (d: number) => anio === hoy.anio && mes === hoy.mes && d === hoy.dia;
  const irAHoy = () => {
    setAnio(hoy.anio);
    setMes(hoy.mes);
  };

  const totalMes = useMemo(() => [...porDia.values()].reduce((n, evs) => n + evs.length, 0), [porDia]);
  const etiquetaTipo = TIPOS.find((t) => t.valor === tipo)?.label.toLowerCase();

  return (
    <>
      <Franja suelta titulo="Calendario" icono={CalendarDays} />
      <div className={s.container}>
        {/* ── Almanaque ── */}
        <section className={s.almanaque}>
          <div className={s.calHead}>
            <div className={s.calTitulo}>
              <h2>
                {MESES[mes - 1]}
                <em>.</em>
              </h2>
              <p>
                {anio} · {totalMes} {totalMes === 1 ? "evento" : "eventos"}
              </p>
            </div>

            <div className={s.leyenda} role="group" aria-label="Calendarios">
              {TIPOS.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  className={`${s.leyendaItem} ${filtro === t.valor ? s.leyendaOn : ""}`}
                  style={{ "--c": t.color } as CSSProperties}
                  aria-pressed={filtro === t.valor}
                  onClick={() => setFiltro(filtro === t.valor ? null : t.valor)}
                >
                  <i className={s.cuadro} />
                  {t.label}
                </button>
              ))}
            </div>

            <div className={s.mandos}>
              <button type="button" className={s.navBtn} aria-label="Mes anterior" onClick={() => irA(-1)}>
                <ChevronLeft size={18} />
              </button>
              <button type="button" className={s.hoyBtn} onClick={irAHoy}>
                Hoy
              </button>
              <button type="button" className={s.navBtn} aria-label="Mes siguiente" onClick={() => irA(1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className={s.semana}>
            {DIAS_SEMANA.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>

          <div className={s.grid}>
            {celdas.map((d, i) => {
              if (d === null) return <div key={`v${i}`} className={s.celdaVacia} />;
              const evs = porDia.get(d) ?? [];
              const clases = [
                s.celda,
                evs.length ? s.celdaCon : "",
                esHoy(d) ? s.celdaHoy : "",
                i % 7 >= 5 ? s.celdaLibre : "",
              ].join(" ");
              return (
                <div
                  key={d}
                  className={clases}
                  style={evs[0] ? ({ "--c": colorDe(evs[0]) } as CSSProperties) : undefined}
                >
                  <span className={s.celdaNum}>{d}</span>
                  {evs.slice(0, 2).map((o) => (
                    <span
                      key={`${o.id}-${o.ocurre_el}`}
                      className={s.celdaTitulo}
                      title={o.responsable ? `${o.titulo} — ${o.responsable}` : o.titulo}
                    >
                      {o.titulo}
                    </span>
                  ))}
                  {evs.length > 2 && (
                    <span className={s.celdaMas} title={evs.slice(2).map((o) => o.titulo).join(", ")}>
                      +{evs.length - 2} más
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {cargandoMes && (
            <div className={s.loading}>
              <Cargando size={15} /> Cargando…
            </div>
          )}
        </section>

        {/* ── Administración del calendario elegido ── */}
        <section className={s.admin}>
          <div className={s.adminCab}>
            <h2>Administrar</h2>
            {puedeEditar && (
              <Button
                variant="secondary"
                leftIcon={<Plus size={16} aria-hidden="true" />}
                onClick={() => setEditando({ body: eventoVacio(tipo) })}
              >
                {NUEVO[tipo]}
              </Button>
            )}
          </div>

          <div className={s.solapas} role="tablist">
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="tab"
                aria-selected={tipo === t.valor}
                className={`${s.solapa} ${tipo === t.valor ? s.solapaOn : ""}`}
                style={{ "--c": t.color } as CSSProperties}
                onClick={() => {
                  setTipo(t.valor);
                  setPagina(1);
                  setEditando(null);
                }}
              >
                <i className={s.dot} />
                {t.label}
                <small>{conteoMes[t.valor]}</small>
              </button>
            ))}
          </div>

          {editando && (
            <div className={s.form}>
              <label className={s.field}>
                <span className={s.label}>Título</span>
                <input
                  className={s.input}
                  autoFocus
                  value={editando.body.titulo}
                  onChange={(e) => cambiar({ titulo: e.target.value })}
                />
              </label>

              <label className={s.field}>
                <span className={s.label}>Se repite</span>
                <select
                  className={s.input}
                  value={editando.body.recurrencia}
                  onChange={(e) => cambiarRecurrencia(e.target.value as Recurrencia)}
                >
                  {RECURRENCIAS.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>

              {editando.body.recurrencia === "unica" ? (
                <label className={s.field}>
                  <span className={s.label}>Fecha</span>
                  <CampoFecha
                    value={editando.body.fecha ?? ""}
                    onChange={(valor) => cambiar({ fecha: valor || null })}
                  />
                </label>
              ) : (
                <>
                  <label className={s.field}>
                    <span className={s.label}>Día</span>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className={s.input}
                      value={editando.body.dia ?? ""}
                      onChange={(e) =>
                        cambiar({ dia: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </label>
                  {editando.body.recurrencia === "anual" && (
                    <label className={s.field}>
                      <span className={s.label}>Mes</span>
                      <select
                        className={s.input}
                        value={editando.body.mes ?? ""}
                        onChange={(e) =>
                          cambiar({ mes: e.target.value ? Number(e.target.value) : null })
                        }
                      >
                        <option value="">—</option>
                        {MESES.map((m, i) => (
                          <option key={m} value={i + 1}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              {tipo === "tarea" && (
                <label className={s.field}>
                  <span className={s.label}>Responsable</span>
                  <ResponsableSelect
                    value={editando.body.responsable ?? ""}
                    onChange={(responsable) => cambiar({ responsable })}
                    opciones={responsables}
                    cargando={cargandoResp}
                  />
                </label>
              )}

              <label className={`${s.field} ${s.fieldFull}`}>
                <span className={s.label}>Descripción</span>
                <input
                  className={s.input}
                  value={editando.body.descripcion ?? ""}
                  onChange={(e) => cambiar({ descripcion: e.target.value })}
                />
              </label>

              <div className={s.formActions}>
                <button type="button" className={s.ghostBtn} onClick={() => setEditando(null)}>
                  <X size={15} /> Cancelar
                </button>
                <button
                  type="button"
                  className={s.primaryBtn}
                  onClick={guardar}
                  disabled={!editando.body.titulo.trim() || guardando}
                >
                  {guardando ? <Cargando size={15} /> : <Save size={15} />}
                  Guardar
                </button>
              </div>
            </div>
          )}

          <ul className={s.list}>
            {visibles.map((e) => {
              const chip = chipFecha(e);
              return (
                <li key={e.id} className={`${s.row} ${!e.activo ? s.rowInactivo : ""}`}>
                  <div className={s.fecha}>
                    <b>{chip.dia}</b>
                    <small>{chip.mes}</small>
                  </div>
                  <div className={s.rowMain}>
                    <span className={s.rowTitulo}>{e.titulo}</span>
                    <span className={s.rowCuando}>
                      {describirCuando(e)}
                      {e.responsable ? ` · ${e.responsable}` : ""}
                      {e.descripcion ? ` · ${e.descripcion}` : ""}
                    </span>
                  </div>
                  {puedeEditar && e.id > 0 && (
                    <div className={s.rowActions}>
                      <BotonAccion
                        icono={Pencil}
                        etiqueta="Editar"
                        onClick={() =>
                          setEditando({
                            id: e.id,
                            body: {
                              tipo: e.tipo,
                              titulo: e.titulo,
                              descripcion: e.descripcion ?? "",
                              recurrencia: e.recurrencia,
                              fecha: e.fecha ?? null,
                              dia: e.dia ?? null,
                              mes: e.mes ?? null,
                              medico_id: e.medico_id ?? null,
                              responsable: e.responsable ?? "",
                              color: e.color ?? null,
                              activo: e.activo,
                            },
                          })
                        }
                      />
                      <BotonAccion icono={Trash2} etiqueta="Eliminar" peligro onClick={() => borrar(e)} />
                    </div>
                  )}
                </li>
              );
            })}

            {!eventos.length && !cargandoLista && <li className={s.empty}>Sin {etiquetaTipo} cargados.</li>}
          </ul>

          <div className={s.pie}>
            <Paginador pagina={paginaActual} totalPaginas={totalPaginas} onCambiar={setPagina} />
          </div>
        </section>
      </div>
    </>
  );
}
