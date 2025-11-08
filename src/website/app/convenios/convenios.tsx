"use client"

import ObrasSociales from "../../components/Servicios/ObrasSociales/ObrasSociales"
import type { ObraSocial } from "../../components/Servicios/ObrasSociales/ObrasSociales"
import styles from "./convenios.module.scss"
import Button from "../../components/UI/Button/Button"


const adicionalesNombres: string[] = [
  "AAMM (ASCARGMUTMOTO)",
  "AMMECO",
  "ASCMUTUAL PROTECCION FAMILIAR",
  "ASOCIACIÓN MUTUAL SANCOR",
  "ASSISTRAVEL",
  "AVALIAN",
  "BOREAL SALUD",
  "BRAMED SRL",
  "COMECOR (AMUR)",
  "CONDUCTORES NAVALES",
  "CONFERENCIA EPISCOPAL ARG",
  "DAS",
  "DASUTEN",
  "DIBA",
  "FARMACIA",
  "FEDERADA SALUD",
  "GALENO",
  "GERDANNA SA",
  "GRUPO MELD SALUD",
  "INDDEL",
  "IOSCOR",
  "IOSFA",
  "LUIS PASTEUR",
  "MEDICUS,AZUL,BCO,CELESTE-FC-",
  "MEDICUS,CORPORATE,FAMILY -MC-",
  "MEDIFE",
  "MEPLIFE SALUD",
  "MTRABDE METALURGICO",
  "MUTUAL SABATTINI",
  "NEDAR SA",
  "NOBIS MEDICAL",
  "NUEVA MUTUAL SERV-MEDICAL WORK",
  "OBRA SOCIAL DE FUTBOLISTAS",
  "OBRA SOCIAL MOSAISTAS",
  "OMINT SA",
  "OPDEA",
  "OSEMM",
  "OSETRA",
  "OSETYA",
  "OSALARA (OSADE LOTy AFINE)",
  "OSAPM",
  "OSCTCP",
  "OSDE",
  "OSDEPYM",
  "OSDOP",
  "OSFATUN",
  "OSFE",
  "OSFFENTOS",
  "OSJERA",
  "OSMATA",
  "OSMEDICA",
  "OSPEGAPSALUD",
  "OSPEP - OBRA SOCIAL DEL PERSONAL DE PANAD",
  "OSPERSAAMS",
  "OSPES",
  "OSPERYHRA",
  "OSPIL",
  "OSPIM",
  "OSPLAD",
  "OSPM",
  "OSPPRA",
  "OSPSA",
  "OSPSIP",
  "OSPSMBA",
  "OSPTA",
  "OSPTV",
  "OSSEG",
  "OSSACRA",
  "OSSIMRA",
  "OSTEL",
  "OSTRABVIALES Y AFINES",
  "OSTRAC",
  "OSTPCHPY ARA",
  "OSTV",
  "PATRONES DE CABOTAJE",
  "POLICÍA FEDERAL",
  "PREVENCIÓN SALUD SA",
  "PROGRAMAS MEDICOS SOC ARG DE CONSULTO",
  "S A M A",
  "SADAIC",
  "SCIS",
  "SINDICATO CAMIONEROS (CTES)",
  "SPF",
  "SUPERINTENDENCIA RIESGO DEL TRABAJO",
  "SWISS MEDICAL",
  "TARAGUI PORA",
  "UDEL PERSONAL CIVIL DE LA NAC",
  "UNIÓN OBRERA METALÚRGICA",
  "UNIÓN PERSONAL",
  "UNNE",
  "VETERANOS DE GUERRA",
  "VETERANOS DE MALVINAS OPE"
]


const adicionales: ObraSocial[] = adicionalesNombres.map((nombre, i) => ({
  id: `os${12 + i + 1}`,
  nombre,
} as ObraSocial))

const mockObras: ObraSocial[] = [...adicionales]

// contacto
const EMAIL = "auditoria@colegiomedicocorrientes.com"
const PHONE_AR = "543794252323"
const WA_MSG = "Hola, quiero coordinar para firmar un convenio con el CMC."
const WA_LINK = `https://wa.me/${PHONE_AR}?text=${encodeURIComponent(WA_MSG)}`
const MAILTO_LINK = `mailto:${EMAIL}?subject=${encodeURIComponent(
  "Carta de presentación - Convenio"
)}&body=${encodeURIComponent("Hola, adjunto carta de presentación para evaluar convenio. Gracias.")}`

export default function ConveniosPage() {
  return (
    <div className={styles.galeriaWrap}>
      <ObrasSociales
        titulo="Convenios con Obras Sociales"
        subtitulo="Coberturas y convenios vigentes con el Colegio Médico de Corrientes"
        obras={mockObras}
      />

      <div className={styles.cta}>
        <h2 className={styles.subtitle}>
          ¿Sos una Obra Social o empresa que quiere unirse al equipo de Colegio Médico de Corrientes? <br />
          ¡Hacé click en el botón de abajo!
        </h2>

        <a href={WA_LINK} target="_blank" rel="noopener noreferrer" aria-label="Chatear por WhatsApp">
          <Button variant="primary" size="large">Quiero firmar convenio</Button>
        </a>

        <p className={styles.otherOption}>
          Enviar carta de presentación al{" "}
          <a href={MAILTO_LINK} className={styles.link} aria-label="Enviar mail">
            {EMAIL}
          </a>{" "}
          y/o mensaje de WhatsApp al{" "}
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className={styles.link} aria-label="Abrir WhatsApp">
            379 425 2323
          </a>
        </p>
      </div>
    </div>
  )
}
