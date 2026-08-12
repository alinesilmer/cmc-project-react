import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ListadoContenido from "../../components/Contenido/ListadoContenido/ListadoContenido";
import type { ListadoTextos } from "../../components/Contenido/ListadoContenido/ListadoContenido";
import PageHero from "../../components/UI/Hero/Hero";
import { listNews } from "../../lib/news.client";
import type { Noticia } from "../../types";

const TEXTOS: ListadoTextos = {
  singular: "noticia",
  plural: "noticias",
  buscarPlaceholder: "Buscar noticias por título, autor o tema…",
  cargando: "Cargando noticias...",
  vacio: "No hay noticias disponibles en este momento.",
  sinResultados: "Ninguna noticia coincide con tu búsqueda.",
  verTodos: "Ver todas las noticias",
};

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Noticias | Colegio Médico de Corrientes";
    return () => {
      document.title = "Colegio Médico de Corrientes";
    };
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
      <ListadoContenido
        items={noticias}
        loading={loading}
        textos={TEXTOS}
        onSelect={(id) => navigate(`/noticias/${id}`)}
      />
    </div>
  );
}
