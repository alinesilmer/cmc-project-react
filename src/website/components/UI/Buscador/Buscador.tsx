import { useId, useRef } from "react";
import { Search, X } from "lucide-react";
import styles from "./Buscador.module.scss";

type Props = {
  valor: string;
  onCambio: (valor: string) => void;
  placeholder: string;
  /** Qué se busca, para el lector de pantalla: «Buscar beneficios». */
  etiqueta: string;
  className?: string;
  /** Versión del panel: esquinas rectas y más baja, como el resto de sus controles. */
  compacto?: boolean;
};

/**
 * Campo de búsqueda con lupa y botón para borrar. Había cinco versiones, una
 * por pantalla, con el mismo marcado y estilos casi iguales.
 */
export default function Buscador({ valor, onCambio, placeholder, etiqueta, className, compacto = false }: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);

  const limpiar = () => {
    onCambio("");
    input.current?.focus();
  };

  return (
    <div className={`${styles.caja} ${compacto ? styles.compacto : ""} ${className ?? ""}`}>
      <label htmlFor={id} className={styles.srOnly}>
        {etiqueta}
      </label>
      <Search className={styles.lupa} aria-hidden="true" />
      <input
        ref={input}
        id={id}
        type="search"
        className={styles.input}
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {valor && (
        <button type="button" className={styles.limpiar} onClick={limpiar} aria-label="Borrar la búsqueda">
          <X aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
