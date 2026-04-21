import { useEffect, useState } from "react"
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
  loading?: boolean
  error?: string | null
}

export default function ObrasSociales({
  titulo = "Convenios con Obras Sociales",
  subtitulo = "Coberturas y convenios vigentes con el Colegio Médico de Corrientes",
  obras,
  loading = false,
  error = null,
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

      {loading && (
        <p className={styles.statusMsg} aria-live="polite">
          Cargando convenios…
        </p>
      )}

      {!loading && error && (
        <p className={styles.statusMsg} role="alert">
          {error}
        </p>
      )}

      {!loading && !error && obras.length === 0 && (
        <p className={styles.statusMsg}>No hay convenios disponibles en este momento.</p>
      )}

      {!loading && !error && obras.length > 0 && (
        <div className={styles.list} role="list">
          {obras.map((o, index) =>
            o.href ? (
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
            ) : (
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
          )}
        </div>
      )}
    </section>
  )
}
