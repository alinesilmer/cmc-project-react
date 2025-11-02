import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiCalendar, FiUser, FiArrowLeft } from "react-icons/fi";
import Header from "../../../components/UI/Header/Header";
import Footer from "../../../components/UI/Footer/Footer";
import Button from "../../../components/UI/Button/Button";
import { api } from "../../../lib/api";
import type { Noticia } from "../../../types";
import NoticiaContent from "../../../components/Noticias/NoticiaContent/NoticiaContent";
import styles from "./noticia-detalle.module.scss";

type TimestampLike = { toDate: () => Date };
type Dateish = string | number | Date | TimestampLike;

function formatearFecha(fecha: Dateish): string {
  let d: Date;
  if (typeof fecha === "string" || typeof fecha === "number") d = new Date(fecha);
  else if (fecha instanceof Date) d = fecha;
  else d = fecha.toDate();

  return d.toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function NoticiaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [noticia, setNoticia] = useState<Noticia | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) void cargarNoticia(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cargarNoticia = async (nid: string) => {
    try {
      const data = await api.obtenerNoticia(nid);
      setNoticia(data);
    } catch (error) {
      console.error("Error al cargar noticia:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className={styles.loading}>Cargando...</div>
        <Footer />
      </>
    );
  }

  if (!noticia) {
    return (
      <>
        <Header />
        <div className={styles.error}>Noticia no encontrada</div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className={styles.noticiaDetalle}>
        <div className={styles.container}>
          <Button
            size="large"
            variant="outline"
            icon={<FiArrowLeft />}
            onClick={() => navigate("/noticias")}
          >
            Volver a Noticias
          </Button>

          <motion.article
            className={styles.article}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {noticia.imagen && (
              <div className={styles.image}>
                <img src={noticia.imagen || "/placeholder.svg"} alt={noticia.titulo} />
              </div>
            )}

            <h1 className={styles.title}>{noticia.titulo}</h1>

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

            {noticia.archivo?.toLowerCase().endsWith(".pdf") && (
              <div className={styles.pdfViewer}>
                <object data={noticia.archivo} type="application/pdf" className={styles.pdfObject}>
                  <p>
                    No se pudo mostrar el PDF.{" "}
                    <a href={noticia.archivo} target="_blank" rel="noreferrer">
                      Abrir en una pestaña nueva
                    </a>
                    .
                  </p>
                </object>

                <div className={styles.pdfActions}>
                  <a href={noticia.archivo} target="_blank" rel="noreferrer" className={styles.viewBtn}>
                    Ver PDF
                  </a>
                  <a href={noticia.archivo} download className={styles.downloadBtn}>
                    Descargar PDF
                  </a>
                </div>
              </div>
            )}

            <NoticiaContent contenido={noticia.contenido} className={styles.content} />
          </motion.article>
        </div>
      </main>
      <Footer />
    </>
  );
}
