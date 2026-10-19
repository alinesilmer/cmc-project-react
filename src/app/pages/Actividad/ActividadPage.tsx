import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
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
import SearchField from "@/app/components/ui/SearchField/SearchField";
import CampoFecha from "@/app/components/ui/CampoFecha/CampoFecha";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import Button from "@/app/components/ui/Button/Button";
import Caja from "@/app/components/ui/Caja/Caja";
import Franja from "@/app/components/layout/Franja/Franja";

const TAMANO = 20;

/** Registro de acciones del personal del Colegio — todos los que **no** son médicos. */
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

  /** Cualquier cambio de filtro vuelve a la página 1. */
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
      <Franja titulo="Actividad" icono={History} />

      <Caja titulo="Configuración">
        <label className={s.campo}>
          <span>Usuario</span>
          <select
            className={s.select}
            value={filtros.usuario_id ?? ""}
            onChange={(e) =>
              setFiltro({ usuario_id: e.target.value ? Number(e.target.value) : undefined })
            }
          >
            <option value="">Todos</option>
            {USUARIOS_DISPONIBLES.map((u) => (
              <option key={u.id} value={u.id}>{u.nombre}</option>
            ))}
          </select>
        </label>

        <label className={s.campo}>
          <span>Módulo</span>
          <select
            className={s.select}
            value={filtros.modulo ?? ""}
            onChange={(e) => setFiltro({ modulo: e.target.value || undefined })}
          >
            <option value="">Todos</option>
            {MODULOS_DISPONIBLES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className={s.campo}>
          <span>Resultado</span>
          <select
            className={s.select}
            value={filtros.resultado ?? ""}
            onChange={(e) =>
              setFiltro({ resultado: (e.target.value || undefined) as ResultadoAccion | undefined })
            }
          >
            <option value="">Todos</option>
            {RESULTADOS.map((r) => (
              <option key={r.valor} value={r.valor}>{r.label}</option>
            ))}
          </select>
        </label>

        <div className={s.campo}>
          <span>Desde</span>
          <CampoFecha
            value={filtros.desde ?? ""}
            onChange={(valor) => setFiltro({ desde: valor || undefined })}
            ariaLabel="Desde"
          />
        </div>

        <div className={s.campo}>
          <span>Hasta</span>
          <CampoFecha
            value={filtros.hasta ?? ""}
            onChange={(valor) => setFiltro({ hasta: valor || undefined })}
            ariaLabel="Hasta"
          />
        </div>

        {hayFiltros && (
          <div className={s.limpiar}>
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={limpiar}
              leftIcon={<X size={18} aria-hidden="true" />}
            >
              Limpiar
            </Button>
          </div>
        )}
      </Caja>

      <SearchField
        placeholder="Buscar acción o usuario…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        onClear={() => setBusqueda("")}
      />

      <section className={s.card}>
        <div className={s.tableWrap}>
          <Tabla>
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
                    <span className={s.usuario} title={a.usuario_rol ?? undefined}>
                      {a.usuario_nombre}
                    </span>
                  </td>
                  <td>
                    {/* La ruta cruda queda a mano para soporte, en el globo: sirve cuando la frase no alcanza para entender qué pasó. */}
                    <span
                      className={s.accion}
                      title={`${a.metodo} ${a.ruta}${a.ip ? ` · ${a.ip}` : ""}`}
                    >
                      {a.descripcion}
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
                    {hayFiltros ? "Nada coincide con los filtros" : "Sin actividad"}
                  </td>
                </tr>
              )}
            </tbody>
          </Tabla>
        </div>

        {cargando && (
          <div className={s.loading}>
            <Loader2 size={18} className={s.spin} /> Cargando…
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
            aria-label="Anterior"
            onClick={() => setFiltros((f) => ({ ...f, page: page - 1 }))}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <span className={s.pagina}>
            {page} / {paginas}
          </span>
          <button
            type="button"
            className={s.navBtn}
            disabled={page >= paginas}
            aria-label="Siguiente"
            onClick={() => setFiltros((f) => ({ ...f, page: page + 1 }))}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
}
