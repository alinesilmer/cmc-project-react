import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";

import { useNotify } from "../../hooks/useNotify";
import {
  MODULOS_DISPONIBLES,
  USANDO_DATOS_DE_EJEMPLO,
  USUARIOS_DISPONIBLES,
  getActividad,
} from "./actividad.api";
import {
  COLOR_RESULTADO,
  LABEL_RESULTADO,
  RESULTADOS,
  formatMomento,
  type AccionUsuario,
  type FiltrosActividad,
  type ResultadoAccion,
} from "./actividad.types";
import s from "./Actividad.module.scss";

const TAMANO = 20;

/**
 * Registro de acciones del personal del Colegio — todos los que **no** son
 * médicos.
 *
 * ⚠ **La API todavía no existe.** La pantalla está terminada y habla contra el
 * contrato de `actividad.types.ts`; mientras tanto `actividad.api.ts` devuelve
 * datos de ejemplo y arriba se muestra un aviso para que nadie confunda esto
 * con actividad real. Cuando el backend esté, se cambia una función en el
 * archivo de API y esta pantalla no se toca.
 *
 * La materia prima ya existe del lado del servidor: `audit_log` guarda cada
 * request mutante con usuario, rol, ruta, status e IP. Lo que falta es filtrar
 * por rol distinto de `medico` y traducir la ruta a una frase legible.
 */
export default function ActividadPage() {
  const { error: avisarError } = useNotify();

  const [filtros, setFiltros] = useState<FiltrosActividad>({ page: 1, size: TAMANO });
  const [busqueda, setBusqueda] = useState("");
  const [items, setItems] = useState<AccionUsuario[]>([]);
  const [total, setTotal] = useState(0);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const r = await getActividad(filtros);
      setItems(r.items);
      setTotal(r.total);
    } catch {
      avisarError("No se pudo cargar el registro.");
    } finally {
      setCargando(false);
    }
  }, [filtros, avisarError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // El texto se aplica con debounce; el resto de los filtros, al instante.
  useEffect(() => {
    const t = setTimeout(
      () => setFiltros((f) => ({ ...f, q: busqueda.trim() || undefined, page: 1 })),
      300
    );
    return () => clearTimeout(t);
  }, [busqueda]);

  /** Cualquier cambio de filtro vuelve a la página 1: quedarse en la 3 de un
      resultado que ahora tiene una sola página deja la tabla vacía. */
  const setFiltro = (parche: Partial<FiltrosActividad>) =>
    setFiltros((f) => ({ ...f, ...parche, page: 1 }));

  const limpiar = () => {
    setBusqueda("");
    setFiltros({ page: 1, size: TAMANO });
  };

  const hayFiltros = Boolean(
    filtros.q || filtros.usuario_id || filtros.modulo || filtros.resultado ||
    filtros.desde || filtros.hasta
  );

  const page = filtros.page ?? 1;
  const paginas = Math.max(1, Math.ceil(total / TAMANO));

  return (
    <div className={s.container}>
      <header className={s.header}>
        <History size={30} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>Registro de actividad</h1>
          <p className={s.subtitle}>Acciones del personal del Colegio.</p>
        </div>
      </header>

      {USANDO_DATOS_DE_EJEMPLO && (
        <div className={s.avisoDemo}>
          <TriangleAlert size={17} />
          <span>
            <strong>Datos de ejemplo.</strong> El registro real todavía no está
            conectado; lo que se ve abajo es una muestra para revisar la pantalla.
          </span>
        </div>
      )}

      <section className={s.filtros}>
        <div className={s.searchBox}>
          <Search size={15} />
          <input
            className={s.searchInput}
            placeholder="Buscar por acción o usuario…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button type="button" className={s.clearBtn} onClick={() => setBusqueda("")}>
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className={s.select}
          value={filtros.usuario_id ?? ""}
          onChange={(e) =>
            setFiltro({ usuario_id: e.target.value ? Number(e.target.value) : undefined })
          }
        >
          <option value="">Todos los usuarios</option>
          {USUARIOS_DISPONIBLES.map((u) => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>

        <select
          className={s.select}
          value={filtros.modulo ?? ""}
          onChange={(e) => setFiltro({ modulo: e.target.value || undefined })}
        >
          <option value="">Todos los módulos</option>
          {MODULOS_DISPONIBLES.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <select
          className={s.select}
          value={filtros.resultado ?? ""}
          onChange={(e) =>
            setFiltro({ resultado: (e.target.value || undefined) as ResultadoAccion | undefined })
          }
        >
          <option value="">Cualquier resultado</option>
          {RESULTADOS.map((r) => (
            <option key={r.valor} value={r.valor}>{r.label}</option>
          ))}
        </select>

        <input
          type="date"
          className={s.select}
          title="Desde"
          value={filtros.desde ?? ""}
          onChange={(e) => setFiltro({ desde: e.target.value || undefined })}
        />
        <input
          type="date"
          className={s.select}
          title="Hasta"
          value={filtros.hasta ?? ""}
          onChange={(e) => setFiltro({ hasta: e.target.value || undefined })}
        />

        {hayFiltros && (
          <button type="button" className={s.ghostBtn} onClick={limpiar}>
            <X size={14} /> Limpiar
          </button>
        )}
      </section>

      <section className={s.card}>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.colFecha}>Fecha</th>
                <th className={s.colUsuario}>Usuario</th>
                <th>Acción</th>
                <th className={s.colModulo}>Módulo</th>
                <th className={s.colResultado}>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td className={s.colFecha}>{formatMomento(a.fecha)}</td>
                  <td className={s.colUsuario}>
                    <span className={s.usuario}>{a.usuario_nombre}</span>
                    {a.usuario_rol && <span className={s.rol}>{a.usuario_rol}</span>}
                  </td>
                  <td>
                    <span className={s.accion}>{a.descripcion}</span>
                    {/* La ruta cruda queda a mano para soporte, en chico: sirve
                        cuando la frase no alcanza para entender qué pasó. */}
                    <span className={s.ruta}>
                      {a.metodo} {a.ruta}
                      {a.ip ? ` · ${a.ip}` : ""}
                    </span>
                  </td>
                  <td className={s.colModulo}>{a.modulo}</td>
                  <td className={s.colResultado}>
                    <span
                      className={s.badge}
                      style={{ background: COLOR_RESULTADO[a.resultado] }}
                    >
                      {LABEL_RESULTADO[a.resultado]}
                    </span>
                    {a.status_code ? <span className={s.status}>{a.status_code}</span> : null}
                  </td>
                </tr>
              ))}

              {!items.length && !cargando && (
                <tr>
                  <td colSpan={5} className={s.empty}>
                    {hayFiltros ? "Nada coincide con esos filtros." : "Sin actividad registrada."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {cargando && (
          <div className={s.loading}>
            <Loader2 size={15} className={s.spin} /> Cargando…
          </div>
        )}

        <div className={s.paginador}>
          <span className={s.total}>
            {total} {total === 1 ? "acción" : "acciones"}
          </span>
          <button
            type="button"
            className={s.navBtn}
            disabled={page <= 1}
            onClick={() => setFiltros((f) => ({ ...f, page: page - 1 }))}
          >
            <ChevronLeft size={15} />
          </button>
          <span className={s.pagina}>
            {page} / {paginas}
          </span>
          <button
            type="button"
            className={s.navBtn}
            disabled={page >= paginas}
            onClick={() => setFiltros((f) => ({ ...f, page: page + 1 }))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}
