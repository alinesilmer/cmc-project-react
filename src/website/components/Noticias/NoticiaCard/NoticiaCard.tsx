"use client";

import { motion } from "framer-motion";
import { FiCalendar, FiUser, FiArrowRight } from "react-icons/fi";
import styles from "./NoticiaCard.module.scss";
import type { Noticia } from "../../../types/index";

interface NoticiaCardProps {
  noticia: Noticia;
  onClick: () => void;
}

type TimestampLike = { toDate: () => Date };
type Dateish = string | number | Date | TimestampLike;

function formatearFecha(fecha: Dateish): string {
  let d: Date;
  if (typeof fecha === "string" || typeof fecha === "number")
    d = new Date(fecha);
  else if (fecha instanceof Date) d = fecha;
  else d = fecha.toDate();

  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NoticiaCard({ noticia, onClick }: NoticiaCardProps) {
  const archivo = noticia.archivo ?? "";
  const isPdf = archivo.toLowerCase().endsWith(".pdf");

  const imgSrc =
    noticia.imagen && noticia.imagen.trim()
      ? noticia.imagen
      : isPdf
      ? "/pdfImage.jpg"
      : "/placeholder.svg";

  return (
    <motion.article
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      onClick={onClick}
    >
      <div className={styles.image}>
        <img
          src={imgSrc}
          alt={isPdf ? `${noticia.titulo} (PDF)` : noticia.titulo}
          width={60}
          height={60}
        />
        {isPdf && <span className={styles.pdfBadge}>PDF</span>}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{noticia.titulo}</h3>
        <p className={styles.resumen}>{noticia.resumen}</p>

        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <FiCalendar />
            {formatearFecha(noticia.fechaCreacion as Dateish)}
          </span>
          <span className={styles.metaItem}>
            <FiUser />
            {noticia.autor}
          </span>
        </div>

        <button className={styles.readMore}>
          Leer más <FiArrowRight />
        </button>
      </div>
    </motion.article>
  );
}
