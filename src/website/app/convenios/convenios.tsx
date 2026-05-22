import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiMessageCircle, FiMail, FiCheckCircle } from "react-icons/fi";
import ObrasSociales from "../../components/Servicios/ObrasSociales/ObrasSociales";
import type { ObraSocial } from "../../components/Servicios/ObrasSociales/ObrasSociales";
import PageHero from "../../components/UI/Hero/Hero";
import Button from "../../components/UI/Button/Button";
import { http } from "../../../app/lib/http";
import styles from "./convenios.module.scss";

// ─── Constants ────────────────────────────────────────────────────────────────
const EMAIL = "auditoriacolegiomedico23@gmail.com";
const WA_NUMBER = "543794252323";
const WA_LINK = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
  "Hola, quisiera información para firmar convenio con el Colegio Médico de Corrientes, por favor. ¡Gracias!."
)}`;
const MAILTO_LINK = `mailto:${EMAIL}?subject=${encodeURIComponent(
  "Carta de presentación - Convenio"
)}&body=${encodeURIComponent(
  "Hola, adjunto carta de presentación para evaluar convenio. Gracias."
)}`;

const EASE = [0.22, 1, 0.36, 1] as const;

// ─── Normalizer — matches backend shape: { NRO_OBRA_SOCIAL, NOMBRE, ... } ────
function normalizeObrasSociales(data: unknown): ObraSocial[] {
  const items: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray((data as any)?.results)
    ? (data as any).results
    : [];

  return items
    .map((item: any, i: number): ObraSocial | null => {
      const nombre = String(
        item?.NOMBRE ??
        item?.nombre ??
        item?.OBRA_SOCIAL ??
        item?.obra_social ??
        item?.name ??
        item?.razon_social ??
        ""
      ).trim();
      if (!nombre) return null;

      const id = String(
        item?.NRO_OBRA_SOCIAL ??
        item?.NRO_OBRASOCIAL ??
        item?.nro_obra_social ??
        item?.id ??
        item?.ID ??
        `os-${i}`
      );

      return { id, nombre, href: item?.href ?? item?.url ?? undefined };
    })
    .filter((x): x is ObraSocial => x !== null);
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ConveniosPage() {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;

    http
      .get("/api/obras_social/")
      .then(({ data }) => {
        if (aborted) return;
        setObras(normalizeObrasSociales(data));
        setLoading(false);
      })
      .catch(() => {
        if (aborted) return;
        setError("No se pudieron cargar los convenios. Intente más tarde.");
        setLoading(false);
      });

    return () => { aborted = true; };
  }, []);

  return (
    <div className={styles.page}>
      

      {/* ── Obras sociales list ───────────────────────────────────────────── */}
      <ObrasSociales
        titulo="Obras Sociales"
        subtitulo="Convenios vigentes con el Colegio Médico de Corrientes"
        obras={obras}
        loading={loading}
        error={error}
      />

      {/* ── CTA band ─────────────────────────────────────────────────────── */}
      <section className={styles.ctaBand}>
        <div className={styles.ctaContainer}>

          <motion.div
            className={styles.ctaLeft}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <h2 className={styles.ctaTitle}>
              ¿Sos una Obra Social que quiere firmar convenio con nosotros?
            </h2>
            <p className={styles.ctaLead}>
              Si sos una Obra Social o empresa interesada en establecer un convenio,
              contactanos por WhatsApp o enviá tu carta de presentación por correo.
            </p>

           
          </motion.div>

          <motion.div
            className={styles.ctaRight}
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
          >
            <div className={styles.ctaCard}>
              <div className={styles.ctaOption}>
                <div className={styles.ctaOptionIcon} aria-hidden="true">
                  <FiMessageCircle />
                </div>
                <div className={styles.ctaOptionBody}>
                  <p className={styles.ctaOptionLabel}>WhatsApp</p>
                  <p className={styles.ctaOptionDesc}>
                    Contacto directo y rápido con nuestro equipo
                  </p>
                </div>
              </div>

              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={styles.ctaLink}>
                <Button variant="primary" size="large" fullWidth>
                  Quiero firmar convenio
                </Button>
              </a>

              <div className={styles.divider} aria-hidden="true">
                <span>o también podés escribirnos</span>
              </div>

              <div className={styles.ctaOption}>
                <div className={styles.ctaOptionIcon} aria-hidden="true">
                  <FiMail />
                </div>
                <div className={styles.ctaOptionBody}>
                  <p className={styles.ctaOptionLabel}>Correo electrónico</p>
                  <a href={MAILTO_LINK} className={styles.ctaEmail}>
                    {EMAIL}
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>
    </div>
  );
}
