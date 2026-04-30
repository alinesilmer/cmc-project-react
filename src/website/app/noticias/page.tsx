import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiFilter, FiX } from "react-icons/fi";
import NoticiaCard from "../../components/Noticias/NoticiaCard/NoticiaCard";
import PageHero from "../../components/UI/Hero/Hero";
import { listNews } from "../../lib/news.client";

import type { Noticia } from "../../types";
import styles from "./noticias.module.scss";

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeFiltro, setBadgeFiltro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Noticias | Colegio Médico de Corrientes";
    return () => { document.title = "Colegio Médico de Corrientes"; };
  }, []);

  useEffect(() => {
    cargarNoticias();
  }, []);

  const cargarNoticias = async () => {
    try {
      setLoading(true);
      const data = await listNews({ tipo: "Noticia" });
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
        title="NOTICIAS"
        subtitle="Descubre las últimas novedades en el Colegio Médico de Corrientes"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/v1775665371/heroImg_fus7an.png"
      />
      <main className={styles.noticiasPage}>
        <div className={styles.container}>
          {!loading && (() => {
            const badges = Array.from(new Set(noticias.map((n) => n.badge).filter(Boolean))) as string[];
            return badges.length > 0 ? (
              <div className={styles.filterRow}>
                <span className={styles.filterLabel}>
                  <FiFilter />
                  Filtrar:
                </span>
                {badges.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={`${styles.filterBtn} ${badgeFiltro === b ? styles.filterBtnActive : ""}`}
                    onClick={() => setBadgeFiltro((prev) => (prev === b ? null : b))}
                    aria-pressed={badgeFiltro === b}
                  >
                    {b}
                    {badgeFiltro === b && <FiX className={styles.filterBtnIcon} />}
                  </button>
                ))}
              </div>
            ) : null;
          })()}

          {loading ? (
            <div className={styles.loading}>Cargando noticias...</div>
          ) : noticias.length === 0 ? (
            <div className={styles.empty}>
              <p>No hay noticias disponibles en este momento.</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {noticias
                .filter((n) => !badgeFiltro || n.badge === badgeFiltro)
                .map((noticia) => (
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
