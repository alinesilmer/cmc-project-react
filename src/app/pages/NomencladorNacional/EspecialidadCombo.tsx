import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X as XIcon } from "lucide-react";
import type { Especialidad } from "../Especialidades/especialidades.types";
import styles from "./EspecialidadCombo.module.scss";

type Props = {
  especialidades: Especialidad[];
  /** id_colegio_espe seleccionado, o null para "todas". */
  value: number | null;
  onChange: (value: number | null) => void;
  placeholder?: string;
};

/**
 * Selector de especialidad con búsqueda por texto (combobox).
 * Escribí para filtrar por nombre o ID; hacé click para elegir; la × limpia el filtro.
 */
export default function EspecialidadCombo({
  especialidades,
  value,
  onChange,
  placeholder = "Todas las especialidades",
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedName = useMemo(
    () => especialidades.find((e) => e.id_colegio_espe === value)?.nombre ?? "",
    [especialidades, value],
  );

  // Mientras no se está buscando, el texto refleja la selección actual.
  useEffect(() => {
    if (!open) setQuery(selectedName);
  }, [selectedName, open]);

  // Cerrar al hacer click afuera.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Si el texto es igual a la selección (o está vacío), mostramos la lista completa.
    if (!q || q === selectedName.toLowerCase()) return especialidades.slice(0, 50);
    return especialidades
      .filter((e) => e.nombre.toLowerCase().includes(q) || String(e.id_colegio_espe).includes(q))
      .slice(0, 50);
  }, [especialidades, query, selectedName]);

  function select(e: Especialidad) {
    onChange(e.id_colegio_espe);
    setQuery(e.nombre);
    setOpen(false);
  }

  function clear() {
    onChange(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <Search size={13} className={styles.icon} />
      <input
        className={styles.input}
        value={query}
        placeholder={placeholder}
        title="Buscar especialidad"
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={(e) => { setOpen(true); e.currentTarget.select(); }}
      />
      {value !== null && (
        <button type="button" className={styles.clear} onClick={clear} title="Quitar filtro">
          <XIcon size={13} />
        </button>
      )}
      {open && (
        <ul className={styles.dropdown}>
          {filtered.length === 0 ? (
            <li className={styles.empty}>Sin coincidencias</li>
          ) : (
            filtered.map((e) => (
              <li
                key={e.id}
                className={`${styles.item} ${e.id_colegio_espe === value ? styles.itemActive : ""}`}
                onMouseDown={(ev) => { ev.preventDefault(); select(e); }}
              >
                {e.nombre} <span className={styles.itemId}>({e.id_colegio_espe})</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
