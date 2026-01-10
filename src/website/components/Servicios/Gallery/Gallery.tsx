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
  base: "/media/galeria",
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

/** ====== "Albums" ====== */
type MediaFolder = {
  id: string
  nombre: string
  fecha?: string
  items: MediaItem[]
  cover?: MediaItem
}

const norm = (s?: string) => (s || "").trim()
const keySafe = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim()


function folderKeyOf(item: MediaItem) {
  const nombre = norm(item.titulo) || "Sin título"
  const fecha = norm(item.fecha) || ""
  return `${keySafe(nombre)}__${keySafe(fecha)}`
}

export default function Gallery({ items }: GalleryProps) {
  const [busqueda, setBusqueda] = useState("")
  const [filtro, setFiltro] = useState<"todo" | Tipo>("todo")

  const [folderId, setFolderId] = useState<string | null>(null)

  const [abierta, setAbierta] = useState(false)
  const [indice, setIndice] = useState(0)

  const contadores = useMemo(() => {
    const f = items.filter(i => i.tipo === "foto").length
    const v = items.filter(i => i.tipo === "video").length
    return { fotos: f, videos: v }
  }, [items])

  const visiblesItems = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items
      .filter(i => (filtro === "todo" ? true : i.tipo === filtro))
      .filter(i => {
        if (!q) return true
        const t = (i.titulo || "").toLowerCase()
        const tags = (i.etiquetas || []).join(" ").toLowerCase()
        const fecha = (i.fecha || "").toLowerCase()
        return t.includes(q) || tags.includes(q) || fecha.includes(q)
      })
  }, [items, busqueda, filtro])

  const folders = useMemo<MediaFolder[]>(() => {
    const map = new Map<string, MediaFolder>()

    for (const it of visiblesItems) {
      const k = folderKeyOf(it)
      const nombre = norm(it.titulo) || "Sin título"
      const fecha = norm(it.fecha) || undefined

      if (!map.has(k)) {
        map.set(k, {
          id: k,
          nombre,
          fecha,
          items: [],
          cover: undefined,
        })
      }
      const f = map.get(k)!
      f.items.push(it)
    }

    for (const f of map.values()) {
      const firstFoto = f.items.find(x => x.tipo === "foto")
      f.cover = firstFoto || f.items[0]
    }

    const arr = Array.from(map.values())
    arr.sort((a, b) => {
      const af = a.fecha || ""
      const bf = b.fecha || ""
      if (af !== bf) return bf.localeCompare(af)
      return a.nombre.localeCompare(b.nombre)
    })
    return arr
  }, [visiblesItems])

  const carpetaActual = useMemo(() => {
    if (!folderId) return null
    return folders.find(f => f.id === folderId) || null
  }, [folderId, folders])

  
  const gridItems = carpetaActual ? carpetaActual.items : []

  const abrir = (idx: number) => { setIndice(idx); setAbierta(true) }
  const cerrar = () => setAbierta(false)
  const anterior = () => setIndice(i => (i - 1 + gridItems.length) % gridItems.length)
  const siguiente = () => setIndice(i => (i + 1) % gridItems.length)

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
  }, [abierta, gridItems.length])

  const actual = gridItems[indice]

  // si cambian filtros/búsqueda y la carpeta seleccionada ya no existe, vuelvo atrás
  useEffect(() => {
    if (!folderId) return
    const exists = folders.some(f => f.id === folderId)
    if (!exists) {
      setFolderId(null)
      setAbierta(false)
      setIndice(0)
    }
  }, [folderId, folders])

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
              placeholder="Buscar por título, fecha o etiqueta…"
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

      {/* ===== Vista "carpetas" ===== */}
      {!folderId && items.length > 0 && (
        <>
          <div className={styles.breadcrumb}>
            <span className={styles.crumbStrong}>Carpetas</span>
          </div>

          <div className={styles.folders} role="list">
            {folders.map((f) => {
              const cover = f.cover
              const thumb = cover ? buildUrl(cover.tipo, cover.miniatura || cover.src, true) : ""
              const countFotos = f.items.filter(x => x.tipo === "foto").length
              const countVideos = f.items.filter(x => x.tipo === "video").length

              return (
                <button
                  key={f.id}
                  role="listitem"
                  className={styles.folderCard}
                  onClick={() => setFolderId(f.id)}
                  aria-label={`Abrir carpeta ${f.nombre}${f.fecha ? ` ${f.fecha}` : ""}`}
                >
                  <div className={styles.folderMedia}>
                    {thumb ? (
                      <img src={thumb} alt={f.nombre} className={styles.img} loading="lazy" />
                    ) : (
                      <div className={styles.folderPlaceholder} />
                    )}
                    <div className={styles.folderBadge}>📁</div>
                  </div>

                  <div className={styles.folderInfo}>
                    <h3 className={styles.folderTitle}>{f.nombre}</h3>
                    <div className={styles.folderMeta}>
                      {f.fecha && <span className={styles.fecha}>{f.fecha}</span>}
                      <span className={styles.folderCounts}>
                        {countFotos > 0 && `${countFotos} foto${countFotos === 1 ? "" : "s"}`}
                        {countFotos > 0 && countVideos > 0 && " · "}
                        {countVideos > 0 && `${countVideos} video${countVideos === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {folders.length === 0 && items.length > 0 && (
            <div className={styles.vacio}>
              <p>No hay resultados para tu búsqueda</p>
            </div>
          )}
        </>
      )}

      {/* ===== Vista dentro de carpeta ===== */}
      {folderId && carpetaActual && (
        <>
          <div className={styles.breadcrumb}>
            <button className={styles.backBtn} onClick={() => { setFolderId(null); setAbierta(false); setIndice(0) }}>
              ← Volver
            </button>
            <span className={styles.crumbStrong}>{carpetaActual.nombre}</span>
            {carpetaActual.fecha && <span className={styles.crumbMuted}>· {carpetaActual.fecha}</span>}
            <span className={styles.crumbMuted}>· {carpetaActual.items.length} item(s)</span>
          </div>

          <div className={styles.items} role="list">
            {gridItems.map((item, idx) => {
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

          {gridItems.length === 0 && (
            <div className={styles.vacio}>
              <p>No hay items en esta carpeta con los filtros actuales.</p>
            </div>
          )}
        </>
      )}

      {/* ===== Lightbox ===== */}
      {abierta && actual && (
        <div className={styles.lightbox} aria-modal="true" role="dialog" onClick={cerrar}>
          <div className={styles.marco} onClick={e => e.stopPropagation()}>
            <button className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">×</button>
            {gridItems.length > 1 && (
              <>
                <button className={styles.navIzq} onClick={anterior} aria-label="Anterior">‹</button>
                <button className={styles.navDer} onClick={siguiente} aria-label="Siguiente">›</button>
              </>
            )}

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
