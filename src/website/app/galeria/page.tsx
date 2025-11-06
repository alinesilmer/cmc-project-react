"use client"

import Gallery from  "../../components/Servicios/Gallery/Gallery"
import type { MediaItem } from "../../components/Servicios/Gallery/Gallery"
import styles from "./galeria.module.scss"

const mockItems: MediaItem[] = [
  {
    id: "p1",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc1/1600/900",
    miniatura: "https://picsum.photos/seed/cmc1/600/338",
    titulo: "Jornada de actualización",
    fecha: "2025-05-10",
    etiquetas: ["capacitaciones", "institucional"],
  },
  {
    id: "p2",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc2/1600/900",
    miniatura: "https://picsum.photos/seed/cmc2/600/338",
    titulo: "Entrega de credenciales",
    fecha: "2025-06-15",
    etiquetas: ["matrícula", "eventos"],
  },
  {
    id: "p3",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc3/1600/900",
    miniatura: "https://picsum.photos/seed/cmc3/600/338",
    titulo: "Capacitación en la sede central",
    fecha: "2025-04-02",
    etiquetas: ["formación"],
  },
  {
    id: "p4",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc4/1600/900",
    miniatura: "https://picsum.photos/seed/cmc4/600/338",
    titulo: "Nueva sala de reuniones",
    fecha: "2025-03-22",
    etiquetas: ["infraestructura"],
  },
  {
    id: "v1",
    tipo: "video",
    src: "https://www.w3schools.com/html/mov_bbb.mp4",
    miniatura: "https://picsum.photos/seed/cmcv1/600/338",
    titulo: "Mensaje institucional",
    fecha: "2025-07-20",
    etiquetas: ["institucional", "video"],
  },
  {
    id: "p5",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc5/1600/900",
    miniatura: "https://picsum.photos/seed/cmc5/600/338",
    titulo: "Acto día del médico",
    fecha: "2025-12-03",
    etiquetas: ["acto", "celebración"],
  },
  {
    id: "v2",
    tipo: "video",
    src: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    miniatura: "https://picsum.photos/seed/cmcv2/600/338",
    titulo: "Resumen de actividades",
    fecha: "2025-09-01",
    etiquetas: ["resumen", "video"],
  },
  {
    id: "p6",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc6/1600/900",
    miniatura: "https://picsum.photos/seed/cmc6/600/338",
    titulo: "Taller de actualización clínica",
    fecha: "2025-08-09",
    etiquetas: ["clínica", "taller"],
  },
  {
    id: "p7",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc7/1600/900",
    miniatura: "https://picsum.photos/seed/cmc7/600/338",
    titulo: "Nueva biblioteca",
    fecha: "2025-01-18",
    etiquetas: ["recursos"],
  },
  {
    id: "p8",
    tipo: "foto",
    src: "https://picsum.photos/seed/cmc8/1600/900",
    miniatura: "https://picsum.photos/seed/cmc8/600/338",
    titulo: "Auditorio renovado",
    fecha: "2025-02-05",
    etiquetas: ["auditorio", "obras"],
  },
]

export default function GaleriaPage() {
  return (
    <div className={styles.galeriaWrap}>
      <Gallery items={mockItems} />
    </div>
  )
}
