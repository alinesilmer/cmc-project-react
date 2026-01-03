import { motion } from "framer-motion";
import { FiCheckCircle } from "react-icons/fi";
import styles from "./MeetDoctors.module.scss";

export default function MeetDoctors() {
  const testimonials = [
    {
      name: "Dr. Carlos Fernández",
      specialty: "Cardiólogo",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
      testimonial:
        "El Colegio simplificó completamente mi gestión administrativa. Ahora puedo dedicar más tiempo a mis pacientes.",
    },
    {
      name: "Dra. María González",
      specialty: "Pediatra",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
      testimonial:
        "La gestión con obras sociales es mucho más ágil. El soporte técnico es excelente y siempre están disponibles.",
    },
    {
      name: "Dr. Juan Martínez",
      specialty: "Traumatólogo",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
      testimonial:
        "Los cursos de capacitación continua son de primera calidad. Mantenerme actualizado nunca fue tan fácil.",
    },
    {
      name: "Dra. Ana López",
      specialty: "Dermatóloga",
      image:
        "https://i.pinimg.com/1200x/c3/69/e2/c369e2ee710c2d19217f85c5627c7095.jpg",
      testimonial:
        "La facturación electrónica me ahorra horas de trabajo. El sistema es intuitivo y muy confiable.",
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className={styles.title}>
            Lo Que Dicen{" "}
            <span className={styles.highlight}>Nuestros Colegas</span>
          </h2>
          <p className={styles.description}>
            Profesionales médicos que ya forman parte del Colegio comparten su
            experiencia
          </p>
        </motion.div>

        <div className={styles.grid}>
          {testimonials.map((t, index) => (
            <motion.div
              key={index}
              className={styles.testimonialCard}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -10 }}
            >
              <div className={styles.imageWrapper}>
                <img
                  src={t.image || "/placeholder.svg"}
                  alt={t.name}
                  loading="lazy"
                  className={styles.image}
                />
                <div className={styles.checkmark}>
                  <FiCheckCircle />
                </div>
              </div>

              <div className={styles.info}>
                <h3 className={styles.name}>{t.name}</h3>
                <p className={styles.specialty}>{t.specialty}</p>
                <p className={styles.testimonial}>{t.testimonial}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
