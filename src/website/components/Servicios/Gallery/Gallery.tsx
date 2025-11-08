"use client"

import { useEffect, useMemo, useState } from "react"
import styles from "./Gallery.module.scss"

type Tipo = "foto" | "video"

export type MediaItem = {
  id: string
  tipo: Tipo
  src: string            
  miniatura?: string     
  titulo?: string
  fecha?: string
  etiquetas?: string[]
}

type GalleryProps = {
  items: MediaItem[]
}

/* RUTAS A MAPEAR  */
const MEDIA_ROUTES = {
  base: "/media/galeria",    // ej: "https://cdn.tu-dominio.com/galeria"
  foto: "fotos",
  video: "videos",
  thumb: "thumbs",
}

/* Helpers de ruteo */
const isAbsolute = (u: string) => /^(https?:)?\/\//.test(u) || u.startsWith("/")
const trimLeadingSlash = (p: string) => p.replace(/^\/+/, "")

function buildUrl(kind: Tipo, pathOrUrl: string, asThumb = false) {
  if (!pathOrUrl) return ""
  if (isAbsolute(pathOrUrl)) return pathOrUrl
  const folder = asThumb ? MEDIA_ROUTES.thumb : (kind === "foto" ? MEDIA_ROUTES.foto : MEDIA_ROUTES.video)
  return `${MEDIA_ROUTES.base}/${folder}/${trimLeadingSlash(pathOrUrl)}`
}

export default function Gallery({ items }: GalleryProps) {
  const [busqueda, setBusqueda] = useState("")
  const [filtro, setFiltro] = useState<"todo" | Tipo>("todo")
  const [abierta, setAbierta] = useState(false)
  const [indice, setIndice] = useState(0)

  // TODO backend: GET /api/galeria?tipo=&search= para traer items

  const contadores = useMemo(() => {
    const f = items.filter(i => i.tipo === "foto").length
    const v = items.filter(i => i.tipo === "video").length
    return { fotos: f, videos: v }
  }, [items])

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items
      .filter(i => (filtro === "todo" ? true : i.tipo === filtro))
      .filter(i => (q ? (i.titulo || "").toLowerCase().includes(q) || (i.etiquetas || []).join(" ").toLowerCase().includes(q) : true))
  }, [items, busqueda, filtro])

  const abrir = (idx: number) => { setIndice(idx); setAbierta(true) }
  const cerrar = () => setAbierta(false)
  const anterior = () => setIndice(i => (i - 1 + visibles.length) % visibles.length)
  const siguiente = () => setIndice(i => (i + 1) % visibles.length)

  useEffect(() => {
    if (!abierta) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar()
      if (e.key === "ArrowRight") siguiente()
      if (e.key === "ArrowLeft") anterior()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [abierta, visibles.length])

  const actual = visibles[indice]

  return (
    <section className={styles.galeria} aria-label="Galería del Colegio Médico de Corrientes">
      <div className={styles.encabezado}>
        <div className={styles.titulos}>
          <h2 className={styles.h2}>Galería</h2>
          <p className={styles.sub}>Fotos y videos del Colegio Médico de Corrientes.</p>
        </div>

        <div className={styles.controles}>
          <div className={styles.filtros}>
            <button
              className={`${styles.pill} ${filtro === "todo" ? styles.activa : ""}`}
              onClick={() => setFiltro("todo")}
            >
              Todo {items.length > 0 && `(${items.length})`}
            </button>
            <button
              className={`${styles.pill} ${filtro === "foto" ? styles.activa : ""}`}
              onClick={() => setFiltro("foto")}
            >
              Fotos ({contadores.fotos})
            </button>
            <button
              className={`${styles.pill} ${filtro === "video" ? styles.activa : ""}`}
              onClick={() => setFiltro("video")}
            >
              Videos ({contadores.videos})
            </button>
          </div>

          <div className={styles.busqueda}>
            <input
              className={styles.input}
              type="text"
              placeholder="Buscar por título o etiqueta…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              aria-label="Buscar en la galería"
            />
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div className={styles.vacio}>
          <p>No hay contenido cargado</p>
        </div>
      )}

      <div className={styles.items} role="list">
        {visibles.map((item, idx) => {
          const thumb = buildUrl(item.tipo, item.miniatura || item.src, true)
          return (
            <button
              role="listitem"
              key={item.id}
              className={styles.card}
              onClick={() => abrir(idx)}
              aria-label={`Abrir ${item.tipo === "video" ? "video" : "foto"} ${item.titulo || ""}`}
            >
              <div className={styles.media}>
                {item.tipo === "foto" ? (
                  <img src={thumb} alt={item.titulo || "Imagen"} className={styles.img} loading="lazy" />
                ) : (
                  <div className={styles.videoThumb}>
                    <img src={thumb} alt={item.titulo || "Video"} className={styles.img} loading="lazy" />
                    <span className={styles.play}>►</span>
                  </div>
                )}
              </div>
              <div className={styles.info}>
                <span className={`${styles.tipo} ${item.tipo === "video" ? styles.tagVideo : styles.tagFoto}`}>
                  {item.tipo === "video" ? "Video" : "Foto"}
                </span>
                <div className={styles.meta}>
                  <h3 className={styles.titulo}>{item.titulo || "Sin título"}</h3>
                  {item.fecha && <span className={styles.fecha}>{item.fecha}</span>}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {visibles.length === 0 && items.length > 0 && (
        <div className={styles.vacio}>
          <p>No hay resultados para tu búsqueda</p>
        </div>
      )}

      {abierta && actual && (
        <div className={styles.lightbox} aria-modal="true" role="dialog" onClick={cerrar}>
          <div className={styles.marco} onClick={e => e.stopPropagation()}>
            <button className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">×</button>
            <button className={styles.navIzq} onClick={anterior} aria-label="Anterior">‹</button>
            <button className={styles.navDer} onClick={siguiente} aria-label="Siguiente">›</button>
            <div className={styles.viewer}>
              {actual.tipo === "foto" ? (
                <img
                  src={buildUrl(actual.tipo, actual.src)}
                  alt={actual.titulo || "Imagen"}
                  className={styles.full}
                />
              ) : (
                <video
                  src={buildUrl(actual.tipo, actual.src)}
                  className={styles.full}
                  controls
                  playsInline
                />
              )}
            </div>
            <div className={styles.caption}>
              <div className={styles.capLeft}>
                <h4 className={styles.capTitulo}>{actual.titulo || "Sin título"}</h4>
                {actual.fecha && <span className={styles.capFecha}>{actual.fecha}</span>}
              </div>
              <div className={styles.capRight}>
                {actual.etiquetas && actual.etiquetas.length > 0 && (
                  <div className={styles.tags}>
                    {actual.etiquetas.map(tag => (
                      <span key={tag} className={styles.tag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
