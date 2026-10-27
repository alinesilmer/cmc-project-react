import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import s from "./ObrasSocialesPicker.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Fichas from "@/app/components/ui/Fichas/Fichas";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import { listObrasSocialesPublicas, OBRAS_SOCIALES_KEY } from "@/website/lib/obrasSociales.client";
import { coincide } from "@/website/lib/texto";

type Props = {
  /** NRO_OBRASOCIAL ya asociados. */
  value: number[];
  onChange: (nros: number[]) => void;
};

/** Selector de obras sociales alcanzadas por una norma operativa. */
export default function ObrasSocialesPicker({ value, onChange }: Props) {
  const [busqueda, setBusqueda] = useState("");

  // Misma consulta y caché que la página de Convenios.
  const { data: opciones = [], isPending, isError } = useQuery({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: ({ signal }) => listObrasSocialesPublicas(signal),
    staleTime: 10 * 60 * 1000,
  });

  const seleccionadas = useMemo(() => new Set(value), [value]);

  // Las elegidas siempre visibles arriba; el resto se filtra por el buscador, que hace falta porque el padrón pasa las 300 obras sociales.
  const filtradas = useMemo(
    () => opciones.filter((o) => coincide(busqueda, [o.nombre, String(o.nro)])),
    [opciones, busqueda],
  );
  const elegidas = useMemo(() => opciones.filter((o) => seleccionadas.has(o.nro)), [opciones, seleccionadas]);

  const alternar = (nro: number) => onChange(seleccionadas.has(nro) ? value.filter((n) => n !== nro) : [...value, nro]);

  return (
    <div className={s.selector}>
      {elegidas.length > 0 && (
        <Fichas
          items={elegidas.map((o) => ({ clave: String(o.nro), texto: o.nombre }))}
          onQuitar={(clave) => alternar(Number(clave))}
          onLimpiar={() => onChange([])}
        />
      )}

      <SearchField value={busqueda} onChange={(e) => setBusqueda(e.target.value)} onClear={() => setBusqueda("")} placeholder="Nombre o número" ariaLabel="Buscar obra social" />

      {isPending && (
        <p className={s.aviso}>
          <Cargando size={14} /> Cargando obras sociales…
        </p>
      )}
      {isError && <p className={s.aviso} role="alert">No se pudieron cargar las obras sociales.</p>}

      {!isPending && !isError && (
        <ul className={s.lista}>
          {filtradas.length === 0 ? (
            <li className={s.aviso}>{busqueda ? `Sin resultados para «${busqueda}».` : "No hay obras sociales para elegir."}</li>
          ) : (
            filtradas.map((o) => (
              <li key={o.nro}>
                <label className={s.opcion}>
                  <input type="checkbox" checked={seleccionadas.has(o.nro)} onChange={() => alternar(o.nro)} />
                  <span className={s.nro}>{o.nro}</span>
                  <span>{o.nombre}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
