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
    id: "p5",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1765899938/WhatsApp_Image_2025-12-15_at_8.08.39_PM_1_jz02ez.jpg",
    miniatura: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1765899937/WhatsApp_Image_2025-12-15_at_8.08.40_PM_1_e46aef.jpg",
    titulo: "Remodelaciones del Quincho",
    fecha: "2025-12-16",
    etiquetas: ["quincho", "refacciones"],
  },
]

export default function GaleriaPage() {
  return (
    <div className={styles.galeriaWrap}>
      <Gallery items={mockItems} />
    </div>
  )
}
