import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NoticiaCard from "../../components/Noticias/NoticiaCard/NoticiaCard";
import PageHero from "../../components/UI/Hero/Hero";
// import hero from "../../assets/images/heroImg.png";
// import { api } from "../../lib/api";
import { listNews } from "../../lib/news.client";
// import { mediaUrl } from "../../lib/media";

import type { Noticia } from "../../types";
import styles from "./blog.module.scss";
const hero =
  "https://res.cloudinary.com/dcfkgepmp/image/upload/v1764706080/20251202_1707_Healthcare_Symbolism_simple_compose_01kbgar3gzessrvtewjpfs4yqs_wuqusk.png";
export default function BlogsPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // const [tipo, setTipo] = useState<TipoPublicacion | "Todos">("Todos");

  useEffect(() => {
    cargarNoticias();
  }, []);

  const cargarNoticias = async () => {
    try {
      setLoading(true);
      const data = await listNews({ tipo: "Blog" });
      const normalized = data.map((n: any) => ({
        ...n,
        fechaCreacion: n.fecha_creacion ?? n.fechaCreacion ?? null,
        fechaActualizacion:
          n.fecha_actualizacion ?? n.fechaActualizacion ?? null,
      }));
      setNoticias(normalized);
    } catch (error) {
      console.error("Error al cargar noticias:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero
        title="BLOG"
        subtitle="Descubre las últimas novedades en el Colegio Médico de Corrientes"
        backgroundImage={hero}
      />
      <main className={styles.noticiasPage}>
        <div className={styles.container}>
          {/* filtro por tipo */}
          {/* <div className={styles.filtersBar}>
            <label className={styles.filterLabel}>
              Tipo
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as any)}
                className={styles.filterSelect}
              >
                <option value="Todos">Todos</option>
                <option value="Noticia">Noticia</option>
                <option value="Blog">Blog</option>
              </select>
            </label>
          </div> */}

          {loading ? (
            <div className={styles.loading}>Cargando blogs...</div>
          ) : noticias.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay blogs disponibles en este momento.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {noticias.map((noticia) => (
                <NoticiaCard
                  key={noticia.id}
                  noticia={noticia}
                  onClick={() => navigate(`/blogs/${noticia.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
