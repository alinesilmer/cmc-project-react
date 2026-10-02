import type { ReactNode } from "react";
import Revelar from "../Revelar/Revelar";
import PanelLema, { type Destacado } from "../PanelLema/PanelLema";
import LineaPulso from "../LineaPulso/LineaPulso";
import styles from "./CabeceraFresca.module.scss";

type Props = {
  /** Lo que va en `<span>` sale en azul. */
  titulo: ReactNode;
  /** Una frase corta debajo del título; tres o cuatro palabras. */
  bajada?: string;
  lema: ReactNode;
  destacados?: Destacado[];
  /** Panel bajo, para páginas cuyo contenido principal está debajo. */
  compacto?: boolean;
  /** Lo que va debajo del título: pasos, un buscador. */
  children?: ReactNode;
  /** Los botones, en fila al pie de la tarjeta. */
  acciones?: ReactNode;
};

/**
 * Cabecera de página: tarjeta blanca con el título a la izquierda y el panel
 * azul con el lema a la derecha. En el celular el panel pasa arriba como
 * franja. Reemplaza a los heros con foto de fondo, que pesaban cientos de KB
 * y tapaban el contenido.
 */
export default function CabeceraFresca({ titulo, bajada, lema, destacados = [], compacto = false, children, acciones }: Props) {
  return (
    <section className={`${styles.cabecera} ${compacto ? styles.compacta : ""}`}>
      <Revelar className={styles.tarjeta} alVerse={false}>
        <div className={styles.encabezado}>
          <h1 className={styles.titulo}>{titulo}</h1>
          <LineaPulso className={styles.pulso} retraso={0.35} />
          {bajada && <p className={styles.bajada}>{bajada}</p>}
        </div>
        {children}
        {acciones && <div className={styles.acciones}>{acciones}</div>}
      </Revelar>
      <PanelLema className={styles.panel} lema={lema} destacados={destacados} compacto={compacto} />
    </section>
  );
}
