import type { ReactNode } from "react";
import Revelar from "../Revelar/Revelar";
import styles from "./Llamado.module.scss";

type Props = {
  /** Una pregunta corta; lo que va en `<em>` sale en azul. */
  titulo: ReactNode;
  /** Los botones. */
  children: ReactNode;
};

/** El cierre de una página: una frase y a dónde seguir. */
export default function Llamado({ titulo, children }: Props) {
  return (
    <Revelar como="section" className={styles.llamado}>
      <h2>{titulo}</h2>
      <div className={styles.acciones}>{children}</div>
    </Revelar>
  );
}
