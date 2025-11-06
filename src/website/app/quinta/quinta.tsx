"use client"

import Quinta from "../../components/Servicios/Quinta/Quinta"
import styles from "./quinta.module.scss"

export default function QuintaPage() {
  return (
    <div className={styles.quintaWrap}>
      <Quinta
        titulo="Quinta del Colegio"
        descripcion="Conocé los requisitos y condiciones para reservar la Quinta del Colegio Médico de Corrientes."
        pdfUrl="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
        etiquetaBoton="Descargar requisitos"
      />
    </div>
  )
}
