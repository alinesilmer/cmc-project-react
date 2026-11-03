import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronDown,
  FileCheck2,
} from "lucide-react";

import { getActualizacionesPorMes } from "../nomenclador.api";
import type { MesActualizaciones } from "../nomenclador.types";
import { formatFecha, hoyISO } from "@/app/shared/lib/fechas";
import Franja from "@/app/components/layout/Franja/Franja";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import s from "./ActualizacionesValores.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Cuántas obras sociales entran por página, repartidas entre los meses que toquen. */
const POR_PAGINA = 25;

/** Un trozo de mes: las filas que entran en la página y cuántas tiene el mes en total. */
type MesVisible = { mes: string; filas: MesActualizaciones["obras_sociales"]; total: number };

/** `"2026-07"` → `"Julio 2026"`. Sin `Date`: no hay zona horaria que corra el mes. */
function tituloMes(mes: string): string {
  const [anio, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? mes} ${anio}`;
}

/** Qué obras sociales actualizaron sus valores, mes a mes. */
export default function ActualizacionesValores() {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [pagina, setPagina] = useState(1);
  const [cerrados, setCerrados] = useState<Set<string>>(new Set());

  const { data: todos = [], isLoading, isError } = useQuery({
    queryKey: ["valores-actualizaciones"],
    queryFn: getActualizacionesPorMes,
    staleTime: 5 * 60 * 1000,
  });

  // Sólo este año y el anterior: lo más viejo ya no sirve para decidir nada y alarga la lista.
  const meses = useMemo(() => {
    const desde = String(Number(hoyISO().slice(0, 4)) - 1);
    return todos.filter((m) => m.mes >= desde);
  }, [todos]);

  // Los años que existen en los datos, no un rango fijo: si nadie actualizó en 2024.
  const anios = useMemo(
    () => [...new Set(meses.map((m) => m.mes.slice(0, 4)))].sort().reverse(),
    [meses],
  );

  const porAnio = useMemo(
    () => (anio ? meses.filter((m) => m.mes.startsWith(anio)) : meses),
    [meses, anio],
  );

  // Sólo los meses que existen en el año elegido (`"01"`…`"12"`): no se ofrece uno vacío.
  const mesesDelAnio = useMemo(
    () => [...new Set(porAnio.map((m) => m.mes.slice(5)))].sort(),
    [porAnio],
  );

  const filtrados = useMemo<MesActualizaciones[]>(() => {
    const q = busqueda.trim().toLowerCase();
    const porMes = mes ? porAnio.filter((m) => m.mes.endsWith(`-${mes}`)) : porAnio;
    if (!q) return porMes;
    return porMes
      .map((m) => {
        const obras_sociales = m.obras_sociales.filter(
          (o) =>
            o.nombre.toLowerCase().includes(q) ||
            String(o.obra_social_nro).includes(q),
        );
        // Antes esto quedaba con `...m`, que arrastraba total_codigos y total_obras_sociales del mes SIN filtrar: buscar "UNNE" mostraba dos filas por 1.527 valores reales.
        return {
          ...m,
          obras_sociales,
          total_codigos: obras_sociales.reduce((acc, o) => acc + o.codigos, 0),
          total_obras_sociales: new Set(obras_sociales.map((o) => o.obra_social_nro)).size,
        };
      })
      // Un mes que se queda sin obras sociales tras filtrar no se muestra: el encabezado vacío sólo agrega ruido a la lista de resultados.
      .filter((m) => m.obras_sociales.length > 0);
  }, [porAnio, mes, busqueda]);

  const totalFilas = useMemo(
    () => filtrados.reduce((n, m) => n + m.obras_sociales.length, 0),
    [filtrados],
  );
  const totalPaginas = Math.max(1, Math.ceil(totalFilas / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);

  // Se corta la lista de filas, no la de meses: un mes con 60 obras sociales también se reparte.
  const visibles = useMemo<MesVisible[]>(() => {
    let saltar = (paginaActual - 1) * POR_PAGINA;
    let quedan = POR_PAGINA;
    const salida: MesVisible[] = [];
    for (const m of filtrados) {
      if (quedan <= 0) break;
      const total = m.obras_sociales.length;
      if (saltar >= total) {
        saltar -= total;
        continue;
      }
      const filas = m.obras_sociales.slice(saltar, saltar + quedan);
      saltar = 0;
      quedan -= filas.length;
      salida.push({ mes: m.mes, filas, total });
    }
    return salida;
  }, [filtrados, paginaActual]);

  const alternar = (mes: string) =>
    setCerrados((prev) => {
      const s = new Set(prev);
      if (s.has(mes)) s.delete(mes);
      else s.add(mes);
      return s;
    });

  return (
    <div className={s.container}>
      <Franja titulo="Obras sociales actualizadas" icono={CalendarClock} />

      <div className={s.barra}>
        <SearchField
          placeholder="Buscar obra social…"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          onClear={() => { setBusqueda(""); setPagina(1); }}
        />

        <div className={s.selectores}>
          <select
            className={s.selector}
            value={anio}
            aria-label="Año"
            onChange={(e) => { setAnio(e.target.value); setMes(""); setPagina(1); }}
          >
            <option value="">Todos los años</option>
            {anios.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            className={s.selector}
            value={mes}
            aria-label="Mes"
            onChange={(e) => { setMes(e.target.value); setPagina(1); }}
          >
            <option value="">Todos los meses</option>
            {mesesDelAnio.map((m) => (
              <option key={m} value={m}>{MESES[Number(m) - 1]}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className={s.estado}>
          <Cargando size={17} /> Cargando…
        </div>
      ) : isError ? (
        <div className={s.estado}>No se pudieron cargar las actualizaciones.</div>
      ) : !filtrados.length ? (
        <div className={s.estado}>
          {busqueda || anio || mes
            ?"Nada coincide con esos filtros."
            : "Todavía no hay valores cargados."}
        </div>
      ) : (
        <div className={s.hoja}>
          {/* Sin filas alternadas: acá los renglones de mes ya ordenan la lectura. */}
          <Tabla data-lisa>
            <thead>
              <tr>
                <th className={s.colNro}>N°</th>
                <th>Obra social</th>
                <th>Vigencia</th>
                <th>Cargado el</th>
                <th>Respaldo</th>
                <th className={s.colVer} />
              </tr>
            </thead>
            {visibles.map((tramo) => {
              const abierto = !cerrados.has(tramo.mes);
              return (
                <tbody key={tramo.mes}>
                  <tr className={s.mes}>
                    <td colSpan={6}>
                      <BotonPlano
                        type="button"
                        className={s.mesBoton}
                        onClick={() => alternar(tramo.mes)}
                        aria-expanded={abierto}
                      >
                        <ChevronDown
                          size={20}
                          aria-hidden="true"
                          className={`${s.chev} ${abierto ? s.chevAbierto : ""}`}
                        />
                        <span className={s.mesTitulo}>{tituloMes(tramo.mes)}</span>
                        <span className={s.mesCuenta}>{tramo.total}</span>
                      </BotonPlano>
                    </td>
                  </tr>

                  {abierto &&
                    tramo.filas.map((o) => (
                      <tr key={`${o.obra_social_nro}-${o.vigencia_desde}`} className={s.fila}>
                        <td className={s.nro}>{o.obra_social_nro}</td>
                        <td className={s.osNombre}>{o.nombre}</td>
                        <td>{formatFecha(o.vigencia_desde)}</td>
                        <td>{formatFecha(o.cargado_el)}</td>
                        <td>
                          {o.tiene_documento ? (
                            <span className={s.docBadge}>
                              <FileCheck2 size={14} aria-hidden="true" /> Con respaldo
                            </span>
                          ) : (
                            <span className={s.sinDato}>—</span>
                          )}
                        </td>
                        <td className={s.colVer}>
                          {/* El listado usa el ID interno de la obra social y acá sólo se tiene el NRO_OBRASOCIAL. */}
                          <BotonVer
                            to={`/panel/convenios/obras-sociales?q=${o.obra_social_nro}&incluir_inactivas=true`}
                            etiqueta={`Ver ${o.nombre}`}
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              );
            })}
          </Tabla>
        </div>
      )}

      {!isLoading && !isError && totalFilas > 0 && (
        <Paginador
          pagina={paginaActual}
          totalPaginas={totalPaginas}
          onCambiar={setPagina}
          resumen={`${totalFilas} ${totalFilas === 1 ? "actualización" : "actualizaciones"}`}
          numerado
        />
      )}
    </div>
  );
}
