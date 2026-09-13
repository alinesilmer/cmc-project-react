"use client";

import { useEffect, useMemo, useState } from "react";

import { getJSON } from "../../../lib/http";
import styles from "./dashboard.module.scss";

type ApiObraSocial = {
  nro_obra_social: number | null;
  nombre: string | null;
};

export type ObraSocialOpcion = {
  nro: number;
  nombre: string;
};

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
  const [opciones, setOpciones] = useState<ObraSocialOpcion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    getJSON<ApiObraSocial[]>("/api/obras_social/")
      .then((rows) => {
        if (!vivo) return;
        const limpias = rows
          .filter((r) => r.nro_obra_social != null && r.nombre)
          .map((r) => ({ nro: r.nro_obra_social as number, nombre: r.nombre as string }))
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
        setOpciones(limpias);
      })
      .catch(() => vivo && setError("No se pudieron cargar las obras sociales."))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const seleccionadas = useMemo(() => new Set(value), [value]);

  // Las ya elegidas siempre visibles arriba; el resto se filtra por el buscador,
  // que hace falta porque el padrón pasa las 300 obras sociales.
  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return opciones;
    return opciones.filter(
      (o) => o.nombre.toLowerCase().includes(q) || String(o.nro).includes(q)
    );
  }, [opciones, busqueda]);

  const elegidas = useMemo(
    () => opciones.filter((o) => seleccionadas.has(o.nro)),
    [opciones, seleccionadas]
  );

  const toggle = (nro: number) => {
    if (seleccionadas.has(nro)) onChange(value.filter((n) => n !== nro));
    else onChange([...value, nro]);
  };

  return (
    <div className={styles.osPicker}>
      {elegidas.length > 0 && (
        <div className={styles.osChips}>
          {elegidas.map((o) => (
            <button
              key={o.nro}
              type="button"
              className={styles.osChip}
              onClick={() => toggle(o.nro)}
              title="Quitar"
            >
              {o.nombre} ✕
            </button>
          ))}
        </div>
      )}

      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar obra social por nombre o número…"
      />

      {cargando && <p className={styles.osHint}>Cargando obras sociales…</p>}
      {error && <p className={styles.osHint}>{error}</p>}

      {!cargando && !error && (
        <div className={styles.osList}>
          {filtradas.length === 0 ? (
            <p className={styles.osHint}>Sin resultados para «{busqueda}».</p>
          ) : (
            filtradas.map((o) => (
              <label key={o.nro} className={styles.osOption}>
                <input
                  type="checkbox"
                  checked={seleccionadas.has(o.nro)}
                  onChange={() => toggle(o.nro)}
                />
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
