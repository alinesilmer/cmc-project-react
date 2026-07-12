import { useMemo, useState } from "react";
import { Search, X as XIcon, Building2, History } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import styles from "./HistorialValoresConsulta.module.scss";
import HistorialValores from "../ObrasSociales/ObrasSocialesDetalle/HistorialValores";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import type { ObraSocialListItem } from "../ObrasSociales/obrasSociales.types";

/**
 * Consulta directa del historial de valores de una obra social desde el menú
 * lateral, sin tener que entrar a la ficha de la OS. Elige una OS y muestra el
 * mismo panel de historial que la ficha.
 */
export default function HistorialValoresConsulta() {
  const [selected, setSelected] = useState<ObraSocialListItem | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return osList.slice(0, 50);
    const q = query.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre.toLowerCase().includes(q) ||
          String(os.nro_obra_social).includes(q),
      )
      .slice(0, 50);
  }, [osList, query]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <History size={20} />
        </span>
        <div>
          <h1 className={styles.title}>Historial de Valores</h1>
          <p className={styles.subtitle}>
            Consultá la evolución de precios de una obra social sin entrar a su ficha.
          </p>
        </div>
      </div>

      <div className={styles.selectorCard}>
        <label className={styles.selectorLabel}>Obra social</label>
        {selected ? (
          <div className={styles.chosen}>
            <span className={styles.chosenNro}>{selected.nro_obra_social}</span>
            <span className={styles.chosenName}>{selected.nombre}</span>
            <button
              type="button"
              className={styles.chosenClear}
              onClick={() => { setSelected(null); setQuery(""); }}
              title="Cambiar obra social"
              aria-label="Cambiar obra social"
            >
              <XIcon size={15} />
            </button>
          </div>
        ) : (
          <div className={styles.autocomplete}>
            <div className={styles.inputWrap}>
              <Search size={15} className={styles.inputIcon} />
              <input
                className={styles.input}
                placeholder="Buscar por nombre o número…"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
              />
            </div>
            {open && filtered.length > 0 && (
              <ul className={styles.dropdown}>
                {filtered.map((os) => (
                  <li
                    key={os.nro_obra_social}
                    className={styles.option}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSelected(os);
                      setQuery("");
                      setOpen(false);
                    }}
                  >
                    <span className={styles.optionNro}>{os.nro_obra_social}</span>
                    <span className={styles.optionName}>{os.nombre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {selected ? (
        <HistorialValores obraNro={selected.nro_obra_social} obraNombre={selected.nombre} />
      ) : (
        <div className={styles.prompt}>
          <Building2 size={30} />
          <span>Elegí una obra social para ver su historial de valores.</span>
        </div>
      )}
    </div>
  );
}
