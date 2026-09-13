import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  FileCheck2,
  Loader2,
  Search,
  X,
} from "lucide-react";

import { getActualizacionesPorMes } from "../nomenclador.api";
import type { MesActualizaciones } from "../nomenclador.types";
import { formatFecha } from "../../../lib/fechas";
import s from "./ActualizacionesValores.module.scss";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** `"2026-07"` → `"Julio 2026"`. Sin `Date`: no hay zona horaria que corra el mes. */
function tituloMes(mes: string): string {
  const [anio, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? mes} ${anio}`;
}

const numero = new Intl.NumberFormat("es-AR");

/**
 * Qué obras sociales actualizaron sus valores, mes a mes.
 *
 * Agrupa por **vigencia**, no por fecha de carga: una lista de mayo importada
 * en agosto pertenece a mayo. Los meses sin actualizaciones no aparecen.
 *
 * Una sola llamada trae todo (~9 meses) y el filtrado es en memoria: el volumen
 * no crece con el tarifario sino con la cantidad de actualizaciones.
 */
export default function ActualizacionesValores() {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState<string>("");
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());

  const { data: meses = [], isLoading, isError } = useQuery({
    queryKey: ["valores-actualizaciones"],
    queryFn: getActualizacionesPorMes,
    staleTime: 5 * 60 * 1000,
  });

  // Los años que existen en los datos, no un rango fijo: si nadie actualizó en
  // 2024, ese año no tiene por qué estar en el desplegable.
  const anios = useMemo(
    () => [...new Set(meses.map((m) => m.mes.slice(0, 4)))].sort().reverse(),
    [meses],
  );

  const filtrados = useMemo<MesActualizaciones[]>(() => {
    const q = busqueda.trim().toLowerCase();
    const porAnio = anio ? meses.filter((m) => m.mes.startsWith(anio)) : meses;
    if (!q) return porAnio;
    return porAnio
      .map((m) => {
        const obras_sociales = m.obras_sociales.filter(
          (o) =>
            o.nombre.toLowerCase().includes(q) ||
            String(o.obra_social_nro).includes(q),
        );
        // Antes esto quedaba con `...m`, que arrastraba total_codigos y
        // total_obras_sociales del mes SIN filtrar: buscar "UNNE" mostraba dos
        // filas por 1.527 valores reales, con el total diciendo 4.963. Ver
        // auditoría A-01.
        return {
          ...m,
          obras_sociales,
          total_codigos: obras_sociales.reduce((acc, o) => acc + o.codigos, 0),
          total_obras_sociales: new Set(obras_sociales.map((o) => o.obra_social_nro)).size,
        };
      })
      // Un mes que se queda sin obras sociales tras filtrar no se muestra: el
      // encabezado vacío sólo agrega ruido a la lista de resultados.
      .filter((m) => m.obras_sociales.length > 0);
  }, [meses, busqueda, anio]);

  const totales = useMemo(() => {
    const os = new Set<number>();
    let codigos = 0;
    for (const m of filtrados) {
      for (const o of m.obras_sociales) os.add(o.obra_social_nro);
      codigos += m.total_codigos;
    }
    return { meses: filtrados.length, obrasSociales: os.size, codigos };
  }, [filtrados]);

  const alternar = (mes: string) =>
    setCerrados((prev) => {
      const s = new Set(prev);
      s.has(mes) ? s.delete(mes) : s.add(mes);
      return s;
    });

  return (
    <div className={s.container}>
      <header className={s.header}>
        <CalendarClock size={30} className={s.headerIcon} />
        <div>
          <h1 className={s.title}>O.S. Actualizadas (LISTADO)</h1>
          <p className={s.subtitle}>
            Obras sociales que actualizaron precios, por mes de vigencia.
          </p>
        </div>
      </header>

      <div className={s.barra}>
        <div className={s.searchBox}>
          <Search size={15} />
          <input
            className={s.searchInput}
            placeholder="Buscar obra social…"
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
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          aria-label="Filtrar por año"
        >
          <option value="">Todos los años</option>
          {anios.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {!isLoading && !isError && (
          <div className={s.totales}>
            <span>
              <strong>{totales.meses}</strong> {totales.meses === 1 ? "mes" : "meses"}
            </span>
            <span>
              <strong>{totales.obrasSociales}</strong> obras sociales
            </span>
            <span>
              <strong>{numero.format(totales.codigos)}</strong> valores
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={s.estado}>
          <Loader2 size={17} className={s.spin} /> Cargando…
        </div>
      ) : isError ? (
        <div className={s.estado}>No se pudieron cargar las actualizaciones.</div>
      ) : !filtrados.length ? (
        <div className={s.estado}>
          {busqueda || anio
            ? "Nada coincide con esos filtros."
            : "Todavía no hay valores cargados."}
        </div>
      ) : (
        <div className={s.meses}>
          {filtrados.map((mes) => {
            const abierto = !cerrados.has(mes.mes);
            return (
              <section key={mes.mes} className={s.mes}>
                <button
                  type="button"
                  className={s.mesHead}
                  onClick={() => alternar(mes.mes)}
                  aria-expanded={abierto}
                >
                  {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <h2 className={s.mesTitulo}>{tituloMes(mes.mes)}</h2>
                  <span className={s.mesMeta}>
                    {mes.total_obras_sociales} O.S. · {numero.format(mes.total_codigos)} valores
                  </span>
                </button>

                {abierto && (
                  <ul className={s.lista}>
                    {mes.obras_sociales.map((o) => (
                      <li key={`${o.obra_social_nro}-${o.vigencia_desde}`} className={s.fila}>
                        <div className={s.filaMain}>
                          <span className={s.osNombre}>{o.nombre}</span>
                          <span className={s.osMeta}>
                            N° {o.obra_social_nro} · vigente desde{" "}
                            {formatFecha(o.vigencia_desde)}
                          </span>
                        </div>

                        {o.tiene_documento && (
                          <span className={s.docBadge} title="Tiene documento respaldatorio">
                            <FileCheck2 size={12} /> Con respaldo
                          </span>
                        )}

                        <span className={s.codigos}>
                          {numero.format(o.codigos)}
                          <em>valores</em>
                        </span>

                        {/* El listado usa el ID interno de la obra social y acá
                            sólo se tiene el NRO_OBRASOCIAL, así que se enlaza a
                            la búsqueda por número en vez de al detalle.
                            `incluir_inactivas=true` porque el listado oculta
                            por default las dadas de baja (MARCA='N') y una
                            obra social puede haber actualizado precios antes
                            de darse de baja. Ver auditoría A-05. */}
                        <Link
                          className={s.verLink}
                          to={`/panel/convenios/obras-sociales?q=${o.obra_social_nro}&incluir_inactivas=true`}
                        >
                          Ver
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
