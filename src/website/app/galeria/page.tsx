"use client"

import Gallery from "../../components/Servicios/Gallery/Gallery"
import type { MediaItem } from "../../components/Servicios/Gallery/Gallery"
import styles from "./galeria.module.scss"

const QUINTA_FOLDER_TITLE = "Quinta y Quincho"
const QUINTA_FOLDER_DATE = "2025-09-16"
const FIESTA_MED_2025 = "Fiesta del Día del Médico 2025"
const FIESTA_MED_2025_DATE = "2025-12-06"

const mockItems: MediaItem[] = [
  {
    id: "p1",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc4_mnaqdz.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc4_mnaqdz.jpg",
    titulo: QUINTA_FOLDER_TITLE,
    fecha: QUINTA_FOLDER_DATE,
    etiquetas: ["quinta"],
  },
  {
    id: "p2",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc9_ixcwxl.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc9_ixcwxl.jpg",
    titulo: QUINTA_FOLDER_TITLE,
    fecha: QUINTA_FOLDER_DATE,
    etiquetas: ["quinta"],
  },
  {
    id: "p3",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc6_ik8rho.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471702/quintacmc6_ik8rho.jpg",
    titulo: QUINTA_FOLDER_TITLE,
    fecha: QUINTA_FOLDER_DATE,
    etiquetas: ["quinta"],
  },
  {
    id: "p4",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471701/quintacmc8_uycogj.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1762471701/quintacmc8_uycogj.jpg",
    titulo: QUINTA_FOLDER_TITLE,
    fecha: QUINTA_FOLDER_DATE,
    etiquetas: ["quinta"],
  },
  {
    id: "p5",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1765899938/WhatsApp_Image_2025-12-15_at_8.08.39_PM_1_jz02ez.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1765899937/WhatsApp_Image_2025-12-15_at_8.08.40_PM_1_e46aef.jpg",
    titulo: QUINTA_FOLDER_TITLE,
    fecha: QUINTA_FOLDER_DATE,
    etiquetas: ["quincho", "refacciones"],
  },
  {
    id: "p6",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475069/20251206_230358_crxaxr.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475069/20251206_230358_crxaxr.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
  {
    id: "p8",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475582/_DSC0055_usaahm.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475582/_DSC0055_usaahm.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
  {
    id: "p9",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/DSC_0011_n2w34x.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/DSC_0011_n2w34x.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
    {
    id: "p10",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475587/DSC_0246_doefle.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475587/DSC_0246_doefle.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
    {
    id: "p11",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/DSC_0032_mddz88.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/DSC_0032_mddz88.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
     {
    id: "p12",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/_DSC0051_tj88jz.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/_DSC0051_tj88jz.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
     {
    id: "p13",
    tipo: "foto",
    src: "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/DSC_0032_mddz88.jpg",
    miniatura:
      "https://res.cloudinary.com/dcfkgepmp/image/upload/v1767475583/DSC_0032_mddz88.jpg",
    titulo: FIESTA_MED_2025,
    fecha: FIESTA_MED_2025_DATE,
    etiquetas: ["médicos", "fiesta"],
  },
]

export default function GaleriaPage() {
  return (
    <div className={styles.galeriaWrap}>
      <Gallery items={mockItems} />
    </div>
  )
}
