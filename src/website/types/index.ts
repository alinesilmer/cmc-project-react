export type TipoPublicacion = "Noticia" | "Curso";

export interface Noticia {
  id: string;
  titulo: string;
  contenido: string;
  resumen: string;
  autor: string;
  publicada: boolean;
  fechaCreacion: Date | string | null;
  fechaActualizacion: Date | string | null;
  portada?: string;
  tipo: TipoPublicacion;
  badge?: string;
}

export interface DocumentoNoticia {
  id: number;
  label?: string | null;
  original_name: string;
  filename: string;
  content_type?: string | null;
  size?: number | null;
  path: string;
}

export interface NoticiaDetail extends Noticia {
  documentos: DocumentoNoticia[];
  /** NRO_OBRASOCIAL alcanzados por la noticia (normas operativas). */
  obras_sociales?: number[];
}
