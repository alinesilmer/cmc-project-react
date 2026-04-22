export type TipoPublicacion = "Noticia" | "Curso";

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  resumen: string;
  autor: string;
  publicada: boolean;
  fechaCreacion: Date | string;
  fechaActualizacion: Date | string;
  portada?: string;
  tipo: TipoPublicacion;
  badge?: string;
}

export interface Usuario {
  email: string;
  nombre: string;
  role: string;
}

export interface DocumentoNoticias {
  id: number;
  label?: string | null;
  original_name: string;
  filename: string;
  content_type?: string | null;
  size?: number | null;
  path: string;
}

export interface NoticiaDetail extends Noticia {
  documentos: DocumentoNoticias[];
}
