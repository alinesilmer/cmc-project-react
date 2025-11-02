"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import styles from "./DoctorReimbursement.module.scss";

export default function DoctorBenefits() {
  const benefits = [
    {
      title: "Gestión Administrativa",
      description:
        "Simplifique su práctica con nuestro sistema integral de gestión administrativa. Facturación, liquidación y trámites en un solo lugar.",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
    },
    {
      title: "Asesoramiento Legal",
      description:
        "Acceda a asesoramiento legal especializado en derecho médico. Proteja su práctica profesional con expertos.",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
    },
    {
      title: "Capacitación Continua",
      description:
        "Mantenga su matrícula actualizada con cursos, seminarios y eventos de formación profesional continua.",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
    },
    {
      title: "Red de Contactos",
      description:
        "Conecte con colegas, comparta experiencias y participe en eventos profesionales. Fortalezca su red de contactos médicos.",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
    },
  ];

  return (
    <section className={styles.section} id="beneficios">
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className={styles.header}
        >
          <h2 className={styles.title}>Beneficios de Asociarse</h2>
          <p className={styles.subtitle}>
            Su práctica, nuestra prioridad. Descubra todas las ventajas que
            tenemos para ofrecerle como profesional médico.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className={styles.grid}>
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className={styles.card}
            >
              {/* Image */}
              <div className={styles.imageContainer}>
                <Image
                  src={benefit.image || "/placeholder.svg"}
                  alt={benefit.title}
                  fill
                />
              </div>

              {/* Content */}
              <div className={styles.content}>
                <h3 className={styles.cardTitle}>{benefit.title}</h3>
                <p className={styles.cardDescription}>{benefit.description}</p>
              </div>

              {/* Number indicator */}
              <div className={styles.numberBadge}>
                <span>{index + 1}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
