import { SquarePen, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import WhatsappIcon from "../../../components/UI/icons/WhatsappIcon";
import { formatearFecha } from "../../../lib/fechas";
import { linkWhatsApp } from "../../../lib/contacto";
import { PUBLICACIONES } from "../../../components/Contenido/publicaciones";
import type { Noticia } from "../../../types";
import styles from "./ItemPublicacion.module.scss";

type Props = {
  publicacion: Noticia;
  onEditar: (n: Noticia) => void;
  onBorrar: (n: Noticia) => void;
};

/** Enlace para compartir la publicación por WhatsApp, con título y URL pública. */
function linkCompartir(n: Noticia): string {
  const url = `${window.location.origin}${PUBLICACIONES[n.tipo ?? "Noticia"].ruta}/${n.id}`;
  return linkWhatsApp("", `${n.titulo} – ${url}`);
}

/** Tarjeta de una publicación en el administrador, con sus acciones. */
export default function ItemPublicacion({ publicacion: n, onEditar, onBorrar }: Props) {
  const esCurso = n.tipo === "Curso";

  return (
    <motion.div
      className={`${styles.noticiaItem} ${esCurso ? styles.tipoCurso : styles.tipoNoticia}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
    >
      <div className={styles.noticiaContent}>
        <div className={styles.cardMeta}>
          <span className={`${styles.badge} ${esCurso ? styles.badgeCurso : styles.badgeNoticia}`}>
            {n.tipo ?? "Noticia"}
          </span>
          <span className={`${styles.statusBadge} ${n.publicada ? styles.statusPublished : styles.statusDraft}`}>
            {n.publicada ? "Publicada" : "Borrador"}
          </span>
        </div>
        <h3 title={n.titulo}>{n.titulo}</h3>
        <p>{n.resumen}</p>
        {n.fechaCreacion && (
          <time className={styles.cardDate} dateTime={String(n.fechaCreacion)}>
            {formatearFecha(n.fechaCreacion, "corta")}
          </time>
        )}
      </div>

      <div className={styles.noticiaActions}>
        <a
          href={linkCompartir(n)}
          target="_blank"
          rel="noopener noreferrer"
          title="Compartir por WhatsApp"
          aria-label="Compartir por WhatsApp"
          className={styles.actionWhatsapp}
        >
          <WhatsappIcon />
        </a>
        <button type="button" onClick={() => onEditar(n)} title="Editar" aria-label="Editar publicación" className={styles.actionEdit}>
          <SquarePen />
        </button>
        <button type="button" onClick={() => onBorrar(n)} title="Eliminar" aria-label="Eliminar publicación" className={styles.actionDelete}>
          <Trash2 />
        </button>
      </div>
    </motion.div>
  );
}
