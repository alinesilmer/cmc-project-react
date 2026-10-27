import { memo, useDeferredValue, useMemo, useState } from "react";

import s from "./DetalleTabla.module.scss";
import Segmentos from "@/app/components/ui/Segmentos/Segmentos";
import type { AumentoDetalleItem } from "../../nomenclador.types";
import { fmtMonto, type FiltroEstado } from "../aumento.helpers";
import { useEspecialidadNombres } from "../useEspecialidadNombres";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Tabla from "@/app/components/ui/Tabla/Tabla";

/** Filas que se dibujan: el resto se alcanza buscando. */
const LIMITE_FILAS = 100;

type Props = {
  items: AumentoDetalleItem[];
  /** Encabezado de la columna del precio nuevo. */
  rotuloNuevo?: string;
};

const clave = (it: AumentoDetalleItem, i: number) =>
  `${it.tipo}-${it.codigo}-${it.nivel ?? ""}-${it.especialidad_id_colegio ?? ""}-${i}`;

const Fila = memo(function Fila({ it, espNombres }: { it: AumentoDetalleItem; espNombres: Map<number, string> }) {
  const actualiza = it.estado === "actualiza";
  const nivel = it.nivel != null ? `Nivel ${it.nivel}` : it.tipo === "galeno" ? "Sin niveles" : null;
  const especialidad =
    it.especialidad_id_colegio != null
      ? (espNombres.get(it.especialidad_id_colegio) ?? `Esp. ${it.especialidad_id_colegio}`)
      : null;

  return (
    <tr>
      <td>
        <span className={`${s.tipo} ${it.tipo === "galeno" ? s.tipoGaleno : ""}`}>
          {it.tipo === "galeno" ? "Galeno" : "Valor"}
        </span>
      </td>
      <td className={s.codigo}>{it.tipo === "galeno" ? "—" : it.codigo}</td>
      <td className={s.descripcion}>{it.descripcion ?? "—"}</td>
      <td className={s.codigo}>{[nivel, especialidad].filter(Boolean).join(" · ") || "—"}</td>
      <td className={s.actual}>{fmtMonto(it.actual)}</td>
      <td className={actualiza ? s.nuevo : s.actual}>{actualiza ? fmtMonto(it.nuevo) : "—"}</td>
      <td>
        <span className={actualiza ? s.estadoOk : it.estado === "error" ? s.estadoError : s.estadoOmitido}>
          {actualiza ? "Se actualiza" : it.estado === "error" ? "Error" : "Omitido"}
          {!actualiza && it.motivo ? ` · ${it.motivo}` : ""}
        </span>
      </td>
    </tr>
  );
});

/** Detalle fila por fila de una vista previa, un resultado o una reversión, con filtro por estado y búsqueda. */
function DetalleTabla({ items, rotuloNuevo = "Nuevo" }: Props) {
  const [filtro, setFiltro] = useState<FiltroEstado>("todos");
  const [busqueda, setBusqueda] = useState("");
  // La búsqueda no frena al tipear: la tabla se recalcula con el valor diferido.
  const consulta = useDeferredValue(busqueda);
  const espNombres = useEspecialidadNombres();

  const cuentas = useMemo(() => {
    const actualizan = items.filter((i) => i.estado === "actualiza").length;
    return { todos: items.length, actualiza: actualizan, omitido: items.length - actualizan };
  }, [items]);

  const visibles = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return items.filter((it) => {
      if (filtro === "actualiza" && it.estado !== "actualiza") return false;
      if (filtro === "omitido" && it.estado === "actualiza") return false;
      return !q || it.codigo.toLowerCase().includes(q) || (it.descripcion ?? "").toLowerCase().includes(q);
    });
  }, [items, filtro, consulta]);

  if (items.length === 0) return <p className={s.nota}>No hay nada dentro del alcance elegido.</p>;

  return (
    <div className={s.detalle}>
      <div className={s.barra}>
        <Segmentos
          ariaLabel="Filtrar por estado"
          valor={filtro}
          onChange={setFiltro}
          opciones={[
            { valor: "todos", rotulo: `Todos (${cuentas.todos})` },
            { valor: "actualiza", rotulo: `Se actualizan (${cuentas.actualiza})` },
            { valor: "omitido", rotulo: `Omitidos (${cuentas.omitido})` },
          ]}
        />
        <SearchField
          placeholder="Código o descripción"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onClear={() => setBusqueda("")}
        />
      </div>

      <div className={s.envoltorio}>
        <Tabla>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Código</th>
              <th>Descripción</th>
              <th>Nivel / Especialidad</th>
              <th>Actual</th>
              <th>{rotuloNuevo}</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {visibles.slice(0, LIMITE_FILAS).map((it, i) => (
              <Fila key={clave(it, i)} it={it} espNombres={espNombres} />
            ))}
          </tbody>
        </Tabla>
      </div>

      {visibles.length > LIMITE_FILAS && <p className={s.nota}>…y {visibles.length - LIMITE_FILAS} más: buscá para verlas.</p>}
      {visibles.length === 0 && <p className={s.nota}>Sin coincidencias.</p>}
    </div>
  );
}

export default memo(DetalleTabla);
