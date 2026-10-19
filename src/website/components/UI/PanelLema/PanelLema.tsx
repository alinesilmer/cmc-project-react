import type { CSSProperties, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import LineaPulso from "../LineaPulso/LineaPulso";
import styles from "./PanelLema.module.scss";

export type Destacado = { icono: LucideIcon; texto: string };

type Props = {
  /** La frase grande. Lo que va en `<em>` sale en crema. */
  lema: ReactNode;
  /** Tarjetitas flotantes sobre el círculo. */
  destacados: Destacado[];
  className?: string;
  /** Más bajo, para las páginas donde lo importante está debajo (listados). */
  compacto?: boolean;
};

/** Panel azul con un círculo crema, un lema y tarjetas flotantes. */
export default function PanelLema({ lema, destacados, className, compacto = false }: Props) {
  return (
    <aside className={`${styles.panel} ${compacto ? styles.compacto : ""} ${className ?? ""}`} aria-hidden="true">
      <div className={styles.circulo} />
      <div className={styles.aro} />
      <div className={styles.cruces} />
      <LineaPulso className={styles.pulso} retraso={0.5} latiendo />

      <p className={styles.lema}>{lema}</p>

      <ul className={styles.destacados}>
        {destacados.map(({ icono: Icono, texto }, i) => (
          // `--i` escalona la entrada de cada tarjeta (ver la hoja).
          <li key={texto} className={styles.destacado} style={{ "--i": i } as CSSProperties}>
            <span className={styles.destacadoIcono}>
              <Icono />
            </span>
            {texto}
          </li>
        ))}
      </ul>
    </aside>
  );
}
