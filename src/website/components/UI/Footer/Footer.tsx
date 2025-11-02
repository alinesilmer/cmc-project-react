import { Link } from "react-router-dom";
import {
  FiFacebook,
  FiInstagram,
  FiMapPin,
  FiPhone,
  FiMail,
} from "react-icons/fi";
import styles from "./Footer.module.scss";
import logo from "../../../assets/images/logoCMC.png";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      {/* Top: logo + columnas */}
      <div className={styles.top}>
        {/* Marca / Logo */}
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <img
              src={logo}
              alt="Colegio Médico de Corrientes"
              width={150}
              height={150}
              className={styles.logo}
            />
          </div>
        </div>

        {/* Navegación principal */}
        <nav className={styles.linksCol} aria-label="Navegación">
          <h4>Navegación</h4>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/noticias">Noticias</Link></li>
            <li><Link to="/nosotros">Nosotros</Link></li>
            <li><Link to="/servicios">Servicios</Link></li>
            <li><Link to="/contacto">Contacto</Link></li>
          </ul>
        </nav>

        {/* Enlaces rápidos (genéricos, sin subrutas nuevas) */}
        <nav className={styles.linksCol} aria-label="Enlaces rápidos">
          <h4>Enlaces Rápidos</h4>
          <ul>
            <li><Link to="/faqs">FAQs</Link></li>
            <li><Link to="/turnos">Registro</Link></li>
            <li><Link to="/noticias">Últimas noticias</Link></li>
          </ul>
        </nav>

        {/* Servicios (placeholders a rutas existentes o por definir más adelante) */}
        <nav className={styles.linksCol} aria-label="Servicios">
          <h4>Servicios</h4>
          <ul>
            <li><Link to="/servicios">Facturación</Link></li>
            <li><Link to="/servicios">Liquidación</Link></li>
            <li><Link to="/servicios">Padrones</Link></li>
          </ul>
        </nav>
      </div>

      {/* Barra de contacto */}
      <div className={styles.contactBar}>
        <div className={styles.contactItem}>
          <span className={styles.iconWrap}>
            <FiMapPin />
          </span>
          <a
            className={styles.contactItem}
            href="https://www.google.com/maps/dir//Carlos+Pellegrini+1785,+Corrientes,+Argentina"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              Carlos Pellegrini 1785, <br />
              Corrientes, Argentina
            </span>
          </a>
        </div>

        <a className={styles.contactItem} href="tel:+543794427421">
          <span className={styles.iconWrap}>
            <FiPhone />
          </span>
          <span>+54 3794 42-7421</span>
        </a>

        <a
          className={styles.contactItem}
          href="mailto:secretaria@colegiomedicodecorrientes.com"
        >
          <span className={styles.iconWrap}>
            <FiMail />
          </span>
          <span>secretaria@colegiomedicodecorrientes.com</span>
        </a>

        <div className={styles.social}>
          <a href="#" aria-label="Facebook">
            <FiFacebook />
          </a>
          <a
            href="https://www.instagram.com/colegiomedicodecorrientes/"
            aria-label="Instagram"
            target="_blank"
            rel="noreferrer"
          >
            <FiInstagram />
          </a>
        </div>
      </div>

      {/* Bottom */}
      <div className={styles.bottom}>
        <p>© {new Date().getFullYear()} Colegio Médico de Corrientes — Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
