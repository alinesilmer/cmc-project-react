import { useEffect } from "react"
import { motion } from "framer-motion"
import PrevencionSalud from "../../components/Servicios/PrevencionSalud/PrevencionSalud"
import styles from "./prevencion-salud.module.scss"

export default function PrevencionSaludPage() {
  useEffect(() => {
    document.title = "Prevención Salud | Colegio Médico de Corrientes"
    return () => { document.title = "Colegio Médico de Corrientes" }
  }, [])

  return (
    <motion.div
      className={styles.pageWrap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <PrevencionSalud />
    </motion.div>
  )
}
