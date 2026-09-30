import { ShieldCheck, Handshake, Home, HeartHandshake, UserPlus, HelpCircle } from "lucide-react"
import styles from "./servicios.module.scss"
import ServiceCard from "../../components/UI/ServicesCard/ServicesCard";
import Hero from "../../components/UI/Hero/Hero";
import { useTituloPagina } from "../../lib/useTituloPagina";

export default function ServiciosPage() {
  useTituloPagina("Servicios");

  const secciones = [
    { icon: <ShieldCheck size={22} />, title: "Seguro médico", description: "Coberturas y asistencia para profesionales.", href: "/seguros" },
    { icon: <Handshake size={22} />, title: "Convenios", description: "Obras Sociales con acuerdo vigente.", href: "/convenios" },
    { icon: <Home size={22} />, title: "Quinta", description: "Alquiler y requisitos para el uso de la Quinta.", href: "/quinta" },
    { icon: <HeartHandshake size={22} />, title: "Prevención Salud", description: "Descuento exclusivo en planes de obra social para socios.", href: "/prevencion-salud" },
    { icon: <UserPlus size={22} />, title: "Quiero ser Socio", description: "Requisitos y pasos para asociarte al Colegio.", href: "/socios" },
    { icon: <HelpCircle size={22} />, title: "Preguntas frecuentes", description: "Dudas habituales sobre trámites, convenios y credencial.", href: "/preguntas-frecuentes" },
  ]

  return (
    <>
      <Hero
        title="Servicios"
        subtitle="Soluciones y beneficios para acompañar tu práctica profesional"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc_piwk5o.jpg"
      />

      <section
        className={styles.wrapper}
        aria-label="Servicios del Colegio Médico de Corrientes"
      >
        <div className={styles.cards} role="list">
          {secciones.map((s, i) => (
            <div key={s.title} className={styles.item} role="listitem">
              <ServiceCard icon={s.icon} title={s.title} description={s.description} href={s.href} delay={i * 0.06} />
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
