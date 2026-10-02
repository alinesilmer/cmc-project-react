import type { ReactNode } from "react";
import { ArrowUpRight, Mail } from "lucide-react";
import Revelar from "../Revelar/Revelar";
import WhatsappIcon from "../icons/WhatsappIcon";
import { linkEmail, linkWhatsApp } from "../../../lib/contacto";
import styles from "./BandaInvitacion.module.scss";

type Props = {
  /** Lo que va en `<em>` sale en crema. */
  titulo: ReactNode;
  bajada: string;
  whatsapp: { numero: string; visible: string; mensaje: string };
  email: { direccion: string; asunto?: string; cuerpo?: string };
};

type Canal = {
  clave: "whatsapp" | "email";
  icono: ReactNode;
  nombre: string;
  dato: string;
  href: string;
  externo: boolean;
};

/**
 * Franja azul que invita a sumarse: obras sociales que quieren convenio,
 * comercios que quieren ofrecer un beneficio. Título corto y dos canales que
 * ya muestran el número y el mail, así nadie tiene que hacer clic para verlos.
 */
export default function BandaInvitacion({ titulo, bajada, whatsapp, email }: Props) {
  const canales: Canal[] = [
    {
      clave: "whatsapp",
      icono: <WhatsappIcon />,
      nombre: "WhatsApp",
      dato: whatsapp.visible,
      href: linkWhatsApp(whatsapp.numero, whatsapp.mensaje),
      externo: true,
    },
    {
      clave: "email",
      icono: <Mail />,
      nombre: "Email",
      dato: email.direccion,
      href: linkEmail(email.direccion, { asunto: email.asunto, cuerpo: email.cuerpo }),
      externo: false,
    },
  ];

  return (
    <Revelar como="section" className={styles.banda}>
      <div className={styles.circulo} aria-hidden="true" />

      <div className={styles.texto}>
        <h2 className={styles.titulo}>{titulo}</h2>
        <p className={styles.bajada}>{bajada}</p>
      </div>

      <ul className={styles.canales}>
        {canales.map((c) => (
          <li key={c.clave}>
            <a
              href={c.href}
              className={styles.canal}
              data-canal={c.clave}
              {...(c.externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            >
              <span className={styles.icono} aria-hidden="true">
                {c.icono}
              </span>
              <span className={styles.canalTexto}>
                <strong>{c.nombre}</strong>
                <span>{c.dato}</span>
              </span>
              <ArrowUpRight className={styles.flecha} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </Revelar>
  );
}
