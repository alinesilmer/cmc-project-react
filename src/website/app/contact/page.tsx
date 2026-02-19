import { FiMapPin, FiMail, FiPhone } from "react-icons/fi";
import styles from "./contact.module.scss";
import PageHero from "../../components/UI/Hero/Hero";

export default function Contacto() {
  return (
    <div className={styles.page}>
      <PageHero
        title="Contacto"
        subtitle="¿Tenés consultas? Estamos para ayudarte"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1762129462/contactbg_dcrwvz.png"
      />

      <section className={styles.contactStrip}>
        <div className={styles.contactContainer}>
          <div className={styles.col}>
            <div className={styles.colIcon}><FiMapPin /></div>
            <h3 className={styles.colTitle}>VISITANOS</h3>
            <p className={styles.colText}>
              Estamos en el centro de la ciudad. Podés acercarte para realizar consultas y trámites.
            </p>
            <a href="#" className={styles.colHighlight}>Carlos Pellegrini 1785, Corrientes, AR</a>
          </div>

          <div className={styles.col}>
            <div className={styles.colIcon}><FiPhone /></div>
            <h3 className={styles.colTitle}>LLAMANOS</h3>
            <p className={styles.colText}>
              Comunicate con nuestro equipo para turnos, información y consultas generales.
            </p>
            <a href="tel:+543794252323" className={styles.colHighlight}>+54 3794 252323</a>
          </div>

          <div className={styles.col}>
            <div className={styles.colIcon}><FiMail /></div>
            <h3 className={styles.colTitle}>CONTACTANOS</h3>
            <p className={styles.colText}>
              Escribinos y te responderemos a la brevedad. Incluí tu nombre y motivo del contacto.
            </p>
            <a href="mailto:secretaria@colegiomedicocorrientes.com" className={styles.colHighlight}>secretaria@colegiomedicocorrientes.com</a>
          </div>
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
