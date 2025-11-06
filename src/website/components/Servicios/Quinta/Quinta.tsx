"use client"

import React from "react"
import { FaDownload } from "react-icons/fa"
import styles from "./Quinta.module.scss"
import Button from "../../UI/Button/Button"

type Props = {
  titulo?: string
  descripcion?: string
  pdfUrl: string
  etiquetaBoton?: React.ReactNode
}

export default function Quinta({
  titulo = "Quinta del Colegio",
  descripcion = "Requisitos y condiciones para alquilar la Quinta del Colegio Médico de Corrientes.",
  pdfUrl,
  etiquetaBoton = "Descargar requisitos",
}: Props) {
  return (
    <section className={styles.wrapper} aria-label="Quinta del Colegio">
      <div className={styles.card}>
        <div className={styles.texto}>
          <h3 className={styles.titulo}>{titulo}</h3>
          <p className={styles.descripcion}>{descripcion}</p>
        </div>

        <a href={pdfUrl} download aria-label="Descargar PDF con requisitos">
          <Button variant="secondary" size="large">
            <FaDownload className={styles.icono} />
            <span>{etiquetaBoton}</span>
          </Button>
        </a>
      </div>
    </section>
  )
}
