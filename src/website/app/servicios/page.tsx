import { useEffect } from "react"
import { ShieldCheck, Handshake, Home, Receipt, Gift, Images } from "lucide-react"
import styles from "./servicios.module.scss"
import ServiceCard from "../../components/UI/ServicesCard/ServicesCard";
import Hero from "../../components/UI/Hero/Hero";

export default function ServiciosPage() {
  useEffect(() => {
    document.title = "Servicios | Colegio Médico de Corrientes";
    return () => { document.title = "Colegio Médico de Corrientes"; };
  }, []);

  const secciones = [
    { icon: <ShieldCheck size={22} />, title: "Seguro médico", description: "Coberturas y asistencia para profesionales.", href: "/servicios/seguro-medico" },
    { icon: <Handshake size={22} />, title: "Convenios", description: "Obras Sociales con acuerdo vigente.", href: "/convenios" },
    { icon: <Home size={22} />, title: "Quinta", description: "Alquiler y requisitos para el uso de la Quinta.", href: "/quinta" },
    { icon: <Images size={22} />, title: "Galería de fotos y videos", description: "Multimedia de eventos y vida institucional.", href: "/galeria" },
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
