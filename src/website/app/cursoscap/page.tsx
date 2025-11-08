"use client"

import React, { useMemo, useState } from "react"
import { BookOpen, Calendar, Clock, MapPin, Users, MonitorPlay, Search, X } from "lucide-react"
import styles from "./cursoscap.module.scss"
import Hero from "../../components/UI/Hero/Hero"
import CourseCapDetail from "../../components/UI/CourseCapDetail/CourseCapDetail"
import type { CursoCap } from "../../components/UI/CourseCapDetail/CourseCapDetail"

type Curso = CursoCap

// TODO backend: GET /api/cursos
const mockCursos: Curso[] = [
//   { id: "c1", titulo: "Actualización en Medicina Interna 2025", resumen: "Casos clínicos, algoritmos de diagnóstico y revisión de guías.", fecha: "2025-12-03", duracionHs: 12, modalidad: "Presencial", categoria: "Actualización", imagen: "https://picsum.photos/seed/cmc-course1/1200/675", cupos: 30, precio: 0, lugar: "Sede Central CMC", docente: "Dra. Andrea López" },
//   { id: "c2", titulo: "Gestión de Consultorios y Facturación", resumen: "Buenas prácticas administrativas, liquidación de honorarios y KPIs.", fecha: "2025-12-12", duracionHs: 8, modalidad: "Online", categoria: "Gestión", imagen: "https://picsum.photos/seed/cmc-course2/1200/675", cupos: 80, precio: 15000, docente: "Lic. Martín Ríos" },
//   { id: "c3", titulo: "Ética y Responsabilidad Profesional", resumen: "Marco normativo, valores éticos y toma de decisiones.", fecha: "2026-01-20", duracionHs: 6, modalidad: "Online", categoria: "Ética", imagen: "https://picsum.photos/seed/cmc-course3/1200/675", cupos: 120, precio: 0, docente: "Dr. Carlos Benítez" },
//   { id: "c4", titulo: "Historia Clínica Digital y Seguridad", resumen: "Registros electrónicos, interoperabilidad y privacidad de datos.", fecha: "2026-02-05", duracionHs: 10, modalidad: "Presencial", categoria: "Tecnología", imagen: "https://picsum.photos/seed/cmc-course4/1200/675", cupos: 25, precio: 22000, lugar: "Auditorio CMC", docente: "Ing. Sofía Duarte" },
//   { id: "c5", titulo: "Urgencias: protocolos y simulación", resumen: "Simulaciones de alta fidelidad y coordinación de equipos.", fecha: "2025-12-28", duracionHs: 14, modalidad: "Presencial", categoria: "Actualización", imagen: "https://picsum.photos/seed/cmc-course5/1200/675", cupos: 18, precio: 35000, lugar: "Centro de Simulación CMC", docente: "Dr. Nicolás Ferreyra" },
//   { id: "c6", titulo: "Telemedicina y Atención Remota", resumen: "Flujos de videoconsulta seguros y experiencia del paciente.", fecha: "2026-01-10", duracionHs: 5, modalidad: "Online", categoria: "Tecnología", imagen: "https://picsum.photos/seed/cmc-course6/1200/675", cupos: 200, precio: 0, docente: "Dra. Paula Quiroga" }
]

export default function CursosCapacitacionesPage() {
  const [q, setQ] = useState("")
  const [cat, setCat] = useState<"Todas" | Curso["categoria"]>("Todas")
  const [mod, setMod] = useState<"Todas" | Curso["modalidad"]>("Todas")
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Curso | null>(null)

  const noHayCursos = mockCursos.length === 0

  // TODO backend: GET /api/cursos?cat=&mod=&q=
  const cursosVisibles = useMemo(() => {
    const texto = q.trim().toLowerCase()
    return mockCursos
      .filter(c => (cat === "Todas" ? true : c.categoria === cat))
      .filter(c => (mod === "Todas" ? true : c.modalidad === mod))
      .filter(c => (texto ? (c.titulo + " " + c.resumen + " " + c.docente).toLowerCase().includes(texto) : true))
  }, [q, cat, mod])

  const fFecha = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" }).replace(".", "")

  const esGratis = (m: number) => m === 0
  const fPrecio = (m: number) =>
    m === 0 ? "Gratis" : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(m)

  // TODO backend: GET /api/cursos/:id
  const openDetail = (curso: Curso) => { setSelected(curso); setOpen(true) }
  const closeDetail = () => { setOpen(false); setSelected(null) }

  return (
    <div>
      <div>
        <Hero
          title="Cursos y Capacitaciones"
          subtitle="Formación continua para profesionales del Colegio Médico de Corrientes"
          backgroundImage={"https://res.cloudinary.com/dcfkgepmp/image/upload/v1762395219/20251105_2312_Medical_Tools_and_Books_simple_compose_01k9bew997e1btmrgfcs27m37g_gkzulx.png"}
        />
      </div>

      <section className={styles.wrapper} aria-label="Cursos y Capacitaciones">
        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                className={styles.input}
                placeholder="Buscar por título, docente o tema"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar cursos"
              />
              {q && (
                <button className={styles.clearBtn} onClick={() => setQ("")} aria-label="Limpiar búsqueda">
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.pills}>
            <button className={`${styles.pill} ${cat === "Todas" ? styles.active : ""}`} onClick={() => setCat("Todas")}>Todas</button>
            <button className={`${styles.pill} ${cat === "Actualización" ? styles.active : ""}`} onClick={() => setCat("Actualización")}>Actualización</button>
            <button className={`${styles.pill} ${cat === "Gestión" ? styles.active : ""}`} onClick={() => setCat("Gestión")}>Gestión</button>
            <button className={`${styles.pill} ${cat === "Ética" ? styles.active : ""}`} onClick={() => setCat("Ética")}>Ética</button>
            <button className={`${styles.pill} ${cat === "Tecnología" ? styles.active : ""}`} onClick={() => setCat("Tecnología")}>Tecnología</button>
          </div>

          <div className={styles.filtersRow}>
            <div className={styles.toggleGroup}>
              <button className={`${styles.toggle} ${mod === "Todas" ? styles.tActive : ""}`} onClick={() => setMod("Todas")}>Todas</button>
              <button className={`${styles.toggle} ${mod === "Presencial" ? styles.tActive : ""}`} onClick={() => setMod("Presencial")}>Presencial</button>
              <button className={`${styles.toggle} ${mod === "Online" ? styles.tActive : ""}`} onClick={() => setMod("Online")}>Online</button>
            </div>
          </div>
        </div>

        {noHayCursos ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><Search size={48} /></div>
            <h3 className={styles.emptyTitle}>No hay cursos disponibles</h3>
            <p className={styles.emptyText}>Próximamente publicaremos nuevas actividades de formación</p>
          </div>
        ) : (
          <>
            <div className={styles.resultsHeader}>
              <p className={styles.resultsCount}>
                {cursosVisibles.length} {cursosVisibles.length === 1 ? "curso encontrado" : "cursos encontrados"}
              </p>
            </div>

            <div className={styles.cards} role="list">
              {cursosVisibles.map((c, index) => (
                <div
                  key={c.id}
                  className={styles.card}
                  role="button"
                  tabIndex={0}
                  aria-label={`Ver detalle de ${c.titulo}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => openDetail(c)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      openDetail(c)
                    }
                  }}
                >
                  <div className={styles.media}>
                    <img className={styles.cover} src={c.imagen || "/placeholder.svg"} alt={c.titulo} loading="lazy" />
                    <div className={styles.mediaOverlay} />
                    <span className={`${styles.badge} ${c.modalidad === "Online" ? styles.badgeOnline : styles.badgePresencial}`}>
                      {c.modalidad === "Online" ? <MonitorPlay size={14} /> : <MapPin size={14} />}
                      {c.modalidad}
                    </span>
                  </div>

                  <div className={styles.content}>
                    <div className={styles.topline}>
                      <div className={styles.cat}>
                        <BookOpen size={14} />
                        <span>{c.categoria}</span>
                      </div>
                    </div>

                    <h2 className={styles.ctitle}>{c.titulo}</h2>
                    <p className={styles.desc}>{c.resumen}</p>

                    <div className={styles.meta}>
                      <div className={styles.metaItem}>
                        <Calendar size={16} />
                        <span>{fFecha(c.fecha)}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Clock size={16} />
                        <span>{c.duracionHs} h</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Users size={16} />
                        <span>{c.cupos} cupos</span>
                      </div>
                    </div>

                    <div className={styles.bottom}>
                      <div className={styles.teacher}>
                        <span className={styles.dot} />
                        <span>{c.docente}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {cursosVisibles.length === 0 && (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}><Search size={48} /></div>
                <h3 className={styles.emptyTitle}>No se encontraron cursos</h3>
                <p className={styles.emptyText}>Intentá ajustar los filtros o realizar una búsqueda diferente</p>
              </div>
            )}
          </>
        )}
      </section>

      <CourseCapDetail open={open} onClose={closeDetail} curso={selected} />
    </div>
  )
}
