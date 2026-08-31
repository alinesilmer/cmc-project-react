import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";

import { useNotify } from "../../hooks/useNotify";
import { mensajeDeError } from "../../lib/httpErrors";
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
  LABEL_TIPO,
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
import s from "./Agenda.module.scss";

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

/** Hoy, en componentes locales — nunca `toISOString()`, que adelanta el día. */
function hoyPartes() {
  const d = new Date();
  return { anio: d.getFullYear(), mes: d.getMonth() + 1, dia: d.getDate() };
}

/**
 * Los tres calendarios del Colegio: feriados, cumpleaños y tareas del mes.
 *
 * Arriba el almanaque, que muestra los tres juntos —el feriado, el cumpleaños y
 * el vencimiento caen en la misma casilla y así se ven—, y abajo la lista del
 * calendario seleccionado, que es donde se cargan y se editan.
 *
 * La expansión de las recurrencias a días concretos la hace el backend
 * (`GET /agenda/mes`): el 31 en un mes de 30 y el 29 de febrero se corren al
 * último día disponible en vez de desaparecer del calendario.
 */
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

  const [ocurrencias, setOcurrencias] = useState<OcurrenciaAgenda[]>([]);
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [cargandoMes, setCargandoMes] = useState(true);
  const [cargandoLista, setCargandoLista] = useState(true);

  const [editando, setEditando] = useState<{ id?: number; body: EventoInput } | null>(null);
  const [guardando, setGuardando] = useState(false);

  // El personal del Colegio para el selector de responsable. Se trae una sola
  // vez —son ~20 filas y no cambian durante la sesión— y el filtrado va en el
  // cliente. Un fallo acá no rompe nada: el campo sigue aceptando texto libre.
  const [responsables, setResponsables] = useState<Responsable[]>([]);
  const [cargandoResp, setCargandoResp] = useState(true);

  useEffect(() => {
    listResponsables()
      .then(setResponsables)
      .catch(() => setResponsables([]))
      .finally(() => setCargandoResp(false));
  }, []);

  // El almanaque y la lista de abajo son dos consultas independientes y se
  // cargan por separado a propósito. Con un solo `cargar()` que hiciera las
  // dos, cambiar de pestaña abajo volvía a pedir el mes entero y cambiar un
  // chip del calendario volvía a pedir la lista: dos requests por interacción,
  // uno de ellos siempre al pedo.
  const cargarMes = useCallback(async () => {
    setCargandoMes(true);
    try {
      setOcurrencias(await getMes(anio, mes, filtro ?? undefined));
    } catch {
      avisarError("No se pudo cargar el calendario.");
    } finally {
      setCargandoMes(false);
    }
  }, [anio, mes, filtro, avisarError]);

  const cargarLista = useCallback(async () => {
    setCargandoLista(true);
    try {
      setEventos(await listEventos({ tipo }));
    } catch {
      avisarError("No se pudieron cargar los eventos.");
    } finally {
      setCargandoLista(false);
    }
  }, [tipo, avisarError]);

  useEffect(() => {
    void cargarMes();
  }, [cargarMes]);

  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  /** Tras crear, editar o borrar hay que refrescar las dos: la fila cambió y
      su ocurrencia en el almanaque también. */
  const cargar = useCallback(
    () => Promise.all([cargarMes(), cargarLista()]),
    [cargarMes, cargarLista]
  );

  const irA = (delta: number) => {
    const m = mes + delta;
    if (m < 1) { setMes(12); setAnio(anio - 1); }
    else if (m > 12) { setMes(1); setAnio(anio + 1); }
    else setMes(m);
  };

  /** Las ocurrencias agrupadas por día del mes, para pintar la grilla. */
  const porDia = useMemo(() => {
    const mapa = new Map<number, OcurrenciaAgenda[]>();
    for (const o of ocurrencias) {
      const d = Number(o.ocurre_el.slice(8, 10));
      mapa.set(d, [...(mapa.get(d) ?? []), o]);
    }
    return mapa;
  }, [ocurrencias]);

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

  /**
   * Al cambiar la recurrencia se limpian los campos que dejan de aplicar. Sin
   * esto, pasar de anual a única dejaría el `mes` viejo cargado y el backend
   * rechazaría el guardado por incoherente.
   */
  const cambiarRecurrencia = (recurrencia: Recurrencia) =>
    cambiar({
      recurrencia,
      fecha: recurrencia === "unica" ? editando?.body.fecha ?? null : null,
      dia: recurrencia === "unica" ? null : editando?.body.dia ?? null,
      mes: recurrencia === "anual" ? editando?.body.mes ?? null : null,
    });

  const esHoy = (d: number) => anio === hoy.anio && mes === hoy.mes && d === hoy.dia;

  return (
    <div className={s.container}>
      <header className={s.header}>
        <CalendarDays size={30} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Calendario</h1>
          <p className={s.subtitle}>Feriados, cumpleaños y tareas del mes.</p>
        </div>
      </header>

      {/* ── Almanaque ── */}
      <section className={s.card}>
        <div className={s.calHead}>
          <button type="button" className={s.navBtn} onClick={() => irA(-1)}>
            <ChevronLeft size={16} />
          </button>
          <h2 className={s.calTitle}>
            {MESES[mes - 1]} {anio}
          </h2>
          <button type="button" className={s.navBtn} onClick={() => irA(1)}>
            <ChevronRight size={16} />
          </button>

          <div className={s.filtros}>
            <button
              type="button"
              className={`${s.chip} ${filtro === null ? s.chipOn : ""}`}
              onClick={() => setFiltro(null)}
            >
              Todos
            </button>
            {TIPOS.map((t) => (
              <button
                key={t.valor}
                type="button"
                className={`${s.chip} ${filtro === t.valor ? s.chipOn : ""}`}
                style={filtro === t.valor ? { background: t.color, borderColor: t.color } : undefined}
                onClick={() => setFiltro(t.valor)}
              >
                <i className={s.dot} style={{ background: t.color }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className={s.semana}>
          {DIAS_SEMANA.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className={s.grid}>
          {celdas.map((d, i) =>
            d === null ? (
              <div key={`v${i}`} className={s.celdaVacia} />
            ) : (
              <div key={d} className={`${s.celda} ${esHoy(d) ? s.celdaHoy : ""}`}>
                <span className={s.celdaNum}>{d}</span>
                <div className={s.celdaEventos}>
                  {(porDia.get(d) ?? []).map((o) => (
                    <span
                      key={`${o.id}-${o.ocurre_el}`}
                      className={s.pill}
                      style={{ background: colorDe(o) }}
                      title={
                        o.responsable ? `${o.titulo} — ${o.responsable}` : o.titulo
                      }
                    >
                      {o.titulo}
                    </span>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {cargandoMes && (
          <div className={s.loading}>
            <Loader2 size={15} className={s.spin} /> Cargando…
          </div>
        )}
      </section>

      {/* ── Administración del calendario elegido ── */}
      <section className={s.card}>
        <div className={s.tabs}>
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              className={`${s.tab} ${tipo === t.valor ? s.tabOn : ""}`}
              onClick={() => {
                setTipo(t.valor);
                setEditando(null);
              }}
            >
              <i className={s.dot} style={{ background: t.color }} />
              {t.label}
            </button>
          ))}

          {puedeEditar && (
            <button
              type="button"
              className={s.addBtn}
              onClick={() => setEditando({ body: eventoVacio(tipo) })}
            >
              <Plus size={14} /> Nuevo {LABEL_TIPO[tipo]}
            </button>
          )}
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
                <input
                  type="date"
                  className={s.input}
                  value={editando.body.fecha ?? ""}
                  onChange={(e) => cambiar({ fecha: e.target.value || null })}
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
                {guardando ? <Loader2 size={15} className={s.spin} /> : <Save size={15} />}
                Guardar
              </button>
            </div>
          </div>
        )}

        <ul className={s.list}>
          {eventos.map((e) => (
            <li key={e.id} className={`${s.row} ${!e.activo ? s.rowInactivo : ""}`}>
              <i className={s.dot} style={{ background: colorDe(e) }} />
              <div className={s.rowMain}>
                <span className={s.rowTitulo}>{e.titulo}</span>
                <span className={s.rowCuando}>
                  {describirCuando(e)}
                  {e.responsable ? ` · ${e.responsable}` : ""}
                  {e.descripcion ? ` · ${e.descripcion}` : ""}
                </span>
              </div>
              {puedeEditar && (
                <div className={s.rowActions}>
                  <button
                    type="button"
                    className={s.iconBtn}
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
                  >
                    <Pencil size={14} />
                  </button>
                  <button type="button" className={s.iconDanger} onClick={() => borrar(e)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}

          {!eventos.length && !cargandoLista && (
            <li className={s.empty}>Sin {TIPOS.find((t) => t.valor === tipo)?.label.toLowerCase()} cargados.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
