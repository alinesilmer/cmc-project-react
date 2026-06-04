import { motion } from "framer-motion"
import { CheckCircle } from "lucide-react"
import styles from "./PrevencionSalud.module.scss"
import Button from "../../UI/Button/Button"

const EASE = [0.22, 1, 0.36, 1] as const

const WaIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.862L.054 23.61a.5.5 0 0 0 .608.625l5.99-1.57A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.127-1.422l-.368-.22-3.814 1 .983-3.596-.24-.371A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
  </svg>
)

const contacts = [
  { name: "Yanina", phone: "3794006475" },
  { name: "Belén", phone: "3795860073" },
]

const benefits = [
  "Descuento exclusivo en los planes de Prevención Salud para socios y asociados del Colegio Médico.",
  "Acceso a una amplia red de prestadores médicos a nivel nacional e internacional.",
  "Planes diseñados para profesionales de la salud y su grupo familiar.",
  "Atención personalizada a través de asesores dedicados al convenio.",
  "Y...¡Mucho más!",
]

export default function PrevencionSalud() {
  return (
    <section className={styles.wrapper} aria-label="Convenio con Prevención Salud">

      <motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <span className={styles.badge}>Convenio exclusivo </span>
        <h1 className={styles.titulo}>Prevención Salud</h1>
        <p className={styles.descripcion}>
          Como socio del Colegio Médico de Corrientes, accedés a descuentos especiales
          en los planes de Prevención Salud. Un beneficio pensado para vos y tu familia.
        </p>
        <div className={styles.ctaRow}>
          {contacts.map((c) => (
            <a
              key={c.phone}
              href={`https://wa.me/54${c.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Contactar a ${c.name} por WhatsApp`}
            >
              <Button variant="secondary" size="xlg" icon={<WaIcon />}>
                Consultar con {c.name}
              </Button>
            </a>
          ))}
        </div>
      </motion.div>

      <div className={styles.body}>
      

        <motion.div
          className={styles.benefitsPanel}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        >
          <h2 className={styles.benefitsTitle}>¿Qué incluye el convenio?</h2>
          <ul className={styles.benefitsList}>
            {benefits.map((b) => (
              <li key={b} className={styles.benefitItem}>
                <CheckCircle size={18} className={styles.checkIcon} aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

        </motion.div>
      </div>

    </section>
  )
}
