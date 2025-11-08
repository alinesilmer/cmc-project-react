"use client"

import Seguros from "../../components/Servicios/Seguros/Seguros"
import styles from "./seguros.module.scss"

export default function SegurosPage() {
  return (
    <div className={styles.segurosWrap}>
      <Seguros
        titulo="Convenios de Seguros del Colegio Médico"
        descripcion="Colegio Médico de Corrientes tiene convenio de seguro con la empresa NOBLE. Para mayor información comunicarse por WhatsApp."
        pdfUrl="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        whatsAppNumber="543794404497"
      />
    </div>
  )
}
