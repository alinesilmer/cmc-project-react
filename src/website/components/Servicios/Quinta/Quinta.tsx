"use client"

import React from "react"
import { FaDownload } from "react-icons/fa"
import { Calendar, Info, Phone } from "lucide-react"
import styles from "./Quinta.module.scss"
import Button from "../../UI/Button/Button"

type Props = {
  titulo?: string
  descripcion?: string
  pdfUrl: string
  etiquetaBoton?: React.ReactNode
}

const PHONE_AR = "543794404497"
const WA_MSG = "Hola, quisiera solicitar información y reservar la Quinta del Colegio."
const WA_LINK = `https://wa.me/${PHONE_AR}?text=${encodeURIComponent(WA_MSG)}`

export default function Quinta({
  titulo = "Quinta del Colegio",
  descripcion = "Requisitos y condiciones para alquilar la Quinta del Colegio Médico de Corrientes.",
  pdfUrl,
  etiquetaBoton = "Descargar requisitos",
}: Props) {
  return (
    <section className={styles.wrapper} aria-label="Quinta del Colegio">
      <div className={styles.header}>
        <div className={styles.headLeft}>
          <h3 className={styles.titulo}>{titulo}</h3>
          <p className={styles.descripcion}>{descripcion}</p>
          <div className={styles.ctaRow}>
            <a href={pdfUrl} download aria-label="Descargar PDF con requisitos">
              <Button variant="secondary" size="large">
                <FaDownload className={styles.iconInline} />
                <span>{etiquetaBoton}</span>
              </Button>
            </a>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" aria-label="Reservar por WhatsApp">
              <Button variant="primary" size="large">
                <Phone className={styles.iconInline} />
                <span>Reservar por WhatsApp</span>
              </Button>
            </a>
          </div>
        </div>
        <div className={styles.headRight}>
          <div className={styles.badge}>
            <Calendar size={18} />
            <span>Temporada de pileta</span>
          </div>
          <div className={styles.heroGlow} />
          <div className={styles.heroGlow2} />
        </div>
      </div>

      <div className={styles.infoPanel}>
        <div className={styles.infoHeader}>
          <div className={styles.infoTitleWrap}>
            <Info size={20} />
            <h4 className={styles.infoTitle}>Información importante</h4>
          </div>
          <span className={styles.infoChip}>⛔ Obligatorio</span>
        </div>

        <ul className={styles.infoList}>
          <li>Para usar la pileta e instalaciones, estar al día con la cuota societaria.</li>
          <li>Realizar el trámite del carnet de socio. Se avisará cuándo podrán acercarse por la sede: Pellegrini 1785.</li>
          <li>Se avisará también el inicio de la temporada de pileta. Estar atentos a las publicaciones.</li>
          <li>Muchas gracias — Comisión Directiva.</li>
        </ul>

        <div className={styles.contactBox}>
          <div className={styles.contactLeft}>
            <span className={styles.contactLabel}>Reservas anticipadas</span>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.contactPhone}
              aria-label="Contactar a Natalia Rojas por WhatsApp"
            >
              3794-404497 · Sra. Natalia Rojas
            </a>
          </div>
          <div className={styles.contactRight}>
            <span className={styles.attnLabel}>Atención</span>
            <span className={styles.attnText}>Lunes a viernes · 08:00 a 14:00</span>
          </div>
        </div>
      </div>
    </section>
  )
}
