import WhatsappIcon from "../../UI/icons/WhatsappIcon";
import { linkWhatsApp } from "../../../lib/contacto";
import styles from "./Asesoras.module.scss";

/** Las asesoras de Prevención Salud dedicadas al convenio. */
const ASESORAS = [
  { nombre: "Yanina", whatsapp: "543794006475" },
  { nombre: "Belén", whatsapp: "543795860073" },
];

const MENSAJE = "Hola, soy socio del Colegio Médico y quiero información sobre el convenio con Prevención Salud.";

/** Una tarjeta por asesora: tocarla abre su WhatsApp. */
export default function Asesoras() {
  return (
    <div className={styles.bloque}>
      <h2 className={styles.titulo}>Asesoras</h2>
      <ul className={styles.asesoras}>
        {ASESORAS.map(({ nombre, whatsapp }) => (
          <li key={whatsapp}>
            <a
              href={linkWhatsApp(whatsapp, MENSAJE)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.asesora}
              aria-label={`Escribirle a ${nombre} por WhatsApp`}
            >
              <span className={styles.inicial} aria-hidden="true">
                {nombre[0]}
              </span>
              <strong className={styles.nombre}>{nombre}</strong>
              <span className={styles.whatsapp} aria-hidden="true">
                <WhatsappIcon />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
