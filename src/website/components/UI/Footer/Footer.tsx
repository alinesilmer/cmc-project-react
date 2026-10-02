import { Link } from "react-router-dom";
import { ArrowUp, Instagram, MapPin, Phone, Mail } from "lucide-react";
import { NAVEGACION } from "../Header/navegacion";
import { CONTACTO, linkWhatsApp } from "../../../lib/contacto";
import logo from "../../../assets/images/logoCMC-web.png";
import styles from "./Footer.module.scss";

// Las columnas salen del mismo menú que la cabecera: agregar una sección la
// suma en los dos lados.
const INSTITUCIONAL = NAVEGACION.filter((i) => !i.hijos && i.ruta !== "/");
const SERVICIOS = NAVEGACION.find((i) => i.hijos)?.hijos ?? [];

const CONTACTOS = [
  { icono: MapPin, texto: `${CONTACTO.direccion}, ${CONTACTO.ciudad}`, href: CONTACTO.mapa, externo: true },
  { icono: Phone, texto: CONTACTO.telefono.visible, href: CONTACTO.telefono.href, externo: false },
  { icono: Mail, texto: CONTACTO.emails.secretaria, href: `mailto:${CONTACTO.emails.secretaria}`, externo: false },
];

/** WhatsApp del estudio que desarrolló el sitio. */
const WHATSAPP_DESARROLLO = "5493794532535";

const volverArriba = () => window.scrollTo({ top: 0, behavior: "smooth" });

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.contenido}>
        <div className={styles.marca}>
          <Link to="/" className={styles.logo} aria-label="Colegio Médico de Corrientes, inicio">
            <img src={logo} alt="" width={64} height={64} loading="lazy" />
            <span>
              Colegio Médico
              <small>de Corrientes</small>
            </span>
          </Link>
          <a
            className={styles.red}
            href={CONTACTO.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram del Colegio"
          >
            <Instagram aria-hidden="true" />
            @colegiomedicoctes
          </a>
        </div>

        <nav className={styles.columna} aria-label="Institucional">
          <h2>Institucional</h2>
          <ul>
            {INSTITUCIONAL.map((i) => (
              <li key={i.ruta}>
                <Link to={i.ruta}>{i.etiqueta}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.columna} aria-label="Servicios">
          <h2>Servicios</h2>
          <ul>
            {SERVICIOS.map((i) => (
              <li key={i.ruta}>
                <Link to={i.ruta}>{i.etiqueta}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.columna}>
          <h2>Contacto</h2>
          <ul>
            {CONTACTOS.map(({ icono: Icono, texto, href, externo }) => (
              <li key={texto}>
                <a
                  href={href}
                  className={styles.contacto}
                  {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                >
                  <Icono aria-hidden="true" />
                  <span>{texto}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.pie}>
        <div className={styles.pieContenido}>
          <p>© {new Date().getFullYear()} Colegio Médico de Corrientes. Todos los derechos reservados.</p>
          <p>
            Desarrollado por{" "}
            <a href={linkWhatsApp(WHATSAPP_DESARROLLO)} target="_blank" rel="noopener noreferrer">
              DevHorizon
            </a>
          </p>
          <button type="button" className={styles.arriba} onClick={volverArriba}>
            <ArrowUp aria-hidden="true" />
            Volver arriba
          </button>
        </div>
      </div>
    </footer>
  );
}
