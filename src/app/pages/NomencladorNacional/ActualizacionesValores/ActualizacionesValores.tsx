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
import s from "./ActualizacionesValores.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** `"2026-07"` → `"Julio 2026"`. Sin `Date`: no hay zona horaria que corra el mes. */
function tituloMes(mes: string): string {
  const [anio, m] = mes.split("-");
  return `${MESES[Number(m) - 1] ?? mes} ${anio}`;
}

/** Qué obras sociales actualizaron sus valores, mes a mes. */
export default function ActualizacionesValores() {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState<string>("");
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
  }, [meses, busqueda, anio]);

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
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
        />

        <div className={s.anios} role="group" aria-label="Año">
          {["", ...anios].map((a) => (
            <BotonPlano
              key={a || "todos"}
              type="button"
              className={`${s.anio} ${anio === a ? s.anioActivo : ""}`}
              aria-pressed={anio === a}
              onClick={() => setAnio(a)}
            >
              {a || "Todos"}
            </BotonPlano>
          ))}
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
          {busqueda || anio
            ? "Nada coincide con esos filtros."
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
                <th>Respaldo</th>
                <th className={s.colVer} />
              </tr>
            </thead>
            {filtrados.map((mes) => {
              const abierto = !cerrados.has(mes.mes);
              return (
                <tbody key={mes.mes}>
                  <tr className={s.mes}>
                    <td colSpan={5}>
                      <BotonPlano
                        type="button"
                        className={s.mesBoton}
                        onClick={() => alternar(mes.mes)}
                        aria-expanded={abierto}
                      >
                        <ChevronDown
                          size={20}
                          aria-hidden="true"
                          className={`${s.chev} ${abierto ? s.chevAbierto : ""}`}
                        />
                        <span className={s.mesTitulo}>{tituloMes(mes.mes)}</span>
                        <span className={s.mesCuenta}>{mes.obras_sociales.length}</span>
                      </BotonPlano>
                    </td>
                  </tr>

                  {abierto &&
                    mes.obras_sociales.map((o) => (
                      <tr key={`${o.obra_social_nro}-${o.vigencia_desde}`} className={s.fila}>
                        <td className={s.nro}>{o.obra_social_nro}</td>
                        <td className={s.osNombre}>{o.nombre}</td>
                        <td>{formatFecha(o.vigencia_desde)}</td>
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
    </div>
  );
}
