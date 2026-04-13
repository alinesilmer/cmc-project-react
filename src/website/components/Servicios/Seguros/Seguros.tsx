import React from "react"
import { motion } from "framer-motion"
import { FaWhatsapp } from "react-icons/fa"
import styles from "./Seguros.module.scss"
import Button from "../../UI/Button/Button"

const EASE = [0.22, 1, 0.36, 1] as const

type Props = {
  titulo?: string
  descripcion?: string
  pdfUrl: string
  whatsAppNumber?: string
  whatsAppLabel?: React.ReactNode
  whatsAppMessage?: string
}

export default function Seguros({
  titulo = "Convenios de Seguros del Colegio Médico",
  descripcion = "Colegio Médico de Corrientes tiene convenio de seguro con la empresa NOBLE. Para mayor información comunicarse por WhatsApp.",
  pdfUrl,
  whatsAppNumber = "543794404497",
  whatsAppLabel = "Consultar por WhatsApp",
  whatsAppMessage = "Hola, quiero más información sobre los convenios de seguros del Colegio Médico.",
}: Props) {
  const waHref = `https://wa.me/${whatsAppNumber}?text=${encodeURIComponent(whatsAppMessage)}`
  return (
    <section className={styles.wrapper} aria-label="Seguros del Colegio">
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        <motion.div
          className={styles.left}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
        >
          <h3 className={styles.titulo}>{titulo}</h3>
          <p className={styles.descripcion}>{descripcion}</p>
          <div className={styles.ctaRow}>
            <a href={waHref} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp">
              <Button variant="secondary" size="xlg">
                <FaWhatsapp className={styles.icono} />
                <span>{whatsAppLabel}</span>
              </Button>
            </a>
          </div>
        </motion.div>
        <motion.div
          className={styles.right}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        >
          <div className={styles.kpi}>
            <img src="https://imgs.search.brave.com/WOBL2FyYc7H2PFSiS0fQHdHtSfbAbIo8dF-1SrjY89k/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jYW1w/dXN2aXJ0dWFsLW5v/Ymxlc2VndXJvcy5j/b20vcGx1Z2luZmls/ZS5waHAvMS90aGVt/ZV9tYjJubC9sb2dv/LzE2ODQzMzY1NTkv/bm9ibGVfbG9nb19u/ZWdyby5wbmc" alt="Noble Logo"/>
            <span className={styles.kpiBig}>NOBLE</span>
          </div>
          <div className={styles.decor} />
        </motion.div>
      </motion.div>
    </section>
  )
}
