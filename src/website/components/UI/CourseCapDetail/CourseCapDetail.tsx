"use client"

import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { X, Calendar, Clock, Users, MapPin, MonitorPlay, BookOpen, DollarSign, ArrowRight, Award } from "lucide-react"
import styles from "./CourseCapDetail.module.scss"

export type CursoCap = {
  id: string
  titulo: string
  resumen: string
  fecha: string
  duracionHs: number
  modalidad: "Online" | "Presencial"
  categoria: "Actualización" | "Gestión" | "Ética" | "Tecnología"
  imagen: string
  cupos: number
  precio: number
  lugar?: string
  docente: string
}

type Props = {
  open: boolean
  onClose: () => void
  curso: CursoCap | null
}

export default function CourseCapDetail({ open, onClose, curso }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    if (open) document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open && closeBtnRef.current) closeBtnRef.current.focus()
  }, [open])

  if (!open || !curso) return null

  const fFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })
  const fPrecio = (m: number) =>
    m === 0
      ? "Gratis"
      : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(m)

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.categoryBadge}>
              <BookOpen size={16} />
              <span>{curso.categoria}</span>
            </div>
            <h3 id="modal-title" className={styles.title}>{curso.titulo}</h3>
          </div>
          <button ref={closeBtnRef} className={styles.close} onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.mediaSection}>
            <div className={styles.media}>
              <img
                src={curso.imagen || "/placeholder.svg"}
                alt={curso.titulo}
                className={styles.cover}
                loading="lazy"
              />
              <div className={styles.mediaGradient} />
              <span className={`${styles.badge} ${curso.modalidad === "Online" ? styles.badgeOnline : styles.badgePresencial}`}>
                {curso.modalidad === "Online" ? <MonitorPlay size={16} /> : <MapPin size={16} />}
                {curso.modalidad}
              </span>
            </div>
          </div>

          <div className={styles.info}>
            <div className={styles.metaList}>
              <div className={styles.metaCard}>
                <Calendar size={20} />
                <div className={styles.metaCardContent}>
                  <span className={styles.metaLabel}>Fecha de inicio</span>
                  <span className={styles.metaValue}>{fFecha(curso.fecha)}</span>
                </div>
              </div>

              <div className={styles.metaCard}>
                <Clock size={20} />
                <div className={styles.metaCardContent}>
                  <span className={styles.metaLabel}>Duración</span>
                  <span className={styles.metaValue}>{curso.duracionHs} horas</span>
                </div>
              </div>

              <div className={styles.metaCard}>
                <Users size={20} />
                <div className={styles.metaCardContent}>
                  <span className={styles.metaLabel}>Cupos disponibles</span>
                  <span className={styles.metaValue}>{curso.cupos} lugares</span>
                </div>
              </div>

              {curso.lugar && (
                <div className={styles.metaCard}>
                  <MapPin size={20} />
                  <div className={styles.metaCardContent}>
                    <span className={styles.metaLabel}>Ubicación</span>
                    <span className={styles.metaValue}>{curso.lugar}</span>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.descSection}>
              <h4 className={styles.descTitle}>Sobre este curso</h4>
              <p className={styles.desc}>{curso.resumen}</p>
            </div>

            <div className={styles.teacherSection}>
              <div className={styles.teacherCard}>
                <Award size={20} />
                <div className={styles.teacherInfo}>
                  <span className={styles.teacherLabel}>Docente a cargo</span>
                  <span className={styles.teacherName}>{curso.docente}</span>
                </div>
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.priceSection}>
                <span className={styles.priceLabel}>Inversión</span>
                <div className={styles.priceBadge}>
                  <span className={styles.priceValue}>{fPrecio(curso.precio)}</span>
                </div>
              </div>

              <Link to={`/cursos/${curso.id}`} className={styles.primaryBtn} onClick={onClose} aria-label="Inscribirme">
                <span>Inscribirme ahora</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <button className={styles.backdrop} aria-hidden="true" onClick={onClose} tabIndex={-1} />
    </div>
  )
}
