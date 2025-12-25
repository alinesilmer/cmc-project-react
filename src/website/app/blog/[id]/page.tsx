// src/website/app/noticias/[id]/page.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCalendar, FiUser, FiArrowLeft } from "react-icons/fi";

import Button from "../../../components/UI/Button/Button";
import NoticiaContent from "../../../components/Noticias/NoticiaContent/NoticiaContent";

import { getNewsById } from "../../../lib/news.client";
import type { NoticiaDetail } from "../../../types";

import styles from "./blogs-detalle.module.scss";

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

export default function BlogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [noticia, setNoticia] = useState<NoticiaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getNewsById(id);
        setNoticia(data);
      } catch (err) {
        console.error("Error al cargar blog:", err);
        setNoticia(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fecha = useMemo(() => {
    if (!noticia) return "";
    return (
      formatearFecha((noticia as any).fechaCreacion) ||
      formatearFecha((noticia as any).fecha_creacion)
    );
  }, [noticia]);

  const autor = noticia?.autor || "Colegio Médico de Corrientes";

  const { pdfDocs, imageDocs, otherDocs } = useMemo(() => {
    const docs = noticia?.documentos ?? [];
    const isPdf = (ct?: string | null, p?: string) =>
      (ct || "").toLowerCase() === "application/pdf" ||
      (p || "").toLowerCase().endsWith(".pdf");
    const isImage = (ct?: string | null, p?: string) =>
      (ct || "").toLowerCase().startsWith("image/") ||
      /\.(png|jpe?g|gif|webp|avif)$/i.test(p || "");

    const pdf = docs.filter((d) => isPdf(d.content_type, d.path));
    const img = docs.filter((d) => isImage(d.content_type, d.path));
    const other = docs.filter((d) => !pdf.includes(d) && !img.includes(d));
    return { pdfDocs: pdf, imageDocs: img, otherDocs: other };
  }, [noticia]);

  const featuredPdf = pdfDocs[0];

  if (loading) {
    return (
      <main className={styles.noticiaDetalle}>
        <div className={styles.loading}>Cargando...</div>
      </main>
    );
  }

  if (!noticia) {
    return (
      <main className={styles.noticiaDetalle}>
        <div className={styles.error}>Blog no encontrada</div>
      </main>
    );
  }

  return (
    <main className={styles.noticiaDetalle}>
      <div className={styles.container}>
        <Button
          size="medium"
          variant="outline"
          icon={<FiArrowLeft />}
          onClick={() => navigate("/blogs")}
        >
          Volver a Blog
        </Button>

        <motion.article
          className={styles.article}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Portada (opcional) */}
          {noticia.portada && (
            <div className={styles.image}>
              <img src={noticia.portada} alt={noticia.titulo} />
            </div>
          )}

          <h1 className={styles.title}>{noticia.titulo}</h1>

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

          {/* PDF destacado (si existe alguno) */}
          {featuredPdf && (
            <div className={styles.pdfViewer}>
              <object
                data={featuredPdf.path}
                type="application/pdf"
                className={styles.pdfObject}
              >
                <p>
                  No se pudo mostrar el PDF.{" "}
                  <a href={featuredPdf.path} target="_blank" rel="noreferrer">
                    Abrir en una pestaña nueva
                  </a>
                  .
                </p>
              </object>

              <div className={styles.pdfActions}>
                <a
                  href={featuredPdf.path}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.viewBtn}
                >
                  Ver PDF
                </a>
                <a
                  href={featuredPdf.path}
                  download
                  className={styles.downloadBtn}
                >
                  Descargar PDF
                </a>
              </div>
            </div>
          )}

          {/* Imágenes adjuntas (galería simple) */}
          {imageDocs.length > 0 && (
            <div className={styles.images}>
              {imageDocs.map((img) => (
                <a
                  key={img.id}
                  href={img.path}
                  target="_blank"
                  rel="noreferrer"
                >
                  <img src={img.path} alt={img.original_name || img.filename} />
                </a>
              ))}
            </div>
          )}

          {/* Otros PDFs (si hay más de uno) y adjuntos "otros" */}
          {(pdfDocs.length > 1 || otherDocs.length > 0) && (
            <div className={styles.attachments}>
              <h3>Adjuntos</h3>
              <ul>
                {pdfDocs.slice(1).map((doc) => (
                  <li key={`pdf-${doc.id}`}>
                    <a href={doc.path} target="_blank" rel="noreferrer">
                      📄 {doc.original_name || doc.filename}
                    </a>
                    {" · "}
                    <a href={doc.path} download>
                      Descargar
                    </a>
                  </li>
                ))}
                {otherDocs.map((doc) => (
                  <li key={`oth-${doc.id}`}>
                    <a href={doc.path} target="_blank" rel="noreferrer">
                      📎 {doc.original_name || doc.filename}
                    </a>
                    {" · "}
                    <a href={doc.path} download>
                      Descargar
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contenido en Markdown */}
          <NoticiaContent
            contenido={noticia.contenido}
            className={styles.content}
          />
        </motion.article>
      </div>
    </main>
  );
}
