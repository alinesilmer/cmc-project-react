import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Mail, MapPin, Phone } from "lucide-react";
import { motion } from "framer-motion";
import WhatsappIcon from "../../UI/icons/WhatsappIcon";
import { CONTACTO, linkEmail, linkWhatsApp } from "../../../lib/contacto";
import styles from "./AccionesContacto.module.scss";

type Accion = {
  icono: LucideIcon | typeof WhatsappIcon;
  /** Un verbo: lo que se lee primero. */
  accion: string;
  /** El dato completo, chico debajo y en `title`. */
  dato: string;
  href: string;
};

type Props = {
  /** A qué email escriben y con qué asunto. */
  email?: string;
  asunto?: string;
  /** Si se pasa, suma el botón de WhatsApp con este mensaje. */
  mensajeWhatsApp?: string;
};

const escalonado = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const aparecer = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

/**
 * Botones grandes para contactar al Colegio: cómo llegar, llamar, escribir y,
 * si se pide, WhatsApp. Un verbo por botón; el dato va chico abajo. Los usan
 * Contacto y Socios.
 */
export default function AccionesContacto({ email = CONTACTO.emails.secretaria, asunto, mensajeWhatsApp }: Props) {
  const acciones: Accion[] = [
    { icono: MapPin, accion: "Cómo llegar", dato: CONTACTO.direccion, href: CONTACTO.mapa },
    { icono: Phone, accion: "Llamar", dato: CONTACTO.telefono.corto, href: CONTACTO.telefono.href },
    { icono: Mail, accion: "Escribir", dato: email, href: linkEmail(email, { asunto }) },
  ];
  if (mensajeWhatsApp) {
    acciones.push({
      icono: WhatsappIcon,
      accion: "WhatsApp",
      dato: CONTACTO.telefono.corto,
      href: linkWhatsApp(CONTACTO.whatsapp.sede, mensajeWhatsApp),
    });
  }

  return (
    <motion.ul
      className={styles.acciones}
      style={{ "--columnas": acciones.length } as React.CSSProperties}
      variants={escalonado}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {acciones.map(({ icono: Icono, accion, dato, href }) => {
        const externo = /^https?:\/\//.test(href);
        return (
          <motion.li key={accion} variants={aparecer}>
            <a
              href={href}
              title={dato}
              aria-label={`${accion}: ${dato}`}
              className={styles.accion}
              {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span className={styles.icono} aria-hidden="true">
                <Icono />
              </span>
              <strong className={styles.verbo}>{accion}</strong>
              <span className={styles.dato}>{dato}</span>
            </a>
          </motion.li>
        );
      })}
    </motion.ul>
  );
}
