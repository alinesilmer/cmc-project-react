import type { ReactNode } from "react";
import styles from "./ContenedorPagina.module.scss";

/**
 * El marco de las páginas del sitio con el diseño nuevo: fondo blanco y las
 * secciones apiladas con aire entre ellas, todas del mismo ancho.
 */
export default function ContenedorPagina({ children }: { children: ReactNode }) {
  return <div className={styles.pagina}>{children}</div>;
}
