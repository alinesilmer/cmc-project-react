import type { TipoPublicacion } from "../../types";

/** Los textos que cambian entre noticias y cursos. Todo lo demás es idéntico. */
export type TextosListado = {
  /** "noticia" / "curso" — para "3 noticias encontradas". */
  singular: string;
  plural: string;
  buscarPlaceholder: string;
  /** No hay nada publicado todavía. */
  vacio: string;
  /** Hay contenido pero ningún resultado para el filtro. */
  sinResultados: string;
  verTodos: string;
};

type ConfigPublicacion = {
  /** Ruta del listado; el detalle cuelga de `${ruta}/:id`. */
  ruta: string;
  tituloPagina: string;
  /** Título (lo resaltado va aparte), bajada y lema del panel: pocas palabras. */
  cabecera: { titulo: string; resaltado: string; bajada: string; lema: string; lemaResaltado: string };
  textos: TextosListado;
  noEncontrada: string;
  volver: string;
};

/**
 * Noticias y cursos son la misma publicación con distinto `tipo`: tenían dos
 * listados y dos páginas de detalle copiadas línea por línea, que ya habían
 * empezado a separarse (los cursos no mostraban la etiqueta).
 */
export const PUBLICACIONES: Record<TipoPublicacion, ConfigPublicacion> = {
  Noticia: {
    ruta: "/noticias",
    tituloPagina: "Noticias",
    cabecera: { titulo: "Últimas", resaltado: "noticias", bajada: "Lo que pasa en el Colegio.", lema: "Siempre", lemaResaltado: "al día." },
    textos: {
      singular: "noticia",
      plural: "noticias",
      buscarPlaceholder: "Buscar noticias…",
      vacio: "Todavía no hay noticias.",
      sinResultados: "Nada por acá.",
      verTodos: "Ver todas",
    },
    noEncontrada: "Noticia no encontrada",
    volver: "Volver a Noticias",
  },
  Curso: {
    ruta: "/cursos",
    tituloPagina: "Cursos y Capacitaciones",
    cabecera: { titulo: "Cursos y", resaltado: "capacitaciones", bajada: "Para seguir creciendo.", lema: "Aprender", lemaResaltado: "nunca termina." },
    textos: {
      singular: "curso",
      plural: "cursos",
      buscarPlaceholder: "Buscar cursos…",
      vacio: "Todavía no hay cursos.",
      sinResultados: "Nada por acá.",
      verTodos: "Ver todos",
    },
    noEncontrada: "Curso no encontrado",
    volver: "Volver a Cursos",
  },
};

/** Claves de React Query: el listado y el detalle se reusan entre visitas. */
export const publicacionesKey = (tipo: TipoPublicacion) => ["web", "publicaciones", tipo] as const;
export const publicacionKey = (id: string) => ["web", "publicacion", id] as const;

/** El autor cuando la publicación no trae uno. */
export const AUTOR_POR_DEFECTO = "Colegio Médico de Corrientes";
