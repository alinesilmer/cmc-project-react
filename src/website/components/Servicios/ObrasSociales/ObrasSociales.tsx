"use client"

import styles from "./ObrasSociales.module.scss"

export type ObraSocial = {
  id: string
  nombre: string
  logo: string
  href?: string
}

type Props = {
  titulo?: string
  subtitulo?: string
  obras: ObraSocial[]
}

export default function ObrasSociales({ titulo = "Convenios con Obras Sociales", subtitulo = "Coberturas y convenios vigentes con el Colegio Médico de Corrientes", obras }: Props) {
  return (
    <section className={styles.wrapper} aria-label="Convenios con Obras Sociales">
      <div className={styles.header}>
        <h2 className={styles.title}>{titulo}</h2>
        {subtitulo && <p className={styles.subtitle}>{subtitulo}</p>}
      </div>
      <div className={styles.list} role="list">
        {obras.map((o) => {
          const contenido = (
            <>
              <div className={styles.logoBox}>
                <img src={o.logo} alt={`Logo de ${o.nombre}`} className={styles.logo} loading="lazy" />
              </div>
              <div className={styles.name}>{o.nombre}</div>
            </>
          )
          return o.href ? (
            <a key={o.id} href={o.href} target="_blank" rel="noopener noreferrer" role="listitem" className={styles.item} aria-label={`Abrir detalles de ${o.nombre}`}>
              {contenido}
            </a>
          ) : (
            <div key={o.id} role="listitem" className={styles.item} aria-label={o.nombre}>
              {contenido}
            </div>
          )
        })}
      </div>
    </section>
  )
}
