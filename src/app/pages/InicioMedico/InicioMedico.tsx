import type React from "react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CircleUserRound,
  ClipboardList,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  LifeBuoy,
  MapPin,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../auth/AuthProvider";
import { getBeneficiosVigentes } from "../Beneficios/beneficios.api";
import type { Beneficio } from "../Beneficios/beneficios.types";
import styles from "./InicioMedico.module.scss";

import heroImage from "../../assets/bg2.png";

// Logos de las obras sociales con convenio. Import estático (no `import.meta.glob`)
// para que Vite los versione y para que agregar una obra social sea una línea
// visible en el diff y no un efecto lateral de copiar un archivo a la carpeta.
import logoBoreal from "../../assets/obras-sociales/boreal.png";
import logoIoscor from "../../assets/obras-sociales/ioscor.jpg";
import logoIosfa from "../../assets/obras-sociales/iosfa.jpg";
import logoIssunne from "../../assets/obras-sociales/issunne.png";
import logoMedife from "../../assets/obras-sociales/medife.jpg";
import logoNobis from "../../assets/obras-sociales/nobis.png";
import logoOmint from "../../assets/obras-sociales/omint.png";
import logoOspjn from "../../assets/obras-sociales/ospjn.jpg";
import logoOspm from "../../assets/obras-sociales/ospm.jpg";
import logoPrevencion from "../../assets/obras-sociales/prevencion.jpg";
import logoSancor from "../../assets/obras-sociales/sancor.jpg";
import logoSwiss from "../../assets/obras-sociales/swiss-medical.png";
import logoUpcn from "../../assets/obras-sociales/upcn.png";

const WHATSAPP_URL =
  "https://wa.me/5493794532335?text=¡Hola!,%20necesito%20soporte%20con%20el%20sistema%20del%20Colegio%20Médico";

// Cuántos beneficios entran en la vidriera. El catálogo completo tendrá su
// propia pantalla; acá alcanza con una muestra que no empuje el resto abajo.
const BENEFICIOS_EN_PORTADA = 6;

const OBRAS_SOCIALES: { src: string; nombre: string }[] = [
  { src: logoIoscor, nombre: "IOSCOR" },
  { src: logoSwiss, nombre: "Swiss Medical" },
  { src: logoSancor, nombre: "Sancor Salud" },
  { src: logoOmint, nombre: "Omint" },
  { src: logoMedife, nombre: "Medifé" },
  { src: logoPrevencion, nombre: "Prevención Salud" },
  { src: logoIssunne, nombre: "ISSUNNE" },
  { src: logoIosfa, nombre: "IOSFA" },
  { src: logoOspjn, nombre: "OSPJN" },
  { src: logoOspm, nombre: "OSPM" },
  { src: logoNobis, nombre: "Nobis" },
  { src: logoBoreal, nombre: "Boreal" },
  { src: logoUpcn, nombre: "UPCN" },
];

type QuickAction = {
  icon: LucideIcon;
  title: string;
  description: string;
  link: string;
  accent: "blue" | "gold" | "amber" | "darkblue";
};

const ACCESOS: QuickAction[] = [
  {
    icon: DollarSign,
    title: "Consulta de precios",
    description:
      "El valor vigente de una práctica según el convenio de cada obra social.",
    link: "/panel/nomenclador/consulta-precios",
    accent: "darkblue",
  },
  {
    icon: ShieldCheck,
    title: "Validaciones",
    description: "Validá la cobertura de un afiliado antes de atenderlo.",
    link: "/panel/validaciones",
    accent: "blue",
  },
  {
    icon: ClipboardList,
    title: "Portales de obras sociales",
    description:
      "Accesos directos a los portales donde se carga o valida cada prestación.",
    link: "/panel/validaciones/portales",
    accent: "amber",
  },
  {
    icon: FileText,
    title: "Planillas de consulta",
    description:
      "Las planillas que publica el Colegio para presentar con tu facturación.",
    link: "/panel/planillas",
    accent: "blue",
  },
  {
    icon: CircleUserRound,
    title: "Mi perfil",
    description:
      "Tus datos, tu documentación y las especialidades que tenés adheridas.",
    link: "/panel/mi-perfil",
    accent: "gold",
  },
];

// Placeholders del módulo de tutoriales, todavía sin backend. Cuando exista,
// esta constante se reemplaza por la query y las tarjetas dejan de ser estáticas.
const TUTORIALES_PREVIEW = [
  "Cómo consultar el precio de una práctica",
  "Validar un afiliado paso a paso",
  "Cargar tu documentación al legajo",
];

/**
 * Portal de los usuarios médicos (INGRESAR = 'D'): hero corto, accesos, la
 * vidriera de beneficios y convenios, y el módulo de tutoriales por venir.
 * El recorte de rutas equivalente vive en `MedicoRouteGuard`.
 */
const InicioMedico: React.FC = () => {
  const { user } = useAuth();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buen día";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const nombre = user?.nombre?.trim() ?? "";

  // La vidriera es accesoria: si falla, el resto del portal tiene que seguir
  // sirviendo. Por eso no se propaga el error, sólo se oculta la sección.
  const {
    data: beneficios = [],
    isLoading: beneficiosLoading,
    isError: beneficiosError,
  } = useQuery({
    queryKey: ["beneficios-vigentes"],
    queryFn: () => getBeneficiosVigentes(BENEFICIOS_EN_PORTADA),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const renderBeneficio = (b: Beneficio, index: number) => (
    <motion.article
      key={b.id}
      className={styles.benefitCard}
      style={{ "--benefit-accent": b.color ?? undefined } as React.CSSProperties}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, delay: index * 0.04 }}
    >
      <div className={styles.benefitTop}>
        <span className={styles.benefitCategoria}>{b.categoria}</span>
        {b.descuento && (
          <span className={styles.benefitDescuento}>{b.descuento}</span>
        )}
      </div>

      <h3 className={styles.benefitTitle}>{b.titulo}</h3>
      <p className={styles.benefitDesc}>{b.descripcion}</p>

      {b.ubicacion && (
        <div className={styles.benefitFoot}>
          <MapPin size={14} />
          {b.ubicacion}
        </div>
      )}
    </motion.article>
  );

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {/* ── Hero ── */}
        <motion.section
          className={styles.hero}
          style={{ "--hero-image": `url(${heroImage})` } as React.CSSProperties}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          <div className={styles.heroGlow} aria-hidden="true" />

          <div className={styles.heroInner}>
            <div className={styles.heroText}>
              <h1 className={styles.greeting}>
                {greeting}
                {nombre ? `, ${nombre}` : ""}.
              </h1>

              <p className={styles.heroSub}>
                Consultá valores, validá afiliados y aprovechá los beneficios
                del Colegio.
              </p>

              <div className={styles.heroActions}>
                <Link
                  to="/panel/nomenclador/consulta-precios"
                  className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}
                >
                  <DollarSign size={17} />
                  Consultar un precio
                </Link>

                {/* El sitio institucional es el mismo SPA en "/" — no es un
                    enlace externo, por eso va con Link y sin target _blank. */}
                <Link to="/" className={`${styles.heroBtn} ${styles.heroBtnGhost}`}>
                  <Globe size={17} />
                  Ir al sitio del Colegio
                </Link>
              </div>
            </div>

          </div>
        </motion.section>

        {/* ── Accesos ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Accesos rápidos</h2>
              <p className={styles.sectionSub}>
                Lo que más usás, a un clic.
              </p>
            </div>
          </div>

          <div className={styles.accessGrid}>
            {ACCESOS.map((action, index) => {
              const Icon = action.icon;
              const accentClass =
                styles[
                  `accent${action.accent[0].toUpperCase()}${action.accent.slice(1)}`
                ];

              return (
                <motion.div
                  key={action.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, delay: index * 0.04 }}
                >
                  <Link to={action.link} className={styles.accessCard}>
                    <div className={`${styles.accessIcon} ${accentClass}`}>
                      <Icon size={20} />
                    </div>
                    <h3 className={styles.accessTitle}>{action.title}</h3>
                    <p className={styles.accessDesc}>{action.description}</p>
                    <ArrowRight size={18} className={styles.accessArrow} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Beneficios ──
            Datos en vivo de GET /api/beneficios/vigentes (activos y no vencidos).
            La sección se muestra SIEMPRE: antes se ocultaba cuando no había
            nada cargado, y eso hacía que pareciera que la funcionalidad no
            existía. Con el estado vacío explícito se entiende que está lista y
            esperando que el Colegio cargue los convenios desde el panel. */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Beneficios para socios</h2>
              <p className={styles.sectionSub}>
                Descuentos y convenios vigentes en comercios y servicios.
              </p>
            </div>
          </div>

          {beneficiosLoading ? (
            <div className={styles.skeletonGrid}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          ) : beneficiosError ? (
            <div className={styles.empty}>
              No se pudieron cargar los beneficios en este momento.
            </div>
          ) : beneficios.length === 0 ? (
            <div className={styles.empty}>
              Todavía no hay beneficios cargados. Muy pronto vas a encontrar acá
              los descuentos y convenios del Colegio.
            </div>
          ) : (
            <div className={styles.benefitGrid}>
              {beneficios.map(renderBeneficio)}
            </div>
          )}
        </section>

        {/* ── Convenios ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Obras sociales con validación web</h2>
              <p className={styles.sectionSub}>
                Consultá valores y validá afiliados de todas ellas desde el panel.
              </p>
            </div>
            <Link to="/panel/validaciones" className={styles.sectionLink}>
              Validar un afiliado
              <ArrowUpRight size={15} />
            </Link>
          </div>

          <div className={styles.logoStrip}>
            {/* La lista va duplicada: el keyframe corre hasta -50% y engancha
                con el principio, que es la misma secuencia. */}
            <div className={styles.logoTrack}>
              {[...OBRAS_SOCIALES, ...OBRAS_SOCIALES].map((os, i) => (
                <img
                  key={`${os.nombre}-${i}`}
                  src={os.src}
                  alt={os.nombre}
                  className={styles.logoItem}
                  loading="lazy"
                  // La segunda vuelta es decorativa: no debe leerse dos veces.
                  aria-hidden={i >= OBRAS_SOCIALES.length}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ── Tutoriales (placeholder) ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Tutoriales</h2>
              <p className={styles.sectionSub}>
                Videos cortos para sacarle el jugo al sistema.
              </p>
            </div>
            <span className={styles.soonBadge}>Próximamente</span>
          </div>

          <div className={styles.tutorialGrid}>
            {TUTORIALES_PREVIEW.map((titulo) => (
              <div key={titulo} className={styles.tutorialCard}>
                <div className={styles.tutorialThumb}>
                  <PlayCircle size={30} />
                </div>
                <h3 className={styles.tutorialTitle}>{titulo}</h3>
                <p className={styles.tutorialMeta}>Disponible pronto</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Soporte ── */}
        <section className={styles.section}>
          <div className={styles.supportCard}>
            <div>
              <h2 className={styles.supportTitle}>¿Necesitás una mano?</h2>
              <p className={styles.supportDesc}>
                Escribinos por WhatsApp si algo no funciona. Si un dato de tu
                legajo está mal, reportalo desde{" "}
                <Link to="/panel/mi-perfil" className={styles.sectionLink}>
                  Mi perfil
                </Link>
                .
              </p>
            </div>

            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.supportBtn}
            >
              <LifeBuoy size={17} />
              Contactar soporte
              <ExternalLink size={15} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InicioMedico;
