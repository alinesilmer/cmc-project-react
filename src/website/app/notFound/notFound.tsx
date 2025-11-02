"use client";

import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home } from "lucide-react";
import { FaUserDoctor  } from "react-icons/fa6";
import styles from "./notFound.module.scss";

export default function notFound() {
  return (
    <section className={styles.wrapper}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className={styles.icon}>
          <FaUserDoctor size={36} />
        </div>

        <h1 className={styles.code}>¡Atención!</h1>
        <h2 className={styles.title}>Página en mantenimiento</h2>
        <p className={styles.text}>
          Lo sentimos, no pudimos encontrar la página que buscás. Es posible que
          se haya movido o que el enlace sea incorrecto.
        </p>

        <div className={styles.actions}>
          <Link to="/" className={`${styles.btn} ${styles.primary}`}>
            <Home size={18} /> Ir al inicio
          </Link>
        </div>
      </motion.div>
    </section>
  );
};