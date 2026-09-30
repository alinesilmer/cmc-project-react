import { motion } from "framer-motion"
import Seguros from "../../components/Servicios/Seguros/Seguros"
import Hero from "../../components/UI/Hero/Hero"
import { useTituloPagina } from "../../lib/useTituloPagina"
import styles from "./seguros.module.scss"

export default function SegurosPage() {
  useTituloPagina("Seguro médico")

  return (
    <>
      <Hero
        title="Seguro médico"
        subtitle="Convenio con NOBLE: cobertura y asistencia para tu práctica profesional"
      />

      <motion.div
        className={styles.segurosWrap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
      <Seguros
        titulo="Convenios de Seguros del Colegio Médico"
        descripcion="Colegio Médico de Corrientes tiene convenio de seguro con la empresa NOBLE. Para mayor información comunicarse por WhatsApp."
        whatsAppNumber="543794404497"
      />
      </motion.div>
    </>
  )
}
