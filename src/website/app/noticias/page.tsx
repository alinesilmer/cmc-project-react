import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NoticiaCard from "../../components/Noticias/NoticiaCard/NoticiaCard";
import PageHero from "../../components/UI/Hero/Hero";
import hero from "../../assets/images/heroImg.png";
import { api } from "../../lib/api";
import type { Noticia } from "../../types";
import styles from "./noticias.module.scss";

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    cargarNoticias();
  }, []);

  const cargarNoticias = async () => {
    try {
      const data = await api.obtenerNoticias();
      setNoticias(data);
    } catch (error) {
      console.error("Error al cargar noticias:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero
        title="NOTICIAS"
        subtitle="Descubre las últimas novedades en el Colegio Médico de Corrientes"
        backgroundImage={hero}
      />
      <main className={styles.noticiasPage}>
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>Cargando noticias...</div>
          ) : noticias.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay noticias disponibles en este momento.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {noticias.map((noticia) => (
                <NoticiaCard
                  key={noticia.id}
                  noticia={noticia}
                  onClick={() => navigate(`/noticias/${noticia.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
