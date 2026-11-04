import React, { useRef, useState } from "react";
import { ChevronDown, FileText, Printer } from "lucide-react";
import Button from "@/app/components/ui/Button/Button";
import styles from "./tabs.module.scss";
import type { TipoTotales } from "../../pdf/totalesRecibosPdf";

type Props = {
  deshabilitado: boolean;
  /** Arma y descarga el PDF; el botón dice «Generando…» hasta que termina. */
  onElegir: (tipo: TipoTotales) => Promise<void>;
};

/**
 * Botón «Imprimir» con una lista que se abre al pasar el mouse (o con el teclado).
 * El estado vive acá y no en la pestaña: abrir o cerrar la lista no vuelve a dibujar la tabla de recibos,
 * que con cientos de filas es lo que hacía lenta la apertura.
 */
const MenuImprimir: React.FC<Props> = ({ deshabilitado, onElegir }) => {
  const [abierto, setAbierto] = useState(false);
  const [imprimiendo, setImprimiendo] = useState(false);
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abrir = () => {
    if (cierre.current) clearTimeout(cierre.current);
    setAbierto(true);
  };
  // Un instante de gracia al salir, para que el mouse pueda cruzar del botón a la lista sin que se cierre.
  const cerrar = () => {
    if (cierre.current) clearTimeout(cierre.current);
    cierre.current = setTimeout(() => setAbierto(false), 120);
  };

  const elegir = async (tipo: TipoTotales) => {
    setAbierto(false);
    setImprimiendo(true);
    try {
      await onElegir(tipo);
    } finally {
      setImprimiendo(false);
    }
  };

  return (
    <div
      className={styles.menuImprimir}
      onMouseEnter={abrir}
      onMouseLeave={cerrar}
      onFocus={abrir}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) cerrar(); }}
      onKeyDown={(e) => { if (e.key === "Escape") setAbierto(false); }}
    >
      <Button
        variant="secondary"
        leftIcon={<Printer size={18} aria-hidden="true" />}
        rightIcon={<ChevronDown size={16} aria-hidden="true" />}
        onClick={() => setAbierto((v) => !v)}
        disabled={deshabilitado || imprimiendo}
        aria-haspopup="menu"
        aria-expanded={abierto}
      >
        {imprimiendo ? "Generando…" : "Imprimir"}
      </Button>
      {abierto && !deshabilitado && !imprimiendo && (
        <div className={styles.menuImprimirLista} role="menu">
          <div className={styles.menuImprimirCaja}>
            <button type="button" role="menuitem" className={styles.menuImprimirItem} onClick={() => void elegir("brutos")}>
              <FileText size={16} aria-hidden="true" />
              Totales brutos
            </button>
            <button type="button" role="menuitem" className={styles.menuImprimirItem} onClick={() => void elegir("netos")}>
              <FileText size={16} aria-hidden="true" />
              Totales netos
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuImprimir;
