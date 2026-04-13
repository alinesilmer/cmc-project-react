import { motion } from "framer-motion"
import Quinta from "../../components/Servicios/Quinta/Quinta"
import styles from "./quinta.module.scss"

export default function QuintaPage() {
  return (
    <motion.div
      className={styles.quintaWrap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Quinta
        titulo="Quinta del Colegio"
        descripcion="Conocé los requisitos y condiciones para reservar la Quinta del Colegio Médico de Corrientes."
        pdfUrl="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        etiquetaBoton="Descargar requisitos"
      />
    </motion.div>
  )
}
