"use client";

import { motion } from "framer-motion";
import {
  FiFileText,
  FiDollarSign,
  FiUsers,
  FiBookOpen,
  FiAward,
  FiHeadphones,
} from "react-icons/fi";
import styles from "./HealthServices.module.scss";

export default function HealthServices() {
  const services = [
    {
      icon: <FiFileText />,
      title: "Facturación Electrónica",
      description:
        "Sistema moderno de facturación electrónica integrado con todas las obras sociales. Rápido, seguro y eficiente.",
    },
    {
      icon: <FiDollarSign />,
      title: "Liquidación de Honorarios",
      description:
        "Procesamiento ágil de liquidaciones con seguimiento en tiempo real. Transparencia total en sus cobros.",
    },
    {
      icon: <FiUsers />,
      title: "Padrones de Obras Sociales",
      description:
        "Enlace directo con obras sociales y prepagas. Simplificamos la gestión de autorizaciones y reintegros.",
    },
    {
      icon: <FiBookOpen />,
      title: "Normativas y Valores",
      description:
        "Acceso a la lista actualizada de valores éticos, normativas vigentes y guías de práctica profesional.",
    },
    {
      icon: <FiAward />,
      title: "Certificaciones",
      description:
        "Gestión de certificados, constancias de matrícula y documentación profesional de forma digital.",
    },
    {
      icon: <FiHeadphones />,
      title: "Soporte Personalizado",
      description:
        "Atención personalizada para resolver consultas administrativas, técnicas y profesionales.",
    },
  ];

  return (
    <section className={styles.section} id="servicios">
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={styles.header}
        >
          <h2 className={styles.title}>Nuestros Servicios</h2>
          <p className={styles.subtitle}>
            Herramientas y servicios diseñados para simplificar su práctica
            médica
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className={styles.grid}>
          {services.map((service, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={styles.card}
            >
              {/* Icon */}
              <div className={styles.icon}>{service.icon}</div>

              {/* Content */}
              <h3 className={styles.cardTitle}>{service.title}</h3>
              <p className={styles.cardDescription}>{service.description}</p>

              {/* Hover indicator */}
              <div className={styles.hoverIndicator}>
                <FiArrowRight />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FiArrowRight() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 12h14m-7-7l7 7-7 7"
      />
    </svg>
  );
}
