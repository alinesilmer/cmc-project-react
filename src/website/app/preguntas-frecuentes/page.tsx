import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown as FiChevronDown } from "lucide-react";
import Hero from "../../components/UI/Hero/Hero";
import heroBg from "../../assets/images/faq2.png";
import styles from "./PreguntasFrecuentes.module.scss";

// ─── Content ──────────────────────────────────────────────────────────────────

interface FaqItem {
  q: string;
  a: string | readonly string[];
}

interface FaqSection {
  id: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  faqs: FaqItem[];
}

const SECTIONS: FaqSection[] = [
  {
    id: "generales",
    eyebrow: "General",
    title: "Preguntas Generales",
    faqs: [
      {
        q: "¿Cómo me asocio al Colegio Médico de Corrientes?",
        a: "Para asociarte, podés consultar los requisitos e información en la sección Socios de nuestro sitio. Para iniciar el trámite o resolver dudas específicas, contactá directamente al área de Padrones.",
      },
      {
        q: "¿En qué horario atiende el Colegio?",
        a: "El horario de atención es de lunes a viernes de 7:00 a 15:00 horas.",
      },
      {
        q: "¿Cómo sé si una práctica requiere autorización previa?",
        a: "Para consultar si una práctica requiere autorización, ingresá al sector Normativas de nuestra página web, donde encontrarás el listado actualizado de prácticas y sus requerimientos.",
      },
      {
        q: "¿Cómo consulto los valores de prestaciones de una obra social?",
        a: [
          "Para consultar los valores por obra social y código:",
          "1. Ingresá al sistema con tu usuario y contraseña.",
          "2. Dirigite a la sección «Valor Prestaciones».",
          "3. Seleccioná la obra social y el código que deseás consultar.",
        ],
      },
      {
        q: "¿Cómo puedo verificar si una obra social tiene convenio?",
        a: "Podés consultar el listado completo de obras sociales con convenio en la sección Convenios de nuestro sitio web. También podés preguntar directamente al área de Auditoría.",
      },
      {
        q: "¿Dónde puedo ver los cursos y capacitaciones disponibles?",
        a: "Los cursos, jornadas y actividades de capacitación continua están disponibles en la sección Cursos/Capacitaciones del sitio.",
      },
    ],
  },
  {
    id: "medicus",
    eyebrow: "Por Obra Social",
    title: "MEDICUS — Fuerzas de Seguridad",
    subtitle:
      "Gendarmería Nacional y Prefectura Naval Argentina · Vigente desde el 1° de junio de 2026",
    faqs: [
      {
        q: "¿Qué son los planes MS1 y MS2?",
        a: [
          "MEDICUS incorporó nuevos afiliados de las Fuerzas de Seguridad Nacionales (Gendarmería Nacional y Prefectura Naval Argentina) desde el 1° de junio de 2026.",
          "Los planes habilitados para su atención son:",
          "• MS1: contempla copagos para consultas y determinadas prácticas ambulatorias. La cobertura de internación es en habitación compartida.",
          "• MS2: no contempla copagos. La cobertura de internación es en habitación individual.",
          "Para acceder a las prestaciones, los afiliados deben presentar credencial vigente de MEDICUS.",
        ],
      },
      {
        q: "¿Cuáles son los copagos del plan MS1?",
        a: [
          "Los copagos vigentes desde junio de 2026 para el Plan MS1 son:",
          "• $35.000 — Procedimientos quirúrgicos ambulatorios: cirugías ambulatorias, endoscopías digestivas (diagnósticas y terapéuticas), CPRE, fibrobroncoscopías, rectosigmoideoscopías, manometrías, pHmetrías e impedanciometrías.",
          "• $20.000 — Consultas médicas y de guardia · Consultas con especialistas · Consultas de psicología (presencial o virtual) · Ecografías (incluye Doppler y ecocardiogramas), por cada estudio · Tomografías computadas, con o sin contraste, por cada estudio · Resonancias magnéticas, con o sin contraste, por cada estudio · Imágenes especiales: densitometrías, medicina nuclear, PET, imágenes odontológicas y oftalmológicas · Laboratorio (por receta, independientemente del número de determinaciones) · Odontología (por visita) · Prácticas de especialidades: alergia, cardiología, dermatología, gastroenterología, genética, ginecología, hemodinamia, nefrología, neumonología, neurología, oftalmología, otorrinolaringología, traumatología (incluye yesos) y urología.",
          "• $10.000 — Radiología (por receta, independientemente del número de estudios) · Fonoaudiología (por sesión; estudios audiológicos por receta) · Kinesiología, terapia ocupacional, RPG y toda práctica de rehabilitación (por sesión) · Nutrición (por visita).",
          "Nota: los contrastes de tomografías y resonancias no tienen copago. Las prestaciones de guardia sí llevan copago.",
          "El Plan MS2 no contempla copagos.",
        ],
      },
      {
        q: "¿Quiénes están excluidos del copago?",
        a: [
          "Quedan excluidos de copagos los afiliados con los siguientes diagnósticos o situaciones:",
          "• Enfermedades oncológicas u oncohematológicas.",
          "• Pacientes en cuidados paliativos.",
          "• Pacientes con HIV.",
          "• Pacientes en diálisis.",
          "• Plan materno infantil: embarazo, parto, puerperio y niños hasta los 3 años de vida.",
          "• Titulares de CUD (Certificado Único de Discapacidad).",
          "• Pacientes trasplantados.",
          "• Pacientes en tratamientos de fertilidad.",
          "También quedan excluidas de copago las siguientes prácticas realizadas en el contexto de programas preventivos: PAP y mamografía.",
        ],
      },
      {
        q: "¿Cómo se facturan las prestaciones y cómo se solicitan las autorizaciones?",
        a: [
          "Facturación: las consultas y prácticas deben registrarse en recetario con membrete profesional. En cada orden de atención debe constar expresamente el importe percibido en concepto de copago cuando corresponda, a fin de garantizar una correcta liquidación.",
          "Los afiliados de MEDICUS disponen de credencial digital para acreditar su cobertura.",
          "Autorizaciones — Canal oficial:",
          "📧 autorizacionesplanms@medicus.com.ar",
          "📱 El afiliado también puede tramitar la autorización a través de la app de MEDICUS.",
          "Se recomienda hacer la solicitud y que el afiliado gestione la autorización por la app o por el correo informado.",
        ],
      },
      {
        q: "¿Cuál es el usuario y la contraseña para validar en OSFA (ex IOSFA — Fuerzas Armadas)?",
        a: [
          "Para ingresar al sistema de validación de OSFA (ex IOSFA — Fuerzas Armadas), tanto el usuario como la contraseña son el CUIT del Colegio Médico, escrito con guiones:",
          "👤 Usuario: 3-57319069-2",
          "🔑 Contraseña: 3-57319069-2",
        ],
      },
    ],
  },
];

// ─── Accordion item ───────────────────────────────────────────────────────────

function AccordionItem({
  item,
  isOpen,
  onToggle,
  id,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  id: string;
}) {
  const answerId = `${id}-answer`;

  const lines = Array.isArray(item.a) ? item.a : [item.a];

  return (
    <div className={`${styles.item} ${isOpen ? styles.itemOpen : ""}`}>
      <button
        type="button"
        className={styles.question}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={answerId}
        id={id}
      >
        <span className={styles.questionText}>{item.q}</span>
        <FiChevronDown
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={answerId}
            role="region"
            aria-labelledby={id}
            className={styles.answerWrap}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className={styles.answer}>
              {lines.map((line, i) => (
                <p key={i} className={styles.answerLine}>
                  {line}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreguntasFrecuentesPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) =>
    setOpenId((prev) => (prev === id ? null : id));

  return (
    <div className={styles.page}>
      <Hero
        title="Preguntas Frecuentes"
        subtitle="Encontrá respuestas a las consultas más comunes sobre nuestros servicios"
        backgroundImage={heroBg}
      />

      <main className={styles.main}>
        {SECTIONS.map((section) => (
          <section key={section.id} className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.eyebrow}>{section.eyebrow}</span>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              {section.subtitle && (
                <p className={styles.sectionSubtitle}>{section.subtitle}</p>
              )}
            </div>

            <div className={styles.accordion} role="list">
              {section.faqs.map((faq, i) => {
                const id = `${section.id}-${i}`;
                return (
                  <div key={id} role="listitem">
                    <AccordionItem
                      item={faq}
                      isOpen={openId === id}
                      onToggle={() => toggle(id)}
                      id={id}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
