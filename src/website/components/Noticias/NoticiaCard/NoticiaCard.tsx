import { motion } from "framer-motion";
import { FiCalendar, FiUser, FiArrowRight } from "react-icons/fi";
import styles from "./NoticiaCard.module.scss";
import type { Noticia } from "../../../types";

interface NoticiaCardProps {
  noticia: Noticia;
  onClick: () => void;
}

type Dateish = string | number | Date | null | undefined;

function formatearFecha(fecha: Dateish): string {
  if (!fecha) return "";
  let d: Date;
  if (fecha instanceof Date) d = fecha;
  else if (typeof fecha === "string" || typeof fecha === "number")
    d = new Date(fecha);
  else return "";
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NoticiaCard({ noticia, onClick }: NoticiaCardProps) {
  const portada =
    (noticia.portada && noticia.portada.trim()) || "https://res.cloudinary.com/dcfkgepmp/image/upload/v1764076138/20251125_1004_Portada_M%C3%A9dica_Moderna_simple_compose_01kaxhrn6nfm2t5ftq9htn6c9v_q4kx1d.png";

  const fecha =
    formatearFecha((noticia as any).fechaCreacion) ||
    formatearFecha((noticia as any).fecha_creacion);

  const autor = noticia.autor || "Colegio Médico de Corrientes";

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      <div className={styles.image}>
        <img src={portada} alt={noticia.titulo} />
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{noticia.titulo}</h3>
        <p className={styles.resumen}>{noticia.resumen}</p>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <FiCalendar />
            {fecha}
          </span>
          <span className={styles.metaItem}>
            <FiUser />
            {autor}
          </span>
        </div>

        <button className={styles.readMore} type="button">
          Leer más <FiArrowRight />
        </button>
      </div>
    </motion.article>
  );
}
