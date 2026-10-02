import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  UserCheck,
  Shield,
  BookOpen,
  Award,
  Headphones,
  Users,
  UserPlus,
  ReceiptText,
  CircleCheck,
  Newspaper,
  Youtube,
  ArrowRight,
} from "lucide-react";
import Button from "../../UI/Button/Button";
import Enlace from "../../UI/Enlace/Enlace";
import Revelar from "../../UI/Revelar/Revelar";
import { EASE } from "../../../lib/motion";
import styles from "./Welcome.module.scss";

// Decorativa, en Cloudinary con q_auto/f_auto: pesaba 1,52 MB en el repo.
const ESTETOSCOPIO =
  "https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/w_600,c_limit/v1790263647/stethoscope-deco_x8srvv.png";

type Tarjeta = { icon: ReactNode; title: string; description: string };

const BENEFICIOS: Tarjeta[] = [
  { icon: <UserCheck />, title: "Ejercicio legal", description: "Matrícula e inscripción con pleno respaldo institucional." },
  { icon: <Shield />, title: "Defensa profesional", description: "Representación de los intereses y necesidades de los médicos." },
  { icon: <BookOpen />, title: "Formación continua", description: "Cursos, jornadas y actualizaciones profesionales permanentes." },
  { icon: <Award />, title: "Ética y calidad", description: "Compromiso con la buena práctica médica y la excelencia." },
  { icon: <Headphones />, title: "Servicios y asesoramiento", description: "Apoyo administrativo e institucional a cada colegiado." },
  { icon: <Users />, title: "Comunidad médica", description: "Participación, conexión y pertenencia al Colegio." },
];

const ACCESOS: (Tarjeta & { href: string })[] = [
  {
    title: "Recepción y Liquidación de Facturación",
    description: "Ingresá al portal de facturación y liquidación.",
    href: "https://comecorammeco.com/web/",
    icon: <ReceiptText />,
  },
  {
    title: "Médicos Asociados",
    description: "Conocé a nuestros socios y especialidades.",
    href: "/medicos-asociados",
    icon: <CircleCheck />,
  },
  {
    title: "Noticias",
    description: "Comunicados, novedades y eventos del Colegio.",
    href: "/noticias",
    icon: <Newspaper />,
  },
  {
    title: "Tutoriales para Validar",
    description: "Guías y ayuda para validación y uso del sistema.",
    href: "/contacto",
    icon: <Youtube />,
  },
];

export default function Welcome() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.heroSection}>
          <Revelar className={styles.header} duracion={0.65}>
            <h2 className={styles.title}>
              Donde la <i>comunidad</i> y el <i>bienestar</i> se unen
            </h2>
          </Revelar>

          <motion.img
            src={ESTETOSCOPIO}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={styles.heroDeco}
            style={{ y: "-50%" }}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-70px" }}
            transition={{ duration: 0.75, ease: EASE, delay: 0.2 }}
          />
        </div>

        <ul className={styles.benefitsGrid}>
          {BENEFICIOS.map((b, i) => (
            <Revelar key={b.title} como="li" className={styles.benefitCard} distancia={18} retraso={i * 0.07} duracion={0.5}>
              <div className={styles.benefitIcon} aria-hidden="true">
                {b.icon}
              </div>
              <h3 className={styles.benefitTitle}>{b.title}</h3>
              <p className={styles.benefitDesc}>{b.description}</p>
            </Revelar>
          ))}
        </ul>

        <Revelar className={styles.ctaRow} distancia={12} retraso={0.15} duracion={0.55}>
          <Button to="/socios" variant="secondary" size="xlg" className={styles.ctaBoton} iconoIzquierda={<UserPlus />}>
            Asociarme
          </Button>
        </Revelar>

        <Revelar className={styles.quickHeader} distancia={12} duracion={0.55}>
          <h3 className={styles.quickTitle}>Accesos rápidos</h3>
        </Revelar>

        <ul className={styles.quickGrid}>
          {ACCESOS.map((card, i) => (
            <Revelar key={card.title} como="li" distancia={18} retraso={i * 0.07} duracion={0.5}>
              <Enlace href={card.href} className={styles.quickCardLink}>
                <div className={styles.quickCard}>
                  <div className={styles.quickCardTop}>
                    <div className={styles.quickCardIcon} aria-hidden="true">
                      {card.icon}
                    </div>
                    <ArrowRight className={styles.quickCardArrow} aria-hidden="true" />
                  </div>
                  <h4 className={styles.quickCardTitle}>{card.title}</h4>
                  <p className={styles.quickCardDesc}>{card.description}</p>
                </div>
              </Enlace>
            </Revelar>
          ))}
        </ul>
      </div>
    </section>
  );
}
