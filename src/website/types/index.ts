export interface Noticia {
  id: string
  titulo: string
  contenido: string
  resumen: string
  imagen?: string
  autor: string
  archivo?: string
  fechaCreacion: Date | string
  fechaActualizacion: Date | string
  publicada: boolean
}

export interface Usuario {
  email: string
  nombre: string
  role: string
}
