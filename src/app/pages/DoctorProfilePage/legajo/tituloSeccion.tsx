import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactElement } from "react";
import styles from "../DoctorProfilePage.module.scss";
import type { SeccionDatos } from "./legajo.types";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

export type TituloSeccion = (
  seccion: SeccionDatos,
  Icono: LucideIcon,
  texto: string,
  style?: CSSProperties,
) => ReactElement;

/** Título de un bloque de la pestaña Datos: el botón que lo abre y lo cierra. */
export const crearTituloSeccion =
  (
    seccionAbierta: (s: SeccionDatos) => boolean,
    alternarSeccion: (s: SeccionDatos) => void,
  ): TituloSeccion =>
  (seccion, Icono, texto, style) => {
    const abierta = seccionAbierta(seccion);
    return (
      <h5 className={styles.section} style={style}>
        <BotonPlano
          type="button"
          className={styles.mpToggle}
          aria-expanded={abierta}
          onClick={() => alternarSeccion(seccion)}
        >
          <Icono size={18} aria-hidden="true" />
          <span>{texto}</span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`${styles.mpChev} ${abierta ? styles.mpChevAbierta : ""}`}
          />
        </BotonPlano>
      </h5>
    );
  };
