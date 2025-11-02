import { motion } from "framer-motion";
import {
  FiMapPin,
  FiMail,
  FiClock,
  FiInstagram,
  FiFacebook,
  FiHeadphones,
} from "react-icons/fi";
import styles from "./contact.module.scss";
import PageHero from "../../components/UI/Hero/Hero";

export default function Contacto() {
  const medios = [
    { icon: <FiMail />,  titulo: "Email",    primario: "Link al correo"},
  ];
  const redes = [
    { icon: <FiInstagram />, nombre: "Instagram", url: "#" },
    { icon: <FiFacebook />,  nombre: "Facebook",  url: "#" },
  ];
  const horarios = [
    { dia: "Lunes a Viernes ", rango: "   08:00–18:00" },
    { dia: "Sábados",         rango: "09:00–13:00" },
    { dia: "Feriados",        rango: "Cerrado" },
  ];

  return (
    <div className={styles.page}>
        <PageHero
        title="Contacto"
        subtitle="¿Tenés consultas? Estamos para ayudarte"
        backgroundImage="https://i.pinimg.com/736x/45/79/6d/45796d42a084a0d5d2675b189de92721.jpg"
      />
      <section className={styles.hero}>
        <div className={styles.heroGridBg} aria-hidden="true" />
        <div className={styles.heroContent}>
          <motion.div
            className={styles.heroText}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <h1 className={styles.heroTitle}>¿Tenés consultas? Estamos para ayudarte</h1>
            <p className={styles.heroSubtitle}>
              Canales de contacto para socios, profesionales y público en general.
            </p>
            <div className={styles.infoGrid}>
              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><FiMapPin /></div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoTitle}>Ubicación</h3>
                  <p className={styles.infoText}>
                    Colegio Médico de Corrientes<br />
                    Dirección de ejemplo 123<br />
                    Corrientes, Argentina
                  </p>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><FiClock /></div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoTitle}>Horarios</h3>
                  {horarios.map((h, i) => (
                    <p key={i} className={styles.infoText}>
                      <span className={styles.day}>{h.dia}</span>
                      <span className={styles.hours}>{h.rango}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoIcon}><FiHeadphones /></div>
                <div className={styles.infoContent}>
                  <h3 className={styles.infoTitle}>Redes</h3>
                  <div className={styles.socialLinks}>
                    {redes.map((r, i) => (
                      <a key={i} href={r.url} className={styles.socialLink} aria-label={r.nombre} target="_blank" rel="noreferrer">
                        {r.icon}
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              {medios.map((m, i) => (
                <div key={i} className={styles.infoCard}>
                  <div className={styles.infoIcon}>{m.icon}</div>
                  <div className={styles.infoContent}>
                    <h3 className={styles.infoTitle}>{m.titulo}</h3>
                    <p className={styles.infoText}>{m.primario}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className={styles.Image}
            initial={{ opacity: 0, x: 22 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
          >
            {/*<img src="https://i.pinimg.com/1200x/c9/ef/a2/c9efa22d3d889cc91f5d988bedbe1430.jpg" alt="image"/>*/}
            </motion.div>
        </div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.mapContainer}>
          <div className={styles.mapEmbed}>
            <iframe
              className={styles.mapIframe}
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.1035993211517!2d-58.8279958!3d-27.466033900000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94456ca75442b0d5%3A0x6579bf31d9d171fc!2sColegio%20M%C3%A9dico%20de%20Corrientes!5e0!3m2!1ses!2sar!4v1761223450529!5m2!1ses!2sar"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Mapa — Colegio Médico de Corrientes"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
