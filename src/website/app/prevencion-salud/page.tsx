import { motion } from "framer-motion"
import PrevencionSalud from "../../components/Servicios/PrevencionSalud/PrevencionSalud"
import Hero from "../../components/UI/Hero/Hero"
import { useTituloPagina } from "../../lib/useTituloPagina"
import styles from "./prevencion-salud.module.scss"

export default function PrevencionSaludPage() {
  useTituloPagina("Prevención Salud")

  return (
    <>
      <Hero
        title="Prevención Salud"
        subtitle="Descuento exclusivo en planes de obra social para socios del Colegio"
      />

      <motion.div
        className={styles.pageWrap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <PrevencionSalud />
      </motion.div>
    </>
  )
}
