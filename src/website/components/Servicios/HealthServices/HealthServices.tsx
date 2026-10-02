import { FileText, DollarSign, Users, BookOpen, Award, Headphones } from "lucide-react";
import ServiceCard from "../../UI/ServicesCard/ServicesCard";
import Revelar from "../../UI/Revelar/Revelar";
import styles from "./HealthServices.module.scss";

const SERVICIOS = [
  { icon: <FileText />, title: "Facturación Electrónica", description: "Sistema moderno de facturación electrónica integrado con todas las obras sociales. Rápido, seguro y eficiente." },
  { icon: <DollarSign />, title: "Liquidación de Honorarios", description: "Procesamiento ágil de liquidaciones con seguimiento en tiempo real. Transparencia total en sus cobros." },
  { icon: <Users />, title: "Padrones de Obras Sociales", description: "Enlace directo con obras sociales y prepagas. Simplificamos la gestión de autorizaciones y reintegros." },
  { icon: <BookOpen />, title: "Normativas y Valores", description: "Acceso a la lista actualizada de valores éticos, normativas vigentes y guías de práctica profesional." },
  { icon: <Award />, title: "Certificaciones", description: "Gestión de certificados, constancias de matrícula y documentación profesional de forma digital." },
  { icon: <Headphones />, title: "Soporte Personalizado", description: "Atención personalizada para resolver consultas administrativas, técnicas y profesionales." },
];

export default function HealthServices() {
  return (
    <section className={styles.section} id="servicios">
      <div className={styles.container}>
        <Revelar className={styles.header} duracion={0.65}>
          <h2 className={styles.title}>Nuestros Servicios</h2>
        </Revelar>

        <div className={styles.list} role="list">
          {SERVICIOS.map((s, i) => (
            <div key={s.title} role="listitem" className={styles.item}>
              <ServiceCard icon={s.icon} title={s.title} description={s.description} delay={i * 0.08} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
