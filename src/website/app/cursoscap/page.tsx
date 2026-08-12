import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import ListadoContenido from "../../components/Contenido/ListadoContenido/ListadoContenido";
import type { ListadoTextos } from "../../components/Contenido/ListadoContenido/ListadoContenido";
import PageHero from "../../components/UI/Hero/Hero";
import { listCourses } from "../../lib/news.client";
import type { Noticia } from "../../types";

const TEXTOS: ListadoTextos = {
  singular: "curso",
  plural: "cursos",
  buscarPlaceholder: "Buscar cursos por título, autor o tema…",
  cargando: "Cargando cursos...",
  vacio: "No hay cursos publicados en este momento.",
  sinResultados: "Ningún curso coincide con tu búsqueda.",
  verTodos: "Ver todos los cursos",
};

export default function CursosPage() {
  const [items, setItems] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Cursos y Capacitaciones | Colegio Médico de Corrientes";
    return () => {
      document.title = "Colegio Médico de Corrientes";
    };
  }, []);

  useEffect(() => {
    void cargar();
  }, []);

  const cargar = async () => {
    try {
      setLoading(true);
      const data = await listCourses(); // sólo tipo "Curso"
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
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/v1775665371/heroImg_fus7an.png"
      />
      <ListadoContenido
        items={items}
        loading={loading}
        textos={TEXTOS}
        onSelect={(id) => navigate(`/cursos/${id}`)}
      />
    </div>
  );
}
