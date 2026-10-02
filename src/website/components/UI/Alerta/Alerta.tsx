import type React from "react";
import { X } from "lucide-react";
import styles from "./Alerta.module.scss";

type Props = {
  tono?: "error" | "exito" | "info";
  children: React.ReactNode;
  /** Si se pasa, la alerta muestra una cruz para cerrarla. */
  onCerrar?: () => void;
};

/**
 * Aviso en pantalla. Reemplaza a los `alert()` (bloquean la pestaña y no dejan
 * copiar el texto) y a las cuatro franjas de error que tenía el administrador,
 * cada una con su CSS.
 */
export default function Alerta({ tono = "error", children, onCerrar }: Props) {
  return (
    <div className={`${styles.alerta} ${styles[tono]}`} role={tono === "error" ? "alert" : "status"}>
      <span>{children}</span>
      {onCerrar && (
        <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar el aviso">
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
