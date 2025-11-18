"use client"

import Gallery from  "../../components/Servicios/Gallery/Gallery"
import type { MediaItem } from "../../components/Servicios/Gallery/Gallery"
import styles from "./galeria.module.scss"

const mockItems: MediaItem[] = [
  {
    id: "p1",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc4_mnaqdz.jpg",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc4_mnaqdz.jpg",
    titulo: "Quinta del Colegio Médico de Corrientes",
    fecha: "2025-05-10",
    etiquetas: ["quinta"],
  },
  {
    id: "p2",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc9_ixcwxl.jpg",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc9_ixcwxl.jpg",
    titulo: "Quinta del Colegio Médico de Corrientes",
    fecha: "2025-06-15",
    etiquetas: ["quinta"],
  },
  {
    id: "p3",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc6_ik8rho.jpg",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc6_ik8rho.jpg",
    titulo: "Quinta del Colegio Médico de Corrientes",
    fecha: "2025-04-02",
    etiquetas: ["quinta"],
  },
  {
    id: "p4",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471701/quintacmc8_uycogj.jpg",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471701/quintacmc8_uycogj.jpg",
    titulo: "Nueva sala de reuniones",
    fecha: "2025-03-22",
    etiquetas: ["quinta"],
  },
  {
    id: "v1",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471701/quintacmc10_ykkf5p.jpg",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471701/quintacmc10_ykkf5p.jpg",
    titulo: "Mensaje institucional",
    fecha: "2025-07-20",
    etiquetas: ["institucional", "video"],
  },
  {
    id: "p5",
    tipo: "video",
    src: "https://www.youtube.com/watch?v=_GkShRlpE4s",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762129462/contactbg_dcrwvz.png",
    titulo: "Acto día del médico",
    fecha: "2025-12-03",
    etiquetas: ["acto", "celebración"],
  },
]

export default function GaleriaPage() {
  return (
    <div className={styles.galeriaWrap}>
      <Gallery items={mockItems} />
    </div>
  )
}
