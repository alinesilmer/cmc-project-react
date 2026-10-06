import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CircleCheck, Newspaper, ReceiptText } from "lucide-react";
import Enlace from "../../UI/Enlace/Enlace";
import Revelar from "../../UI/Revelar/Revelar";
import styles from "./AccesosRapidos.module.scss";

type Acceso = { icono: LucideIcon; titulo: string; href: string };

const ACCESOS: Acceso[] = [
  {
    icono: ReceiptText,
    titulo: "Facturación y liquidación",
    href: "https://comecorammeco.com/web/",
  },
  { icono: CircleCheck, titulo: "Médicos asociados", href: "/medicos-asociados" },
  { icono: Newspaper, titulo: "Noticias", href: "/noticias" },
];

/** Franja azul de la portada con los destinos más buscados. */
export default function AccesosRapidos() {
  return (
    <Revelar como="section" className={styles.banda} aria-label="Accesos rápidos">
      <div className={styles.circulo} aria-hidden="true" />

      <h2 className={styles.titulo}>
        Accesos <em>rápidos</em>
      </h2>

      <ul className={styles.grilla}>
        {ACCESOS.map(({ icono: Icono, titulo, href }) => (
          <li key={titulo}>
            <Enlace href={href} className={styles.acceso}>
              <span className={styles.icono} aria-hidden="true">
                <Icono />
              </span>
              <strong className={styles.nombre}>{titulo}</strong>
              <ArrowUpRight className={styles.flecha} aria-hidden="true" />
            </Enlace>
          </li>
        ))}
      </ul>
    </Revelar>
  );
}
