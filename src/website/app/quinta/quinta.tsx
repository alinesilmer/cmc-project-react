import { motion } from "framer-motion"
import Quinta from "../../components/Servicios/Quinta/Quinta"
import Hero from "../../components/UI/Hero/Hero"
import { useTituloPagina } from "../../lib/useTituloPagina"
import styles from "./quinta.module.scss"

export default function QuintaPage() {
  useTituloPagina("Quinta")

  return (
    <>
      <Hero
        title="Quinta del Colegio"
        subtitle="Requisitos y condiciones para reservar la Quinta"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc3_s6sffw.jpg"
      />

      <motion.div
        className={styles.quintaWrap}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
      <Quinta
        titulo="Quinta del Colegio"
        descripcion="Conocé los requisitos y condiciones para reservar la Quinta del Colegio Médico de Corrientes."
        etiquetaBoton="Descargar requisitos"
      />
      </motion.div>
    </>
  )
}
