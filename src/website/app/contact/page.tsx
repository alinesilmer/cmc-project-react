import { useEffect, useRef, useState } from "react";
import { FiMapPin, FiMail, FiPhone, FiExternalLink } from "react-icons/fi";
import { motion } from "framer-motion";
import styles from "./contact.module.scss";
import PageHero from "../../components/UI/Hero/Hero";

const MAPS_EMBED_SRC =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3540.1035993211517!2d-58.8279958!3d-27.466033900000003!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94456ca75442b0d5%3A0x6579bf31d9d171fc!2sColegio%20M%C3%A9dico%20de%20Corrientes!5e0!3m2!1ses!2sar!4v1761223450529!5m2!1ses!2sar";

const MAPS_LINK =
  "https://www.google.com/maps/dir//Carlos+Pellegrini+1785,+Corrientes,+Argentina";

const EASE = [0.22, 1, 0.36, 1] as const;

const CONTACT_ITEMS = [
  {
    icon: FiMapPin,
    label: "Dirección",
    value: "Carlos Pellegrini 1785, Corrientes",
    href: MAPS_LINK,
    external: true,
  },
  {
    icon: FiPhone,
    label: "Teléfono",
    value: "+54 3794 252323",
    href: "tel:+543794252323",
    external: false,
  },
  {
    icon: FiMail,
    label: "Correo electrónico",
    value: "secretaria@colegiomedicocorrientes.com",
    href: "mailto:secretaria@colegiomedicocorrientes.com",
    external: false,
  },
] as const;

function MapEmbed() {
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setBlocked((prev) => (prev || !loaded ? true : prev));
    }, 8_000);
    return () => clearTimeout(timerRef.current!);
  }, [loaded]);

  const handleLoad = () => {
    clearTimeout(timerRef.current!);
    setLoaded(true);
    setBlocked(false);
  };

  return (
    <div className={styles.mapWrap}>
      {!blocked && (
        <iframe
          className={styles.mapIframe}
          src={MAPS_EMBED_SRC}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Mapa — Colegio Médico de Corrientes"
          onLoad={handleLoad}
        />
      )}

      {blocked && (
        <div className={styles.mapFallback}>
          <FiMapPin size={28} className={styles.mapFallbackIcon} />
          <p className={styles.mapFallbackText}>
            El mapa no pudo cargarse (puede estar bloqueado por una extensión).
          </p>
        </div>
      )}

      <a
        href={MAPS_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.mapChip}
      >
        <FiExternalLink size={13} />
        Cómo llegar
      </a>
    </div>
  );
}

export default function Contacto() {
  return (
    <div className={styles.page}>
      <PageHero
        title="Contacto"
        subtitle="¿Tenés consultas? Estamos para ayudarte"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1762129462/contactbg_dcrwvz.png"
      />

      <section className={styles.section}>
        <div className={styles.container}>

          {/* Left — info */}
          <motion.div
            className={styles.infoCol}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <h2 className={styles.infoTitle}>Estamos para ayudarte</h2>
            <p className={styles.infoLead}>
              Podés comunicarte con nosotros por cualquiera de los siguientes medios.
              Nuestro equipo te responderá a la brevedad.
            </p>

            <ul className={styles.contactList} aria-label="Medios de contacto">
              {CONTACT_ITEMS.map(({ icon: Icon, label, value, href, external }, i) => (
                <motion.li
                  key={label}
                  className={styles.contactItem}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, ease: EASE, delay: i * 0.08 }}
                >
                  <div className={styles.itemIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <div className={styles.itemBody}>
                    <span className={styles.itemLabel}>{label}</span>
                    <a
                      href={href}
                      className={styles.itemValue}
                      {...(external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                    >
                      {value}
                    </a>
                  </div>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right — map */}
          <motion.div
            className={styles.mapCol}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
          >
            <MapEmbed />
          </motion.div>

        </div>
      </section>
    </div>
  );
}
