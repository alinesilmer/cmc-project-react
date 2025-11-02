"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import styles from "./DirectivosCarousel.module.scss"

type Directivo = {
  id: string
  nombre: string
  cargo: string
  avatar: string // URL
}

const MOCK: Directivo[] = [
  { id: "1", nombre: "Pedro Espinoza", cargo: "Presidente", avatar: "https://i.pravatar.cc/240?img=5" },
  { id: "2", nombre: "Jorge Kundycki", cargo: "Vicepresidente", avatar: "https://i.pravatar.cc/240?img=15" },
  { id: "3", nombre: "José Vladimiro Stancoff", cargo: "Secretario General", avatar: "https://i.pravatar.cc/240?img=11" },
  { id: "4", nombre: "Mónica Vega", cargo: "Secretario de Actas", avatar: "https://i.pravatar.cc/240?img=9" },
  { id: "5", nombre: "Enrique Guerzovich", cargo: "Secretario de Hacienda", avatar: "https://i.pravatar.cc/240?img=23" },
  { id: "6", nombre: "Walter Pilchik", cargo: "Secretario de Prensa", avatar: "https://i.pravatar.cc/240?img=14" },
  { id: "7", nombre: "Bernardo Benítez", cargo: "Vocal Titular 1", avatar: "https://i.pravatar.cc/240?img=12" },
  { id: "8", nombre: "Diego Centurión", cargo: "Vocal Titular 2", avatar: "https://i.pravatar.cc/240?img=18" },
  { id: "9", nombre: "Pablo Collantes", cargo: "Vocal Titular 3", avatar: "https://i.pravatar.cc/240?img=8" },
  { id: "10", nombre: "María del Carmen Gauna de Solís", cargo: "Vocal Suplente 1", avatar: "https://i.pravatar.cc/240?img=7" },
  { id: "11", nombre: "Ramón Alberto Blanco", cargo: "Vocal Suplente 2", avatar: "https://i.pravatar.cc/240?img=6" },
]

export default function DirectivosCarousel() {
  const [items] = useState<Directivo[]>(MOCK)
  const [idx, setIdx] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return

    const t = setInterval(() => {
      setIdx((i) => (i + 1) % items.length)
    }, 5000)
    return () => clearInterval(t)
  }, [items.length, isAutoPlaying])

  const goToPrev = () => {
    setIsAutoPlaying(false)
    setIdx((i) => (i - 1 + items.length) % items.length)
  }

  const goToNext = () => {
    setIsAutoPlaying(false)
    setIdx((i) => (i + 1) % items.length)
  }

  const transform = useMemo(() => `translateX(calc(-${idx} * (var(--cardW) + var(--gap))))`, [idx])

  return (
    <div className={styles.carouselWrapper}>
      <button className={`${styles.navButton} ${styles.navButtonPrev}`} onClick={goToPrev} aria-label="Anterior">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>

      <div className={styles.carousel}>
        <div className={styles.track} ref={trackRef} style={{ transform }}>
          {items.map((p) => (
            <article key={p.id} className={styles.card}>
              <div className={styles.avatar}>
                <img src={p.avatar || "/placeholder.svg"} alt={p.nombre} loading="lazy" />
              </div>
              <div className={styles.info}>
                <div className={styles.name}>{p.nombre}</div>
                <div className={styles.role}>{p.cargo}</div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <button className={`${styles.navButton} ${styles.navButtonNext}`} onClick={goToNext} aria-label="Siguiente">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div className={styles.indicators}>
        {items.map((_, i) => (
          <button
            key={i}
            className={`${styles.indicator} ${i === idx ? styles.indicatorActive : ""}`}
            onClick={() => {
              setIsAutoPlaying(false)
              setIdx(i)
            }}
            aria-label={`Ir a diapositiva ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
