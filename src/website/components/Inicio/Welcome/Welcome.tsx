"use client"

import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import { FaUserPlus, FaFileInvoiceDollar, FaCheckCircle, FaNewspaper, FaYoutube } from "react-icons/fa"
import styles from "./Welcome.module.scss"
import Button from "../../../components/UI/Button/Button"
import CategoryCard from "../../../components/UI/CategoryCard/CategoryCard"

const ETICA_PDF = "https://colegiomedicocorrientes.com/CMC092025.pdf"

export default function Welcome() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  }
  return (
    <section className={styles.hero}>
      <motion.div className={styles.wrap} initial="hidden" animate="visible" variants={containerVariants}>
        <motion.div className={styles.bigCard} >
          <div className={styles.contentWrapper}>
            <motion.h2 className={styles.bigCardTitle}>
              Comunidad <br/> Médica
            </motion.h2>

            <motion.div className={styles.tagline} >
              <span className={styles.badge}>
                <FaFileInvoiceDollar className={styles.badgeIcon} />
                Servicio de trámites
              </span>
              <span className={styles.badge}>
                <FaCheckCircle className={styles.badgeIcon} />
                Acompañamiento profesional
              </span>
            </motion.div>

            <motion.p className={styles.lead} >
              Si buscás una forma simple y confiable de gestionar tu práctica, estamos para acompañarte. Unite al
              Colegio y accedé a servicios, beneficios y soporte que facilitan tu día a día.
            </motion.p>

            <motion.div className={styles.ctaRow}>
              <Link to="https://cmc-project-react.vercel.app">
                <Button variant="primary" size="large">
                  <FaUserPlus className={styles.buttonIcon} />
                  Asociarme
                </Button>
              </Link>

              <a href={ETICA_PDF} download="Valores_Eticos_Minimos.pdf">
                <Button variant="secondary" size="large">
                  Ver Boletín Informativo
                </Button>
              </a>
            </motion.div>
          </div>

          <motion.img
            src="https://i.pinimg.com/1200x/9e/a1/c9/9ea1c9ea2380bb6da2755458db9021e4.jpg"
            alt="Profesional de la salud"
            className={styles.imgDecor}
            whileHover={{
              scale: 1.05,
              y: -10,
              transition: { duration: 0.3 },
            }}
          />

          <div className={styles.decorativeElements}>
            <motion.div
              className={styles.floatingCircle1}
              animate={{
                y: [0, -20, 0],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 20,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
            <motion.div
              className={styles.floatingCircle2}
              animate={{
                y: [0, 20, 0],
                rotate: [360, 180, 0],
              }}
              transition={{
                duration: 25,
                repeat: Number.POSITIVE_INFINITY,
                ease: "linear",
              }}
            />
          </div>
        </motion.div>

        <motion.div className={styles.cardsContainer} variants={containerVariants}>
          <motion.div>
            <CategoryCard
              title="Recepción y Liquidación de Facturación"
              description="Recepción y Liquidación de Facturación"
              color="teal"
              href="https://comecorammeco.com/web/"
              icon={<FaFileInvoiceDollar />}
            />
          </motion.div>
          <motion.div >
            <CategoryCard
              title="Entrar a Validar"
              description="Recepción de Facturación"
              color="orange"
              href="https://colegiomedicocorrientes.com/"
              icon={<FaCheckCircle />}
            />
          </motion.div>
          <motion.div>
            <CategoryCard
              title="Noticias"
              description="Actualizaciones, comunicados y eventos del Colegio."
              color="blue"
              href="/noticias"
              icon={<FaNewspaper />}
            />
          </motion.div>
          <motion.div>
            <CategoryCard
              title="Tutoriales para Validar"
              description="Tutoriales para utilizar el sistema, facturación y validación."
              color="mint"
              href="/contacto"
              icon={<FaYoutube />}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  )
}
