import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Building2, ChevronDown, Search } from "lucide-react";

import type { ObraSocial } from "@/app/pages/AfiliadosPorObraSocialPage/types";
import { buildOsCode, normalize } from "@/app/pages/AfiliadosPorObraSocialPage/helpers";
// Mismo selector que «Padrones», con la copia local de sus estilos.
import styles from "./Padrones.module.scss";

const MAX_SIN_BUSCAR = 80;

type Props = {
  obras: ObraSocial[];
  cargando: boolean;
  error: string | null;
  seleccionada: ObraSocial | null;
  onElegir: (os: ObraSocial) => void;
};

/** Desplegable con buscador para elegir la obra social. */
export default function SelectorObraSocial({ obras, cargando, error, seleccionada, onElegir }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState("");
  const consultaDiferida = useDeferredValue(consulta);
  const contenedor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTocarAfuera = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    const alEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", alTocarAfuera);
    document.addEventListener("keydown", alEscape);
    return () => {
      document.removeEventListener("mousedown", alTocarAfuera);
      document.removeEventListener("keydown", alEscape);
    };
  }, [abierto]);

  const filtradas = useMemo(() => {
    const q = normalize(consultaDiferida);
    if (!q) return obras.slice(0, MAX_SIN_BUSCAR);
    return obras.filter(
      (os) => normalize(os.NOMBRE ?? "").includes(q) || normalize(buildOsCode(os)).includes(q)
    );
  }, [consultaDiferida, obras]);

  const ocultas = normalize(consultaDiferida) ? 0 : Math.max(0, obras.length - filtradas.length);

  const elegir = (os: ObraSocial) => {
    onElegir(os);
    setConsulta("");
    setAbierto(false);
  };

  return (
    <div className={styles.osPicker} ref={contenedor}>
      <button
        type="button"
        className={styles.osButton}
        onClick={() => !cargando && setAbierto((a) => !a)}
        aria-expanded={abierto}
        aria-haspopup="listbox"
        disabled={cargando}
      >
        <Building2 size={18} className={styles.osIcono} aria-hidden="true" />
        <span className={styles.osButtonValue}>
          {seleccionada?.NOMBRE ?? (cargando ? "Cargando…" : "Seleccioná una obra social")}
        </span>
        <ChevronDown className={`${styles.chevron} ${abierto ? styles.chevronOpen : ""}`} aria-hidden="true" />
      </button>

      {abierto && (
        <div className={styles.dropdown}>
          <div className={styles.dropdownSearch}>
            <Search className={styles.searchIconSmall} aria-hidden="true" />
            <input
              className={styles.dropdownInput}
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar por nombre o código…"
              aria-label="Buscar obra social"
              autoFocus
            />
          </div>
          {ocultas > 0 && (
            <div className={styles.dropdownMeta}>
              Mostrando {filtradas.length} de {obras.length}. Escribí para filtrar.
            </div>
          )}
          <div className={styles.dropdownList}>
            {error ? (
              <div className={styles.errorMessage}>{error}</div>
            ) : filtradas.length === 0 ? (
              <div className={styles.emptyMessage}>Sin resultados para &ldquo;{consulta}&rdquo;</div>
            ) : (
              filtradas.map((os) => {
                const activa = seleccionada?.NRO_OBRA_SOCIAL === os.NRO_OBRA_SOCIAL;
                return (
                  <button
                    key={os.NRO_OBRA_SOCIAL}
                    type="button"
                    className={`${styles.dropdownItem} ${activa ? styles.dropdownItemActive : ""}`}
                    onClick={() => elegir(os)}
                  >
                    <span className={styles.dropdownItemName}>{os.NOMBRE}</span>
                    <span className={styles.dropdownItemCode}>{buildOsCode(os)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
