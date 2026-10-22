import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, UserMinus, UserPlus, Users } from "lucide-react";

import Caja, { Cajas } from "@/app/components/ui/Caja/Caja";
import ConfirmModal from "@/app/components/ui/ConfirmModal/ConfirmModal";
import DobleScroll from "@/app/components/ui/DobleScroll/DobleScroll";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import { fetchObrasSociales } from "@/app/pages/AfiliadosPorObraSocialPage/api";
import type { ObraSocial } from "@/app/pages/AfiliadosPorObraSocialPage/types";
// Franja, solapas, tabla y paginación son los de «Padrones»: la pantalla se ve igual.
import padrones from "@/app/pages/AfiliadosPorObraSocialPage/Padrones.module.scss";
import {
  TAMANO_PAGINA, adherirSocios, fetchCandidatos, mensajeDeError, quitarSocios,
  type Candidato, type PaginaCandidatos, type Vista,
} from "./api";
import SelectorObraSocial from "./SelectorObraSocial";
import s from "./ActualizarPadrones.module.scss";

type Modo = "adherir" | "quitar";

const SOLAPAS: { id: Modo; titulo: string; icono: typeof UserPlus }[] = [
  { id: "adherir", titulo: "Adherir socios", icono: UserPlus },
  { id: "quitar", titulo: "Quitar del padrón", icono: UserMinus },
];

const VISTAS: { id: Vista; titulo: string }[] = [
  { id: "todos", titulo: "Todos" },
  { id: "sin", titulo: "Sin adherir" },
  { id: "ad", titulo: "Ya adheridos" },
];

const NOMBRES_EN_BARRA = 3;

/** Lo que se puede tildar en cada modo: al adherir, los que todavía no están; al quitar, los que sí. */
const esElegible = (c: Candidato, modo: Modo) => (modo === "adherir" ? !c.ADHERIDO : c.ADHERIDO);

const nombreDe = (c: { NOMBRE: string | null; NRO_SOCIO: number }) => c.NOMBRE || `Socio ${c.NRO_SOCIO}`;

/** Actualizar padrones: se elige una obra social y se tildan los socios que se adhieren (o se quitan) de su padrón. */
export default function ActualizarPadronesPage() {
  const avisar = useAppSnackbar();

  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [cargandoObras, setCargandoObras] = useState(true);
  const [errorObras, setErrorObras] = useState<string | null>(null);
  const [obra, setObra] = useState<ObraSocial | null>(null);

  const [modo, setModo] = useState<Modo>("adherir");
  const [vistaElegida, setVistaElegida] = useState<Vista>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaAplicada, setBusquedaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [recarga, setRecarga] = useState(0);

  const [datos, setDatos] = useState<PaginaCandidatos | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persiste entre páginas y búsquedas: se puede tildar en una y seguir en otra.
  const [seleccion, setSeleccion] = useState<Map<number, Candidato>>(new Map());
  const [confirmando, setConfirmando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Al quitar solo tiene sentido ver a los que figuran en el padrón.
  const vista: Vista = modo === "quitar" ? "ad" : vistaElegida;

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const rows = await fetchObrasSociales(ctrl.signal);
        if (!ctrl.signal.aborted) setObras(rows);
      } catch {
        if (!ctrl.signal.aborted) setErrorObras("No se pudieron cargar las obras sociales.");
      } finally {
        if (!ctrl.signal.aborted) setCargandoObras(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // El buscador va al servidor: se espera a que termine de escribir.
  useEffect(() => {
    if (busqueda === busquedaAplicada) return;
    const t = setTimeout(() => {
      setBusquedaAplicada(busqueda);
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busqueda, busquedaAplicada]);

  const nroOS = obra?.NRO_OBRA_SOCIAL ?? null;

  useEffect(() => {
    if (nroOS === null) {
      setDatos(null);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        setCargando(true);
        setError(null);
        const d = await fetchCandidatos(nroOS, { search: busquedaAplicada, vista, page: pagina }, ctrl.signal);
        if (!ctrl.signal.aborted) setDatos(d);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(mensajeDeError(e, "No se pudieron cargar los socios."));
        setDatos(null);
      } finally {
        if (!ctrl.signal.aborted) setCargando(false);
      }
    })();
    return () => ctrl.abort();
  }, [nroOS, busquedaAplicada, vista, pagina, recarga]);

  const elegirObra = useCallback((os: ObraSocial) => {
    setObra(os);
    setSeleccion(new Map());
    setPagina(1);
    setBusqueda("");
    setBusquedaAplicada("");
    setVistaElegida("todos");
  }, []);

  const cambiarModo = (m: Modo) => {
    if (m === modo) return;
    setModo(m);
    // Lo tildado en un modo no vale en el otro.
    setSeleccion(new Map());
    setPagina(1);
  };

  const cambiarVista = (v: Vista) => {
    setVistaElegida(v);
    setPagina(1);
  };

  const alternar = (c: Candidato) =>
    setSeleccion((previa) => {
      const sig = new Map(previa);
      if (sig.has(c.ID)) sig.delete(c.ID);
      else sig.set(c.ID, c);
      return sig;
    });

  const items = datos?.items ?? [];
  const elegiblesPagina = useMemo(() => items.filter((c) => esElegible(c, modo)), [items, modo]);
  const todosTildados = elegiblesPagina.length > 0 && elegiblesPagina.every((c) => seleccion.has(c.ID));

  const alternarPagina = () =>
    setSeleccion((previa) => {
      const sig = new Map(previa);
      for (const c of elegiblesPagina) {
        if (todosTildados) sig.delete(c.ID);
        else sig.set(c.ID, c);
      }
      return sig;
    });

  const totalPaginas = Math.max(1, Math.ceil((datos?.total ?? 0) / TAMANO_PAGINA));
  const elegidos = Array.from(seleccion.values());
  const cantidad = elegidos.length;
  const accion = modo === "adherir" ? "Adherir" : "Quitar";

  const resumen =
    cantidad === 0
      ? "Ningún socio seleccionado"
      : cantidad === 1
        ? "1 socio seleccionado"
        : `${cantidad} socios seleccionados`;
  const nombres =
    cantidad === 0
      ? modo === "adherir"
        ? "Tildá socios en la tabla para adherirlos."
        : "Tildá socios en la tabla para sacarlos del padrón."
      : elegidos.slice(0, NOMBRES_EN_BARRA).map(nombreDe).join(" · ") +
        (cantidad > NOMBRES_EN_BARRA ? ` · y ${cantidad - NOMBRES_EN_BARRA} más` : "");

  const confirmar = async () => {
    if (!obra) return;
    setGuardando(true);
    try {
      const ids = elegidos.map((c) => c.ID);
      const r = modo === "adherir" ? await adherirSocios(obra.NRO_OBRA_SOCIAL, ids) : await quitarSocios(obra.NRO_OBRA_SOCIAL, ids);
      const verbo = modo === "adherir" ? "adheridos a" : "quitados de";
      let msg = `${r.procesados} ${r.procesados === 1 ? "socio" : "socios"} ${verbo} ${obra.NOMBRE}.`;
      if (r.sin_cambios > 0) msg += ` ${r.sin_cambios} ya estaban así.`;
      if (r.omitidos.length > 0) msg += ` ${r.omitidos.length} no se tocaron: ya no son socios activos.`;
      avisar(msg, r.omitidos.length > 0 ? "warning" : "success");
      setSeleccion(new Map());
      setRecarga((n) => n + 1);
    } catch (e) {
      avisar(mensajeDeError(e, "No se pudo actualizar el padrón."), "error");
    } finally {
      setGuardando(false);
      setConfirmando(false);
    }
  };

  const estadoDe = (c: Candidato) => {
    const tildado = seleccion.has(c.ID);
    if (modo === "quitar") {
      return tildado
        ? <span className={`${s.estado} ${s.estadoQuita}`}>Se va a quitar</span>
        : <span className={`${s.estado} ${s.estadoAd}`}>En el padrón</span>;
    }
    if (c.ADHERIDO) return <span className={`${s.estado} ${s.estadoAd}`}>Adherido</span>;
    if (tildado) return <span className={`${s.estado} ${s.estadoNuevo}`}>Se va a adherir</span>;
    return <span className={s.libre}>No adherido</span>;
  };

  return (
    <div className={padrones.fondo}>
      <div className={padrones.container}>
        <header className={padrones.cabecera}>
          <h1 className={padrones.title}>
            <ClipboardList size={38} strokeWidth={1.9} style={{ verticalAlign: "-4px", marginRight: 12 }} aria-hidden="true" />
            Actualizar padrones
          </h1>

          <div className={padrones.solapas} role="tablist" aria-label="Qué querés hacer con el padrón">
            {SOLAPAS.map((sol) => {
              const Icono = sol.icono;
              const activa = sol.id === modo;
              return (
                <button
                  key={sol.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  className={`${padrones.solapa} ${activa ? padrones.solapaActiva : ""}`}
                  onClick={() => cambiarModo(sol.id)}
                >
                  <Icono size={16} strokeWidth={1.8} aria-hidden="true" />
                  {sol.titulo}
                </button>
              );
            })}
          </div>
        </header>

        <section className={padrones.panel}>
          <Cajas>
            <Caja titulo="Obra social">
              <SelectorObraSocial
                obras={obras}
                cargando={cargandoObras}
                error={errorObras}
                seleccionada={obra}
                onElegir={elegirObra}
              />
              <p className={s.nota}>
                {modo === "adherir"
                  ? "El socio queda adherido a todos los planes de la obra social."
                  : "El socio se quita de todos los planes de la obra social."}
              </p>
            </Caja>

            {obra && datos && (
              <Caja titulo="Padrón actual">
                <div className={s.cifras}>
                  <div className={s.cifra}>
                    <strong>{datos.adheridos}</strong>
                    <span>ya adheridos</span>
                  </div>
                  <div className={s.cifra}>
                    <strong>{datos.sin_adherir}</strong>
                    <span>sin adherir</span>
                  </div>
                </div>
              </Caja>
            )}
          </Cajas>

          {obra && (
            <div className={padrones.herramientas}>
              <SearchField
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onClear={() => setBusqueda("")}
                placeholder="Buscar por nombre o N° de socio…"
                ariaLabel="Buscar socio"
              />
              {modo === "adherir" && (
                <div className={s.segmentos} role="group" aria-label="Qué socios mostrar">
                  {VISTAS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      className={`${s.segmento} ${v.id === vista ? s.segmentoActivo : ""}`}
                      aria-pressed={v.id === vista}
                      onClick={() => cambiarVista(v.id)}
                    >
                      {v.titulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!obra ? (
            <div className={padrones.emptyState}>
              <Users size={40} className={padrones.emptyIcon} aria-hidden="true" />
              <h3 className={padrones.emptyTitle}>Seleccioná una obra social</h3>
            </div>
          ) : error ? (
            <div className={padrones.errorMessage} role="alert">{error}</div>
          ) : !datos ? (
            <div className={padrones.loadingState}>
              <div className={padrones.progressBar}><div className={padrones.progressFill} /></div>
              <p className={padrones.loadingText}>Cargando socios…</p>
            </div>
          ) : (
            <>
              <p className={padrones.resultsCount}>
                <strong>{datos.total}</strong> {datos.total === 1 ? "socio" : "socios"}
                {totalPaginas > 1 && <> · página <strong>{pagina}</strong> de <strong>{totalPaginas}</strong></>}
              </p>

              <DobleScroll className={`${padrones.tableWrapper} ${cargando ? s.recargando : ""}`}>
                <Tabla className={padrones.table}>
                  <thead>
                    <tr>
                      <th className={s.colCheck}>
                        <input
                          type="checkbox"
                          className={s.check}
                          checked={todosTildados}
                          disabled={elegiblesPagina.length === 0}
                          onChange={alternarPagina}
                          aria-label="Tildar todos los de esta página"
                        />
                      </th>
                      <th>N° socio</th>
                      <th>Nombre</th>
                      <th>Matrícula</th>
                      <th>Especialidad</th>
                      <th>En el padrón</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={padrones.noResults}>
                          {busquedaAplicada
                            ? <>Ningún socio coincide con &ldquo;{busquedaAplicada}&rdquo;.</>
                            : modo === "quitar"
                              ? "Esta obra social todavía no tiene socios en su padrón."
                              : "No hay socios para mostrar."}
                        </td>
                      </tr>
                    ) : (
                      items.map((c) => {
                        const bloqueado = !esElegible(c, modo);
                        const tildado = bloqueado ? c.ADHERIDO : seleccion.has(c.ID);
                        return (
                          <tr key={c.ID} className={`${tildado && !bloqueado ? s.filaTildada : ""} ${bloqueado ? s.filaBloqueada : ""}`}>
                            <td className={s.colCheck}>
                              <input
                                type="checkbox"
                                className={s.check}
                                checked={tildado}
                                disabled={bloqueado}
                                onChange={() => alternar(c)}
                                aria-label={`${bloqueado ? "Ya adherido: " : "Tildar a "}${nombreDe(c)}`}
                              />
                            </td>
                            <td className={padrones.centrada}>{c.NRO_SOCIO}</td>
                            <td className={padrones.tdName}>{nombreDe(c)}</td>
                            <td className={padrones.centrada}>{c.MATRICULA_PROV ?? <span className={padrones.vacio}>—</span>}</td>
                            <td>{c.ESPECIALIDADES.join(", ") || <span className={padrones.vacio}>—</span>}</td>
                            <td>{estadoDe(c)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </Tabla>
              </DobleScroll>

              {totalPaginas > 1 && (
                <div className={padrones.pagination}>
                  <button
                    type="button"
                    className={padrones.paginationBtn}
                    onClick={() => setPagina((p) => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className={s.paginaDe}>Página {pagina} de {totalPaginas}</span>
                  <button
                    type="button"
                    className={padrones.paginationBtn}
                    onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {obra && (
            <div className={`${s.barra} ${modo === "quitar" ? s.barraQuitar : ""}`} role="region" aria-label="Selección">
              <div className={s.barraTexto}>
                <strong>{resumen}</strong>
                <span>{nombres}</span>
              </div>
              <button type="button" className={s.barraLimpiar} onClick={() => setSeleccion(new Map())} disabled={cantidad === 0}>
                Limpiar selección
              </button>
              <button type="button" className={s.barraAccion} onClick={() => setConfirmando(true)} disabled={cantidad === 0 || guardando}>
                {accion} {modo === "adherir" ? "a" : "de"} {obra.NOMBRE}
              </button>
            </div>
          )}
        </section>
      </div>

      <ConfirmModal
        isOpen={confirmando}
        title={modo === "adherir" ? "¿Adherir estos socios?" : "¿Quitar estos socios del padrón?"}
        message={
          `${cantidad === 1 ? "1 socio" : `${cantidad} socios`} ${modo === "adherir" ? "quedarán adheridos a" : "dejarán de figurar en"} ` +
          `${obra?.NOMBRE ?? "la obra social"}, en todos sus planes.`
        }
        confirmLabel={guardando ? "Guardando…" : accion}
        variant={modo === "adherir" ? "info" : "danger"}
        onConfirm={confirmar}
        onCancel={() => !guardando && setConfirmando(false)}
      />
    </div>
  );
}
