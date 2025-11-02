"use client";

import { FiFileText, FiDollarSign, FiUsers, FiShield } from "react-icons/fi";
import styles from "./ServicesGrid.module.scss";
import ServiceCard from "../ServiceCard/ServiceCard";

export default function ServicesGrid() {
  const services = [
    {
      title: "Facturación Profesional",
      description: "Gestión completa de facturación.",
      color: "green" as const,
      icon: <FiFileText />,
      delay: 0,
    },
    {
      title: "Liquidación de Honorarios",
      description: "Procesamiento rápido y seguro.",
      color: "yellow" as const,
      icon: <FiDollarSign />,
      delay: 0.1,
    },
    {
      title: "Gestión con Obras Sociales",
      description: "Enlace directo y eficiente.",
      color: "pink" as const,
      icon: <FiUsers />,
      delay: 0.2,
    },
    {
      title: "Valores Éticos",
      description: "Guías y normativas actualizadas.",
      color: "blue" as const,
      icon: <FiShield />,
      delay: 0.3,
    },
  ];

  return (
    <section className={styles.servicesGrid}>
      <div className={styles.container}>
        {services.map((service, index) => (
          <ServiceCard key={index} {...service} />
        ))}
      </div>
    </section>
  );
}
