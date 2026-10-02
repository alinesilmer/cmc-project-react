import type React from "react";
import type { LucideIcon } from "lucide-react";
import Revelar from "../Revelar/Revelar";
import styles from "./TarjetasIcono.module.scss";

export type TarjetaIcono = { icono: LucideIcon; titulo: string; texto: string };

type Props = {
  /** Para el `aria-labelledby` de la sección. */
  id: string;
  /** Lo que va en `<em>` sale en azul. */
  titulo: React.ReactNode;
  items: TarjetaIcono[];
  /** En escritorio; en tablet son dos y en el celular una. */
  columnas?: number;
};

/**
 * Una grilla de tarjetas blancas con ícono, una palabra y una línea: valores
 * en Nosotros, requisitos de la Quinta, lo que incluye Prevención Salud.
 */
export default function TarjetasIcono({ id, titulo, items, columnas = 4 }: Props) {
  return (
    <section aria-labelledby={id}>
      <Revelar como="h2" id={id} className={styles.titulo}>
        {titulo}
      </Revelar>
      <ul className={styles.grilla} style={{ "--columnas": columnas } as React.CSSProperties}>
        {items.map(({ icono: Icono, titulo: nombre, texto }, i) => (
          <Revelar key={nombre} como="li" className={styles.tarjeta} distancia={18} retraso={i * 0.07}>
            <span className={styles.icono} aria-hidden="true">
              <Icono />
            </span>
            <h3>{nombre}</h3>
            <p>{texto}</p>
          </Revelar>
        ))}
      </ul>
    </section>
  );
}
