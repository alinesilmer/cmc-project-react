import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Circle,
  Shield,
  Copy,
  AlertTriangle,
  DollarSign,
  Info as InfoIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./Info.module.scss";
import Button from "../../../website/components/UI/Button/Button";

// ─── Types ───────────────────────────────────────────────────────────────────

type TagKind =
  | "obligatorio"
  | "no-obligatorio"
  | "legalizado"
  | "simple"
  | "importante";

type Item = {
  id: string;
  text: React.ReactNode;
  hint?: string;
  tags?: TagKind[];
};

type IconComponent = React.FC<{ size?: number }>;

// ─── Motion variants ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 380, damping: 30 },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const accordionBody = {
  hidden: { height: 0, opacity: 0 },
  show: {
    height: "auto" as const,
    opacity: 1,
    transition: { duration: 0.28, ease: [0.4, 0, 0.2, 1] as const },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const },
  },
};

// ─── Tag metadata ─────────────────────────────────────────────────────────────

const TAG_META: Record<TagKind, { label: string; Icon: IconComponent }> = {
  obligatorio:      { label: "Obligatorio",    Icon: CheckCircle2 as IconComponent },
  "no-obligatorio": { label: "No obligatorio", Icon: Circle as IconComponent },
  legalizado:       { label: "Legalizado",     Icon: Shield as IconComponent },
  simple:           { label: "Copia simple",   Icon: Copy as IconComponent },
  importante:       { label: "Importante",     Icon: AlertTriangle as IconComponent },
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const Tag: React.FC<{ kind: TagKind }> = ({ kind }) => {
  const { label, Icon } = TAG_META[kind];
  return (
    <span className={`${styles.tag} ${styles[`tag--${kind}`]}`}>
      <Icon size={11} aria-hidden />
      {label}
    </span>
  );
};

const ItemIcon: React.FC<{ tags?: TagKind[] }> = ({ tags }) => {
  if (!tags || tags.length === 0)
    return <Circle size={18} className={styles.itemIcon} aria-hidden />;
  if (tags.includes("obligatorio"))
    return <CheckCircle2 size={18} className={`${styles.itemIcon} ${styles.iconObligatorio}`} aria-hidden />;
  if (tags.includes("legalizado"))
    return <Shield size={18} className={`${styles.itemIcon} ${styles.iconLegalizado}`} aria-hidden />;
  if (tags.includes("importante"))
    return <AlertTriangle size={18} className={`${styles.itemIcon} ${styles.iconImportante}`} aria-hidden />;
  return <Copy size={18} className={`${styles.itemIcon} ${styles.iconSimple}`} aria-hidden />;
};

const Bullet: React.FC<{ item: Item }> = ({ item }) => (
  <motion.li variants={fadeUp} className={styles.reqItem} aria-label="requisito">
    <ItemIcon tags={item.tags} />
    <div className={styles.reqText}>
      <div className={styles.reqLine}>
        {item.text}
        {item.tags?.map((t) => <Tag key={t} kind={t} />)}
      </div>
      {item.hint && (
        <p className={styles.reqHint}>
          <InfoIcon size={12} aria-hidden />
          {item.hint}
        </p>
      )}
    </div>
  </motion.li>
);

const Section: React.FC<{
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}> = ({ title, children, defaultOpen = true, icon }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button
        className={styles.sectionHeader}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {icon && <span className={styles.sectionIconWrap} aria-hidden>{icon}</span>}
        <h3>{title}</h3>
        <span className={styles.spacer} />
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className={styles.chevWrap}
          aria-hidden
        >
          <ChevronDown size={20} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            variants={accordionBody}
            initial="hidden"
            animate="show"
            exit="exit"
            className={styles.sectionBodyWrap}
            style={{ overflow: "hidden" }}
          >
            <div className={styles.sectionBody}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const Info: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  const principales: Item[] = [
    {
      id: "1",
      text: (
        <>
          Fotocopia del <strong>Título de Médico</strong> (ambos lados) con
          inscripción de matrículas e inscripción en los Ministerios de
          Educación de la Nación y del Interior.
        </>
      ),
      tags: ["legalizado"],
      hint: "Legalizado por Escribano Público.",
    },
    {
      id: "2",
      text: (
        <>
          Fotocopia del <strong>Título de Especialista</strong> y{" "}
          <strong>Resolución Ministerial</strong> de la especialidad (o Título
          de Residencia / Concurrencia / Servicio donde realizó la capacitación).
        </>
      ),
      tags: ["legalizado"],
      hint: "Legalizado por Escribano Público. Emitido por Ministerio de Salud Pública de la Pcia. de Corrientes.",
    },
  ];

  const copiasSimples: Item[] = [
    { id: "3a", text: <>Matrícula Provincial (ambos lados).</>, tags: ["no-obligatorio", "simple"] },
    { id: "3b", text: <>Matrícula Nacional (ambos lados).</>, tags: ["no-obligatorio", "simple"] },
    {
      id: "3c",
      text: (<>DNI con domicilio actualizado <em>o</em> Constancia Policial de Domicilio.</>),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3d",
      text: (
        <>
          Inscripción en AFIP (CUIT) indicando condición fiscal (
          <strong>Monotributista</strong> o{" "}
          <strong>Responsable Inscripto</strong>) y{" "}
          <strong>último recibo de pago</strong>.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    { id: "3e", text: <>Inscripción y Exención en DGR.</>, tags: ["obligatorio", "simple"] },
    {
      id: "3f",
      text: (
        <>
          Trámite de inscripción en la{" "}
          <strong>Superintendencia de Servicios de Salud</strong> (comprobante).
        </>
      ),
      hint: "Presenta un comprobante con plazo de 60 días para el Resuelto. ANSSAL – Ctes. 25 de Mayo Nº 1425 – Tel. 4430148.",
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3g",
      text: (
        <>
          Póliza y último recibo de pago del{" "}
          <strong>Seguro de Mala Praxis</strong> (si no lo gestiona el Colegio Médico).
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3h",
      text: (
        <>
          <strong>Habilitación Ministerial del consultorio</strong> o nota del
          director médico del instituto que certifique que integra el plantel y
          que la institución está habilitada por el MSP.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3i",
      text: (
        <>
          <strong>Declaración de aparatología</strong> (si realiza prácticas con
          equipamiento facturable): certificado de compra y características.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3j",
      text: (
        <>
          Si estuvo asociado a otro Colegio/Federación:{" "}
          <strong>Certificado de antecedentes Ético-Gremiales</strong> y{" "}
          <strong>Libre Deuda</strong>; caso contrario,{" "}
          <strong>Acta de Declaración</strong> aclarando situación.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3k",
      text: (
        <>
          <strong>Nota</strong> dirigida al Presidente del Colegio Médico de
          Corrientes (Pedro A. Espinoza) solicitando su aceptación como
          socio-prestador.
        </>
      ),
      tags: ["obligatorio", "simple"],
    },
    {
      id: "3l",
      text: (
        <>
          <strong>Aclaración del punto 12</strong>: no presenta certificado de
          antecedentes Ético-Gremiales por motivos fundados.
        </>
      ),
      tags: ["importante", "simple"],
    },
    { id: "3m", text: <>Dos fotos tipo carnet.</>, tags: ["obligatorio", "simple"] },
    {
      id: "3n",
      text: (<>Completar la <strong>ficha de inscripción</strong> provista por la Institución.</>),
      tags: ["obligatorio", "simple"],
    },
  ];

  return (
    <div className={styles.page}>
      {/* Hero */}
      <header className={styles.hero}>
       

        <motion.div
          className={styles.heroContent}
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          <motion.h1 variants={fadeUp}>
            Requisitos de Ingreso<br />
            <span className={styles.heroAccent}>Socio Prestador</span>
          </motion.h1>
          <motion.p variants={fadeUp}>
            Presentá la documentación para incorporarte como prestador del{" "}
            <strong>Colegio Médico de Corrientes</strong>. Organizamos todo en
            secciones claras con etiquetas para que sepas qué es legalizado,
            obligatorio y qué es copia simple.
          </motion.p>
          <motion.div variants={fadeUp} className={styles.heroActions}>
            <Button
            size="xlg"
            variant="secondary"
            onClick={() =>
              window.open("https://wa.me/543794252323?text=Hola%20Colegio%20M%C3%A9dico%20Corrientes%2C%20tengo%20una%20consulta%20sobre%20los%20requisitos%20de%20ingreso%20como%20socio-prestador.", "_blank")
            }
            aria-label="Contactar por WhatsApp"
          >
            <a
              className={styles.link}
              href="mailto:secretaria@colegiomedicocorrientes.com?subject=Consulta%20Socio%20Prestador"
            >
              Consultar por email
            </a>
            </Button>
             <Button
            size="xlg"
            variant="secondary"
            onClick={() =>
              window.open("https://wa.me/543794252323?text=Hola%20Colegio%20M%C3%A9dico%20Corrientes%2C%20tengo%20una%20consulta%20sobre%20los%20requisitos%20de%20ingreso%20como%20socio-prestador.", "_blank")
            }
            aria-label="Contactar por WhatsApp"
          >
            <a
              className={styles.link}
              href="tel:+543794252323"
              aria-label="Llamar al número de contacto"
            >
              Llamar: 3794-252323
            </a>
            </Button>
          </motion.div>
          
        </motion.div>
      </header>

      {/* Tag legend */}
      <motion.div
        className={styles.legend}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.35 }}
        aria-label="Referencia de etiquetas"
      >
        <span className={styles.legendLabel}>Referencias:</span>
        {(Object.entries(TAG_META) as [TagKind, { label: string; Icon: IconComponent }][]).map(
          ([kind, { label, Icon }]) => (
            <span key={kind} className={`${styles.tag} ${styles[`tag--${kind}`]}`}>
              <Icon size={11} aria-hidden />{label}
            </span>
          )
        )}
      </motion.div>

      {/* Content */}
      <main className={styles.content}>
        {/* Contact card */}
        <motion.aside
          className={styles.card}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.38 }}
        >
          <h2 className={styles.cardTitle}>Contacto y Sede</h2>
          <div className={styles.contactGrid}>
            <div className={styles.contactItems}>
              <div className={styles.contactRow}>
                <MapPin size={16} className={styles.contactIcon} aria-hidden />
                <div>
                  <span className={styles.contactKey}>Dirección</span>
                  <strong className={styles.contactVal}>Carlos Pellegrini 1785</strong>
                </div>
              </div>
              <div className={styles.contactRow}>
                <Phone size={16} className={styles.contactIcon} aria-hidden />
                <div>
                  <span className={styles.contactKey}>Teléfono</span>
                  <a href="tel:+543794252323" className={styles.contactVal}>3794-252323</a>
                </div>
              </div>
              <div className={styles.contactRow}>
                <Mail size={16} className={styles.contactIcon} aria-hidden />
                <div>
                  <span className={styles.contactKey}>Email</span>
                  <a
                    href="mailto:secretaria@colegiomedicocorrientes.com"
                    className={styles.contactVal}
                  >
                    secretaria@colegiomedicocorrientes.com
                  </a>
                </div>
              </div>
            </div>
            <div className={styles.badges}>
              <span className={`${styles.lozenge} ${styles.lozengeBlue}`}>Atención administrativa</span>
              <span className={`${styles.lozenge} ${styles.lozengeGray}`}>Llevá originales y copias</span>
            </div>
          </div>
        </motion.aside>

        {/* Section 1 — Documentación principal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.38 }}
        >
          <Section title="Documentación principal" icon={<Shield size={18} />}>
            <motion.ul className={styles.reqList} variants={stagger} initial="hidden" animate="show">
              {principales.map((i) => <Bullet key={i.id} item={i} />)}
            </motion.ul>
          </Section>
        </motion.div>

        {/* Section 2 — Copias simples */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.38 }}
        >
          <Section
            title="Copias simples y otras constancias"
            icon={<Copy size={18} />}
            defaultOpen={false}
          >
            <motion.ul className={styles.reqList} variants={stagger} initial="hidden" animate="show">
              {copiasSimples.map((i) => <Bullet key={i.id} item={i} />)}
            </motion.ul>
          </Section>
        </motion.div>

        {/* Fees */}
        <motion.section
          className={`${styles.card} ${styles.fees}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.38 }}
        >
          <h3 className={styles.feesTitle}>
            <DollarSign size={20} aria-hidden />
            Aranceles
          </h3>
          <div className={styles.feeRow}>
            <span>Costo de inscripción</span>
            <strong>$ 40.000</strong>
          </div>
          <div className={styles.feeRow}>
            <span>Cuota societaria</span>
            <strong>$ 8.000</strong>
          </div>
          <p className={styles.feeNote}>
            Los montos pueden actualizarse. Confirmá los valores vigentes al
            momento de presentar la documentación.
          </p>
        </motion.section>
      </main>
    </div>
  );
};

export default Info;
