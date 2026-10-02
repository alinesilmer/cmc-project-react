import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { listObrasSocialesPublicas, OBRAS_SOCIALES_KEY } from "../../../lib/obrasSociales.client";
import { coincide } from "../../../lib/texto";
import styles from "./ObrasSocialesPicker.module.scss";

type Props = {
  /** NRO_OBRASOCIAL ya asociados. */
  value: number[];
  onChange: (nros: number[]) => void;
};

/**
 * Selector de obras sociales alcanzadas por una norma operativa.
 *
 * Es lo que consulta después el boletín de consulta común: la etiqueta decide
 * cómo se muestra la noticia, esta lista decide a qué obra social le
 * corresponde. Sin esto la norma se publica igual, pero no aparece en el
 * boletín.
 */
export default function ObrasSocialesPicker({ value, onChange }: Props) {
  const [busqueda, setBusqueda] = useState("");

  // Misma consulta y caché que la página de Convenios.
  const { data: opciones = [], isPending, isError } = useQuery({
    queryKey: OBRAS_SOCIALES_KEY,
    queryFn: ({ signal }) => listObrasSocialesPublicas(signal),
    staleTime: 10 * 60 * 1000,
  });

  const seleccionadas = useMemo(() => new Set(value), [value]);

  // Las elegidas siempre visibles arriba; el resto se filtra por el buscador,
  // que hace falta porque el padrón pasa las 300 obras sociales.
  const filtradas = useMemo(
    () => opciones.filter((o) => coincide(busqueda, [o.nombre, String(o.nro)])),
    [opciones, busqueda]
  );
  const elegidas = useMemo(() => opciones.filter((o) => seleccionadas.has(o.nro)), [opciones, seleccionadas]);

  const alternar = (nro: number) =>
    onChange(seleccionadas.has(nro) ? value.filter((n) => n !== nro) : [...value, nro]);

  return (
    <div className={styles.osPicker}>
      {elegidas.length > 0 && (
        <div className={styles.osChips}>
          {elegidas.map((o) => (
            <button
              key={o.nro}
              type="button"
              className={styles.osChip}
              onClick={() => alternar(o.nro)}
              aria-label={`Quitar ${o.nombre}`}
            >
              {o.nombre} <X size={12} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar obra social por nombre o número…"
        aria-label="Buscar obra social"
      />

      {isPending && <p className={styles.osHint}>Cargando obras sociales…</p>}
      {isError && <p className={styles.osHint}>No se pudieron cargar las obras sociales.</p>}

      {!isPending && !isError && (
        <div className={styles.osList}>
          {filtradas.length === 0 ? (
            <p className={styles.osHint}>Sin resultados para «{busqueda}».</p>
          ) : (
            filtradas.map((o) => (
              <label key={o.nro} className={styles.osOption}>
                <input type="checkbox" checked={seleccionadas.has(o.nro)} onChange={() => alternar(o.nro)} />
                <span>
                  {o.nro} · {o.nombre}
                </span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}
