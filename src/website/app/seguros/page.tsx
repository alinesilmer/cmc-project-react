import { motion } from "framer-motion"
import Seguros from "../../components/Servicios/Seguros/Seguros"
import styles from "./seguros.module.scss"

export default function SegurosPage() {
  return (
    <motion.div
      className={styles.segurosWrap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Seguros
        titulo="Convenios de Seguros del Colegio Médico"
        descripcion="Colegio Médico de Corrientes tiene convenio de seguro con la empresa NOBLE. Para mayor información comunicarse por WhatsApp."
        pdfUrl="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        whatsAppNumber="543794404497"
      />
    </motion.div>
  )
}
