"use client"

import { useState, useEffect } from "react"
import styles from "./ObrasSociales.module.scss"

export type ObraSocial = {
  id: string
  nombre: string
  href?: string
}

type Props = {
  titulo?: string
  subtitulo?: string
  obras: ObraSocial[]
}

export default function ObrasSociales({
  titulo = "Convenios con Obras Sociales",
  subtitulo = "Coberturas y convenios vigentes con el Colegio Médico de Corrientes",
  obras,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <section className={styles.wrapper} aria-label="Convenios con Obras Sociales">
      <div className={styles.backgroundOrbs}>
        <div className={styles.orb1}></div>
        <div className={styles.orb2}></div>
      </div>

      <div className={`${styles.header} ${isVisible ? styles.headerVisible : ""}`}>
        <h2 className={styles.title}>{titulo}</h2>
        {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
      </div>

      <div className={styles.list} role="list">
        {obras.map((o, index) => {
          if (o.href) {
            return (
              <a
                key={o.id}
                href={o.href}
                target="_blank"
                rel="noopener noreferrer"
                role="listitem"
                className={`${styles.item} ${isVisible ? styles.itemVisible : ""}`}
                style={{ animationDelay: `${index * 0.05}s` }}
                aria-label={`Abrir detalles de ${o.nombre}`}
              >
               
                <div className={styles.name}>{o.nombre}</div>
              
              </a>
            )
          }

          return (
            <div
              key={o.id}
              role="listitem"
              className={`${styles.item} ${isVisible ? styles.itemVisible : ""}`}
              style={{ animationDelay: `${index * 0.05}s` }}
              aria-label={o.nombre}
            >
             
              <div className={styles.name}>{o.nombre}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
