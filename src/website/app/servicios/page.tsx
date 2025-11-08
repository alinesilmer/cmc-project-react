"use client"

import { Users, ShieldCheck, Handshake, Home, Receipt, Gift, Images } from "lucide-react"
import styles from "./servicios.module.scss"
import ServiceCard from "../../components/UI/ServicesCard/ServicesCard";
import Hero from "../../components/UI/Hero/Hero";

export default function ServiciosPage() {
  const secciones = [
    { icon: <Users size={22} />, title: "Socios", description: "Gestiones, altas, credenciales y más.", href: "/servicios/socios" },
    { icon: <ShieldCheck size={22} />, title: "Seguro médico", description: "Coberturas y asistencia para profesionales.", href: "/servicios/seguro-medico" },
    { icon: <Handshake size={22} />, title: "Convenios", description: "Obras Sociales con acuerdo vigente.", href: "/convenios" },
    { icon: <Home size={22} />, title: "Quinta", description: "Alquiler y requisitos de la Quinta.", href: "/quinta" },
    { icon: <Receipt size={22} />, title: "Facturación online", description: "Herramientas para liquidar y facturar.", href: "/servicios/facturacion-online" },
    { icon: <Gift size={22} />, title: "Beneficios", description: "Descuentos y programas especiales.", href: "/servicios/beneficios" },
    { icon: <Images size={22} />, title: "Galería de fotos y videos", description: "Eventos y vida institucional.", href: "/galeria" },
  ]

  return (
    <div>
    <div>
     <Hero
      title="Servicios"
      subtitle="Soluciones y beneficios para acompañar tu práctica profesional"
      backgroundImage={"https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc_piwk5o.jpg"}
      />
      </div>
    <section className={styles.wrapper} aria-label="Servicios del Colegio Médico de Corrientes">
    

      <div className={styles.cards} role="list">
        {secciones.map((s, i) => (
          <div key={s.title} className={styles.item} role="listitem">
            <ServiceCard icon={s.icon} title={s.title} description={s.description} href={s.href} delay={i * 0.06} />
          </div>
        ))}
      </div>
    </section>
    </div>
  )
}
