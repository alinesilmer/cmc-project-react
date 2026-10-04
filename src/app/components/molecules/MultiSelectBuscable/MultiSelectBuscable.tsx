import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import styles from "./MultiSelectBuscable.module.scss";

export type MultiSelectOption<V extends string | number> = {
  value: V;
  label: string;
  /** Texto chico a la derecha (ej: el número de la obra social). */
  hint?: string;
};

type Props<V extends string | number> = {
  options: MultiSelectOption<V>[];
  selected: V[];
  onChange: (next: V[]) => void;
  /** Nombre en plural para el placeholder y el contador, ej. "especialidades". */
  noun: string;
  disabled?: boolean;
  loading?: boolean;
  /** Opciones que se muestran pero no se pueden tildar, con el motivo al lado
   * (ej. "Ya tiene precio"). "Seleccionar todos" las saltea. */
  bloqueadas?: Map<V, string>;
};

const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Lista con checks, buscador y "Seleccionar todos / Desmarcar todos". Los botones
 * de selección masiva actúan solo sobre lo que el buscador deja visible.
 */
export default function MultiSelectBuscable<V extends string | number>({
  options: optionsSinOrdenar,
  selected,
  onChange,
  noun,
  disabled,
  loading,
  bloqueadas,
}: Props<V>) {
  const [query, setQuery] = useState("");
  // Siempre alfabético, sin importar el orden en que lleguen las opciones.
  const options = useMemo(
    () => [...optionsSinOrdenar].sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" })),
    [optionsSinOrdenar],
  );
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const visibles = useMemo(() => {
    const q = normalizar(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => normalizar(o.label).includes(q) || normalizar(o.hint ?? "").includes(q),
    );
  }, [options, query]);

  function toggle(v: V) {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(options.map((o) => o.value).filter((x) => next.has(x)));
  }

  function selectVisibles(on: boolean) {
    const next = new Set(selectedSet);
    visibles.forEach((o) => {
      if (on && bloqueadas?.has(o.value)) return;
      if (on) next.add(o.value);
      else next.delete(o.value);
    });
    onChange(options.map((o) => o.value).filter((x) => next.has(x)));
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.searchWrap}>
          <Search size={14} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder={`Buscar ${noun}…`}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={`Buscar ${noun}`}
          />
        </div>
        <button
          type="button"
          className={styles.btnMini}
          disabled={disabled || visibles.length === 0}
          onClick={() => selectVisibles(true)}
        >
          Seleccionar todos
        </button>
        <button
          type="button"
          className={styles.btnMini}
          disabled={disabled || visibles.length === 0}
          onClick={() => selectVisibles(false)}
        >
          Desmarcar todos
        </button>
      </div>

      <div className={styles.list}>
        {loading ? (
          <p className={styles.empty}>Cargando…</p>
        ) : visibles.length === 0 ? (
          <p className={styles.empty}>Sin coincidencias</p>
        ) : (
          visibles.map((o) => {
            const motivo = bloqueadas?.get(o.value);
            return (
              <label key={o.value} className={`${styles.row} ${motivo ? styles.rowBloqueada : ""}`} title={motivo}>
                <input
                  type="checkbox"
                  checked={!motivo && selectedSet.has(o.value)}
                  disabled={disabled || !!motivo}
                  onChange={() => toggle(o.value)}
                />
                <span className={styles.label}>{o.label}</span>
                {motivo ? (
                  <small className={styles.motivo}>{motivo}</small>
                ) : (
                  o.hint && <small className={styles.hint}>{o.hint}</small>
                )}
              </label>
            );
          })
        )}
      </div>

      <div className={styles.foot}>
        {selected.length} seleccionadas de {options.length}
        {query.trim() ? ` · ${visibles.length} coinciden con la búsqueda` : ""}
      </div>
    </div>
  );
}
