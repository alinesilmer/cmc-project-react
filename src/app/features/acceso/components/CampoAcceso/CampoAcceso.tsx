import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./CampoAcceso.module.scss";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className"> & {
  id: string;
  etiqueta: string;
  icono: ReactNode;
  /** Con `true` el campo oculta lo escrito y muestra el botón del ojo. */
  secreto?: boolean;
  /** Texto de ayuda debajo del campo. */
  ayuda?: ReactNode;
  invalido?: boolean;
};

/**
 * Campo de las pantallas de acceso: etiqueta, ícono y, en las contraseñas, el
 * ojo para ver lo que se escribió. Lo usan el login y el cambio de contraseña.
 */
export default function CampoAcceso({ id, etiqueta, icono, secreto = false, ayuda, invalido = false, ...input }: Props) {
  const [visible, setVisible] = useState(false);
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;

  return (
    <div className={styles.campo}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
      </label>
      <div className={`${styles.caja} ${invalido ? styles.invalido : ""}`}>
        <span className={styles.icono} aria-hidden="true">
          {icono}
        </span>
        <input
          id={id}
          type={secreto && !visible ? "password" : "text"}
          className={styles.input}
          aria-invalid={invalido || undefined}
          aria-describedby={idAyuda}
          {...input}
        />
        {secreto && (
          <button
            type="button"
            className={styles.ojo}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            aria-controls={id}
            title={visible ? "Ocultar" : "Mostrar"}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        )}
      </div>
      {ayuda && (
        <p id={idAyuda} className={styles.ayuda}>
          {ayuda}
        </p>
      )}
    </div>
  );
}
