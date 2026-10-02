import { Check, Circle } from "lucide-react";
import { requisitosPassword, type DatosPassword } from "./reglasPassword";
import styles from "./CambiarPassword.module.scss";

export default function RequisitosPassword(props: DatosPassword) {
  return (
    <ul className={styles.requisitos} aria-label="Requisitos de la contraseña nueva">
      {requisitosPassword(props).map((r) => (
        <li key={r.texto} className={r.ok ? styles.cumplido : ""}>
          <span className={styles.tilde} aria-hidden="true">
            {r.ok ? <Check /> : <Circle />}
          </span>
          {r.texto}
          <span className={styles.srOnly}>{r.ok ? " (cumplido)" : " (pendiente)"}</span>
        </li>
      ))}
    </ul>
  );
}
