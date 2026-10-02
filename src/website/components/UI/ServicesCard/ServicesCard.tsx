import type React from "react";
import Enlace from "../Enlace/Enlace";
import Revelar from "../Revelar/Revelar";
import styles from "./ServicesCard.module.scss";

type Props = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  /** Sin `href` la tarjeta es sólo informativa. */
  href?: string;
  delay?: number;
};

export default function ServiceCard({ icon, title, description, href, delay = 0 }: Props) {
  const contenido = (
    <>
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <h3 className={styles.cardTitle}>{title}</h3>
      {description && <p className={styles.cardDescription}>{description}</p>}
    </>
  );

  return (
    <Revelar className={styles.card} distancia={24} retraso={delay} duracion={0.5}>
      {href ? (
        <Enlace href={href} className={styles.linkWrap}>
          {contenido}
        </Enlace>
      ) : (
        contenido
      )}
    </Revelar>
  );
}
