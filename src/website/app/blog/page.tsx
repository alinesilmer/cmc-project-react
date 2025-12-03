import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import BlogCard from "../../components/Noticias/NoticiaCard/NoticiaCard";
import PageHero from "../../components/UI/Hero/Hero";
import hero from "../../assets/images/heroImg.png";
// import { api } from "../../lib/api";
import { listNews } from "../../lib/news.client";
// import { mediaUrl } from "../../lib/media";

import type { Noticia } from "../../types";
import styles from "./blog.module.scss";

export default function BlogsPage() {
  const [Blogs, setBlogs] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    cargarBlogs();
  }, []);

  const cargarBlogs = async () => {
    try {
      const data = await listNews();
      const normalized = data.map((n: any) => ({
        ...n,
        fechaCreacion: n.fecha_creacion ?? n.fechaCreacion ?? null,
        fechaActualizacion:
          n.fecha_actualizacion ?? n.fechaActualizacion ?? null,
      }));
      setBlogs(normalized);
      console.log(Blogs);
    } catch (error) {
      console.error("Error al cargar Blogs:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero
        title="Blog"
        subtitle="Artículos de interés desde el Colegio Médico de Corrientes"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/v1764706080/20251202_1707_Healthcare_Symbolism_simple_compose_01kbgar3gzessrvtewjpfs4yqs_wuqusk.png"
      />
      <main className={styles.BlogsPage}>
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>Cargando Blogs...</div>
          ) : Blogs.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay Blogs disponibles en este momento.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {Blogs.map((Blog) => (
                <BlogCard
                  key={Blog.id}
                  noticia={Blog}
                  onClick={() => navigate(`/Blogs/${Blog.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
