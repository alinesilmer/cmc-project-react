"use client"

import { FiFileText, FiDollarSign, FiUsers, FiBookOpen, FiAward, FiHeadphones } from "react-icons/fi"
import styles from "./HealthServices.module.scss"
import ServiceCard from "../../UI/ServicesCard/ServicesCard";

export default function HealthServices() {
  const services = [
    { icon: <FiFileText />, title: "Facturación Electrónica", description: "Sistema moderno de facturación electrónica integrado con todas las obras sociales. Rápido, seguro y eficiente." },
    { icon: <FiDollarSign />, title: "Liquidación de Honorarios", description: "Procesamiento ágil de liquidaciones con seguimiento en tiempo real. Transparencia total en sus cobros." },
    { icon: <FiUsers />, title: "Padrones de Obras Sociales", description: "Enlace directo con obras sociales y prepagas. Simplificamos la gestión de autorizaciones y reintegros." },
    { icon: <FiBookOpen />, title: "Normativas y Valores", description: "Acceso a la lista actualizada de valores éticos, normativas vigentes y guías de práctica profesional." },
    { icon: <FiAward />, title: "Certificaciones", description: "Gestión de certificados, constancias de matrícula y documentación profesional de forma digital." },
    { icon: <FiHeadphones />, title: "Soporte Personalizado", description: "Atención personalizada para resolver consultas administrativas, técnicas y profesionales." },
  ]

  return (
    <section className={styles.section} id="servicios">
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Nuestros Servicios</h2>
          <p className={styles.subtitle}>Herramientas y servicios diseñados para simplificar su práctica médica</p>
        </div>

        <div className={styles.list} role="list">
          {services.map((s, i) => (
            <div key={s.title} role="listitem" className={styles.item}>
              <ServiceCard icon={s.icon} title={s.title} description={s.description} delay={i * 0.08} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
