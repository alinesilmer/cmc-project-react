import type React from "react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  DollarSign,
  ExternalLink,
  LifeBuoy,
  MapPin,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../../auth/useAuth";
import { saludoSegunHora } from "@/app/shared/lib/fechas";
import { esOrganizacion } from "../../auth/roles";
import FranjaSaludo from "@/app/components/layout/FranjaSaludo/FranjaSaludo";
import Carrusel from "./components/Carrusel/Carrusel";
import { getBeneficiosVigentes } from "../Beneficios/beneficios.api";
import type { Beneficio } from "../Beneficios/beneficios.types";
import styles from "./InicioMedico.module.scss";

/** Cuántos beneficios muestra el inicio: el resto está en el sitio del Colegio. */
const MAX_BENEFICIOS = 5;

const WHATSAPP_URL =
  "https://wa.me/5493794252323?text=¡Hola!,%20necesito%20soporte%20con%20el%20sistema%20del%20Colegio%20Médico";

/** `azul` y `amarillo`: los dos accesos que más se usan van en colores distintos para que se vean de lejos. */
type Acceso = { icon: LucideIcon; title: string; link: string; tono: "azul" | "amarillo" };

const ACCESOS: Acceso[] = [
  { icon: DollarSign, title: "Consulta de precios", link: "/panel/nomenclador/consulta-precios", tono: "azul" },
  { icon: ShieldCheck, title: "Validaciones", link: "/panel/validaciones", tono: "amarillo" },
];

/** Los tutoriales publicados. Todavía sin backend: cuando exista, esta constante se reemplaza por la query y el resto de la sección no cambia. */
type Tutorial = { titulo: string; url: string };

const TUTORIALES: Tutorial[] = [
  {
    titulo: "Validaciones en Medife",
    url: "https://res.cloudinary.com/dcfkgepmp/video/upload/v1787517269/medife_tuto_f8w32o.mp4",
  },
  {
    titulo: "Validación Unión Personal",
    url: "https://res.cloudinary.com/dcfkgepmp/video/upload/v1790890254/union_personal_zkmpje.mp4",
  },
];

/** Lo que todavía no está grabado; se muestra en gris, sin reproductor. */
const TUTORIALES_PENDIENTES = [
  "Cómo consultar el precio de una práctica",
  "Cargar tu documentación al legajo",
];

/** Portal de los usuarios médicos (rol `medico`): el banner con el saludo, los accesos, la vidriera de beneficios y convenios, y los tutoriales. */
const InicioMedico: React.FC = () => {
  const { user } = useAuth();

  const saludo = useMemo(() => saludoSegunHora(), []);
  const fecha = useMemo(
    () => new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }),
    [],
  );

  const nombre = user?.nombre?.trim() ?? "";

  // Las clínicas no validan afiliados (ver ORGANIZACION_BLOCKED_PATHS) ni tienen beneficios de socio: se les saca todo lo que lleva a /panel/validaciones.
  const esOrg = esOrganizacion(user);
  const accesos = esOrg
    ? ACCESOS.filter((a) => !a.link.startsWith("/panel/validaciones"))
    : ACCESOS;
  const tutoriales = esOrg ? [] : TUTORIALES;

  // La vidriera es accesoria: si falla, el resto del portal tiene que seguir sirviendo.
  const {
    data: beneficios = [],
    isLoading: beneficiosLoading,
    isError: beneficiosError,
  } = useQuery({
    queryKey: ["beneficios-vigentes"],
    queryFn: () => getBeneficiosVigentes(),
    staleTime: 10 * 60 * 1000,
    retry: false,
    enabled: !esOrg,
  });

  const destacados = useMemo(() => beneficios.slice(0, MAX_BENEFICIOS), [beneficios]);

  const renderBeneficio = (b: Beneficio, index: number) => (
    <motion.article
      key={b.id}
      className={styles.beneficio}
      style={{ "--benefit-accent": b.color ?? undefined } as React.CSSProperties}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      // Techo al escalonado: sin él, con 30 beneficios el último entraba a 1,2 s.
      transition={{ duration: 0.26, delay: Math.min(index, 8) * 0.04 }}
    >
      <div className={styles.beneficioTop}>
        <span className={styles.beneficioCategoria}>{b.categoria}</span>
        {b.descuento && <span className={styles.beneficioDescuento}>{b.descuento}</span>}
      </div>

      <h3 className={styles.beneficioTitulo}>{b.titulo}</h3>
      <p className={styles.beneficioDesc}>{b.descripcion}</p>

      {b.ubicacion && (
        <div className={styles.beneficioPie}>
          <MapPin size={14} />
          {b.ubicacion}
        </div>
      )}
    </motion.article>
  );

  return (
    <div className={styles.pagina}>
      <FranjaSaludo fecha={fecha} saludo={`${saludo}${nombre ? `, ${nombre}` : ""}`} />

      <div className={styles.cuerpo}>
        {/* ── Accesos ── */}
        <section className={styles.seccion}>
          <h2 className={styles.titulo}>Accesos rápidos</h2>

          <div className={styles.accesos}>
            {accesos.map((acceso, index) => {
              const Icono = acceso.icon;
              return (
                <motion.div
                  key={acceso.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, delay: index * 0.04 }}
                >
                  <Link to={acceso.link} className={`${styles.acceso} ${acceso.tono === "azul" ? styles.accesoAzul : styles.accesoAmarillo}`}>
                    <span className={styles.accesoIcono}>
                      <Icono size={30} />
                    </span>
                    <span className={styles.accesoTitulo}>{acceso.title}</span>
                    <ArrowRight size={26} className={styles.accesoFlecha} />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ── Beneficios ── Datos en vivo de GET /api/beneficios/vigentes (activos y no vencidos). */}
        {!esOrg && (
          <section className={styles.seccion}>
            <div className={styles.cabeza}>
              <h2 className={styles.titulo}>Beneficios para socios</h2>
              {/* El sitio institucional es el mismo SPA en "/": no es un enlace externo, por eso va con Link. */}
              {beneficios.length > 0 && (
                <Link to="/beneficios" className={styles.verTodos}>
                  Ver todos
                  <ArrowUpRight size={16} />
                </Link>
              )}
            </div>

            {beneficiosLoading ? (
              <div className={styles.esqueletos}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={styles.esqueleto} />
                ))}
              </div>
            ) : beneficiosError ? (
              <div className={styles.vacio}>No se pudieron cargar los beneficios en este momento.</div>
            ) : beneficios.length === 0 ? (
              <div className={styles.vacio}>Todavía no hay beneficios cargados.</div>
            ) : (
              <Carrusel etiqueta="Beneficios para socios">{destacados.map(renderBeneficio)}</Carrusel>
            )}
          </section>
        )}

        {/* ── Tutoriales ── */}
        <section className={styles.seccion}>
          <h2 className={styles.titulo}>Tutoriales</h2>

          <div className={styles.tutoriales}>
            {tutoriales.map((t) => (
              <article key={t.url} className={styles.tutorial}>
                {/* `preload="none"` y no "metadata": el video no se descarga hasta que alguien lo pide. */}
                <video
                  className={styles.video}
                  src={t.url}
                  controls
                  preload="none"
                  playsInline
                  controlsList="nodownload"
                />
                <h3 className={styles.tutorialTitulo}>{t.titulo}</h3>
              </article>
            ))}

            {TUTORIALES_PENDIENTES.map((titulo) => (
              <div key={titulo} className={`${styles.tutorial} ${styles.pendiente}`}>
                <div className={styles.miniatura}>
                  <PlayCircle size={30} />
                </div>
                <h3 className={styles.tutorialTitulo}>{titulo}</h3>
                <p className={styles.pronto}>Disponible pronto</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Soporte ── */}
        <section className={styles.soporte}>
          <div>
            <h2 className={styles.soporteTitulo}>¿Necesitás una mano?</h2>
            <p className={styles.soporteTexto}>
              Escribinos por WhatsApp si algo no funciona. Si un dato de tu legajo está mal, reportalo desde{" "}
              <Link to="/panel/mi-perfil" className={styles.enlace}>
                Mi perfil
              </Link>
              .
            </p>
          </div>

          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className={styles.soporteBoton}>
            <LifeBuoy size={17} />
            Contactar soporte
            <ExternalLink size={15} />
          </a>
        </section>
      </div>
    </div>
  );
};

export default InicioMedico;
