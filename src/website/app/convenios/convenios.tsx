"use client"

import ObrasSociales from "../../components/Servicios/ObrasSociales/ObrasSociales"
import type { ObraSocial } from "../../components/Servicios/ObrasSociales/ObrasSociales"
import styles from "./convenios.module.scss"

const mockObras: ObraSocial[] = [
  { id: "os1", nombre: "IOSCOR", logo: "https://picsum.photos/seed/ioscor/160/160", href: "https://www.ioscor.gob.ar" },
  { id: "os2", nombre: "PAMI", logo: "https://picsum.photos/seed/pami/160/160", href: "https://www.pami.org.ar" },
  { id: "os3", nombre: "OSDE", logo: "https://picsum.photos/seed/osde/160/160", href: "https://www.osde.com.ar" },
  { id: "os4", nombre: "Swiss Medical", logo: "https://picsum.photos/seed/swiss/160/160", href: "https://www.swissmedical.com.ar" },
  { id: "os5", nombre: "Medifé", logo: "https://picsum.photos/seed/medife/160/160", href: "https://www.medife.com.ar" },
  { id: "os6", nombre: "Galeno", logo: "https://picsum.photos/seed/galeno/160/160", href: "https://www.galeno.com.ar" },
  { id: "os7", nombre: "Sancor Salud", logo: "https://picsum.photos/seed/sancor/160/160", href: "https://www.sancorsalud.com.ar" },
  { id: "os8", nombre: "IOMA", logo: "https://picsum.photos/seed/ioma/160/160", href: "https://www.ioma.gba.gob.ar" },
  { id: "os9", nombre: "Jerárquicos Salud", logo: "https://picsum.photos/seed/jerarquicos/160/160", href: "https://www.jerarquicossalud.com.ar" },
  { id: "os10", nombre: "OSPRERA", logo: "https://picsum.photos/seed/osprera/160/160", href: "https://www.osprera.org.ar" },
  { id: "os11", nombre: "Accord Salud", logo: "https://picsum.photos/seed/accord/160/160", href: "https://www.accordsalud.com.ar" },
  { id: "os12", nombre: "Prevención Salud", logo: "https://picsum.photos/seed/prevencion/160/160", href: "https://www.prevencionsalud.com.ar" }
]

export default function ConveniosPage() {
  return (
    <div className={styles.galeriaWrap}>
      <ObrasSociales
        titulo="Convenios con Obras Sociales"
        subtitulo="Coberturas y convenios vigentes con el Colegio Médico de Corrientes"
        obras={mockObras}
      />
    </div>
  )
}
