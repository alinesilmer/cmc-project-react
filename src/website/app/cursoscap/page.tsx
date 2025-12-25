import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NoticiaCard from "../../components/Noticias/NoticiaCard/NoticiaCard";
import PageHero from "../../components/UI/Hero/Hero";
import hero from "../../assets/images/heroImg.png";
import { listCourses } from "../../lib/news.client";
import type { Noticia } from "../../types";
import styles from "./cursoscap.module.scss";

export default function CursosPage() {
  const [items, setItems] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    void cargar();
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await listCourses(); // ✅ sólo "Curso"
      const normalized = data.map((n: any) => ({
        ...n,
        fechaCreacion: n.fecha_creacion ?? n.fechaCreacion ?? null,
        fechaActualizacion:
          n.fecha_actualizacion ?? n.fechaActualizacion ?? null,
      }));
      setItems(normalized);
    } catch (error) {
      console.error("Error al cargar cursos:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHero
        title="CURSOS"
        subtitle="Formación y actualización profesional del Colegio Médico de Corrientes"
        backgroundImage={hero}
      />
      <main className={styles.noticiasPage}>
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>Cargando cursos...</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay cursos publicados en este momento.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map((curso) => (
                <NoticiaCard
                  key={curso.id}
                  noticia={curso}
                  onClick={() => navigate(`/cursos/${curso.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
