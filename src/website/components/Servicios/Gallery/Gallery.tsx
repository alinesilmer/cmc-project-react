import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  FiSearch, FiX, FiFolder, FiPlay,
  FiChevronLeft, FiChevronRight, FiImage,
} from "react-icons/fi"
import styles from "./Gallery.module.scss"

const EASE = [0.22, 1, 0.36, 1] as const

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

const MEDIA_ROUTES = {
  base: "/media/galeria",
  foto: "fotos",
  video: "videos",
  thumb: "thumbs",
}

const isAbsolute = (u: string) => /^(https?:)?\/\//.test(u) || u.startsWith("/")
const trimLeadingSlash = (p: string) => p.replace(/^\/+/, "")

function buildUrl(kind: Tipo, pathOrUrl: string, asThumb = false) {
  if (!pathOrUrl) return ""
  if (isAbsolute(pathOrUrl)) return pathOrUrl
  const folder = asThumb
    ? MEDIA_ROUTES.thumb
    : kind === "foto" ? MEDIA_ROUTES.foto : MEDIA_ROUTES.video
  return `${MEDIA_ROUTES.base}/${folder}/${trimLeadingSlash(pathOrUrl)}`
}

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
  const fecha  = norm(item.fecha) || ""
  return `${keySafe(nombre)}__${keySafe(fecha)}`
}

export default function Gallery({ items }: GalleryProps) {
  const prefersReduced = useReducedMotion()
  const [busqueda, setBusqueda] = useState("")
  const [filtro,   setFiltro]   = useState<"todo" | Tipo>("todo")
  const [folderId, setFolderId] = useState<string | null>(null)
  const [abierta,  setAbierta]  = useState(false)
  const [indice,   setIndice]   = useState(0)

  const contadores = useMemo(() => ({
    fotos:  items.filter(i => i.tipo === "foto").length,
    videos: items.filter(i => i.tipo === "video").length,
  }), [items])

  const visiblesItems = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return items
      .filter(i => filtro === "todo" || i.tipo === filtro)
      .filter(i => {
        if (!q) return true
        const t    = (i.titulo   || "").toLowerCase()
        const tags = (i.etiquetas || []).join(" ").toLowerCase()
        const f    = (i.fecha    || "").toLowerCase()
        return t.includes(q) || tags.includes(q) || f.includes(q)
      })
  }, [items, busqueda, filtro])

  const folders = useMemo<MediaFolder[]>(() => {
    const map = new Map<string, MediaFolder>()
    for (const it of visiblesItems) {
      const k      = folderKeyOf(it)
      const nombre = norm(it.titulo) || "Sin título"
      const fecha  = norm(it.fecha) || undefined
      if (!map.has(k)) map.set(k, { id: k, nombre, fecha, items: [], cover: undefined })
      map.get(k)!.items.push(it)
    }
    for (const f of map.values()) {
      f.cover = f.items.find(x => x.tipo === "foto") || f.items[0]
    }
    return Array.from(map.values()).sort((a, b) => {
      const d = (b.fecha || "").localeCompare(a.fecha || "")
      return d !== 0 ? d : a.nombre.localeCompare(b.nombre)
    })
  }, [visiblesItems])

  const carpetaActual = useMemo(() =>
    folderId ? folders.find(f => f.id === folderId) ?? null : null,
  [folderId, folders])

  const gridItems = carpetaActual ? carpetaActual.items : []

  const abrir    = (idx: number) => { setIndice(idx); setAbierta(true) }
  const cerrar   = () => setAbierta(false)
  const anterior = () => setIndice(i => (i - 1 + gridItems.length) % gridItems.length)
  const siguiente = () => setIndice(i => (i + 1) % gridItems.length)

  useEffect(() => {
    if (!abierta) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape")     cerrar()
      if (e.key === "ArrowRight") siguiente()
      if (e.key === "ArrowLeft")  anterior()
    }
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [abierta, gridItems.length])

  useEffect(() => {
    if (!folderId) return
    if (!folders.some(f => f.id === folderId)) {
      setFolderId(null); setAbierta(false); setIndice(0)
    }
  }, [folderId, folders])

  const actual = gridItems[indice]

  const FILTER_OPTS = [
    { key: "todo",  label: `Todo`,              count: items.length },
    { key: "foto",  label: `Fotos`,             count: contadores.fotos },
    { key: "video", label: `Videos`,            count: contadores.videos },
  ] as const

  return (
    <section className={styles.galeria} aria-label="Galería del Colegio Médico de Corrientes">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.titulos}>
          <h2 className={styles.h2}>Galería de Fotos y Videos</h2>
        </div>

        <div className={styles.controles}>
          {/* Filter pills */}
          <div className={styles.filtros} role="group" aria-label="Filtrar por tipo">
            {FILTER_OPTS.map(({ key, label, count }) => (
              <button
                key={key}
                className={`${styles.pill} ${filtro === key ? styles.activa : ""}`}
                onClick={() => setFiltro(key as typeof filtro)}
                aria-pressed={filtro === key}
              >
                {label}
                {count > 0 && <span className={styles.pillCount}>{count}</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className={styles.searchWrap}>
            <FiSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              className={styles.input}
              type="search"
              placeholder="Buscar por título, fecha o etiqueta…"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              aria-label="Buscar en la galería"
            />
            {busqueda && (
              <button className={styles.clearBtn} onClick={() => setBusqueda("")} aria-label="Limpiar búsqueda">
                <FiX size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {items.length === 0 && (
        <div className={styles.vacio}>
          <FiImage size={32} className={styles.vacioIcon} />
          <p>No hay contenido cargado</p>
        </div>
      )}

      {/* ── Folder view ─────────────────────────────────────────────────────── */}
      {!folderId && items.length > 0 && (
        <>
          <div className={styles.breadcrumb}>
            <span className={styles.crumbLabel}>Álbumes</span>
            <span className={styles.crumbCount}>{folders.length}</span>
          </div>

          <div className={styles.folders} role="list">
            {folders.map((f, i) => {
              const cover = f.cover
              const thumb = cover ? buildUrl(cover.tipo, cover.miniatura || cover.src, true) : ""
              const countFotos  = f.items.filter(x => x.tipo === "foto").length
              const countVideos = f.items.filter(x => x.tipo === "video").length

              return (
                <motion.button
                  key={f.id}
                  role="listitem"
                  className={styles.folderCard}
                  onClick={() => setFolderId(f.id)}
                  aria-label={`Abrir álbum: ${f.nombre}${f.fecha ? `, ${f.fecha}` : ""}`}
                  initial={prefersReduced ? false : { opacity: 0, y: 18 }}
                  whileInView={prefersReduced ? {} : { opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, ease: EASE, delay: Math.min(i * 0.08, 0.3) }}
                >
                  <div className={styles.folderMedia}>
                    {thumb
                      ? <img src={thumb} alt={f.nombre} className={styles.folderImg} loading="lazy" decoding="async" />
                      : <div className={styles.folderPlaceholder}><FiImage size={28} /></div>
                    }
                    <div className={styles.folderBadge}>
                      <FiFolder size={12} />
                      <span>{f.items.length}</span>
                    </div>
                  </div>
                  <div className={styles.folderInfo}>
                    <h3 className={styles.folderTitle}>{f.nombre}</h3>
                    <div className={styles.folderMeta}>
                      {f.fecha && <span className={styles.folderFecha}>{f.fecha}</span>}
                      <span className={styles.folderCounts}>
                        {countFotos > 0 && `${countFotos} foto${countFotos === 1 ? "" : "s"}`}
                        {countFotos > 0 && countVideos > 0 && " · "}
                        {countVideos > 0 && `${countVideos} video${countVideos === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {folders.length === 0 && items.length > 0 && (
            <div className={styles.vacio}>
              <FiSearch size={28} className={styles.vacioIcon} />
              <p>No hay resultados para tu búsqueda</p>
            </div>
          )}
        </>
      )}

      {/* ── Items inside a folder ───────────────────────────────────────────── */}
      {folderId && carpetaActual && (
        <>
          <div className={styles.breadcrumb}>
            <button
              className={styles.backBtn}
              onClick={() => { setFolderId(null); setAbierta(false); setIndice(0) }}
              aria-label="Volver a álbumes"
            >
              <FiChevronLeft size={15} />
              Volver
            </button>
            <span className={styles.crumbSep} aria-hidden="true">/</span>
            <span className={styles.crumbLabel}>{carpetaActual.nombre}</span>
            {carpetaActual.fecha && <span className={styles.crumbMuted}>{carpetaActual.fecha}</span>}
            <span className={styles.crumbCount}>{carpetaActual.items.length}</span>
          </div>

          <div className={styles.items} role="list">
            {gridItems.map((item, idx) => {
              const thumb = buildUrl(item.tipo, item.miniatura || item.src, true)
              return (
                <motion.button
                  role="listitem"
                  key={item.id}
                  className={styles.card}
                  onClick={() => abrir(idx)}
                  aria-label={`Abrir ${item.tipo === "video" ? "video" : "foto"}: ${item.titulo || "sin título"}`}
                  initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
                  animate={prefersReduced ? {} : { opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: EASE, delay: Math.min(idx * 0.06, 0.25) }}
                >
                  <div className={styles.media}>
                    <img src={thumb} alt={item.titulo || (item.tipo === "video" ? "Video" : "Imagen")} className={styles.img} loading="lazy" decoding="async" />
                    {item.tipo === "video" && (
                      <div className={styles.playOverlay} aria-hidden="true">
                        <FiPlay size={22} />
                      </div>
                    )}
                    <div className={styles.mediaHover} aria-hidden="true" />
                  </div>
                  <div className={styles.info}>
                    <span className={`${styles.tag} ${item.tipo === "video" ? styles.tagVideo : styles.tagFoto}`}>
                      {item.tipo === "video" ? "Video" : "Foto"}
                    </span>
                    <h3 className={styles.titulo}>{item.titulo || "Sin título"}</h3>
                    {item.fecha && <span className={styles.fecha}>{item.fecha}</span>}
                  </div>
                </motion.button>
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

      {/* ── Lightbox ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
      {abierta && actual && (
        <motion.div
          className={styles.lightbox}
          aria-modal="true"
          role="dialog"
          aria-label="Vista de imagen"
          onClick={cerrar}
          initial={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReduced ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <button className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">
            <FiX size={20} />
          </button>

          {gridItems.length > 1 && (
            <>
              <button className={styles.navIzq} onClick={e => { e.stopPropagation(); anterior() }} aria-label="Anterior">
                <FiChevronLeft size={26} />
              </button>
              <button className={styles.navDer} onClick={e => { e.stopPropagation(); siguiente() }} aria-label="Siguiente">
                <FiChevronRight size={26} />
              </button>
            </>
          )}

          <motion.div
            className={styles.marco}
            onClick={e => e.stopPropagation()}
            initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReduced ? {} : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <div className={styles.viewer}>
              {actual.tipo === "foto" ? (
                <img
                  src={buildUrl(actual.tipo, actual.src)}
                  alt={actual.titulo || "Imagen"}
                  className={styles.full}
                />
              ) : (
                <>
                  <video
                    src={buildUrl(actual.tipo, actual.src)}
                    className={styles.full}
                    controls
                    playsInline
                    onError={(e) => {
                      const el = e.currentTarget;
                      el.style.display = "none";
                      const msg = el.parentElement?.querySelector<HTMLElement>("[data-err]");
                      if (msg) msg.style.display = "block";
                    }}
                  />
                  <p data-err style={{ display: "none", padding: "1rem", textAlign: "center", color: "rgba(255,255,255,0.7)" }}>
                    Video no disponible
                  </p>
                </>
              )}
            </div>

            {(actual.titulo || actual.fecha || actual.etiquetas?.length) && (
              <motion.div
                className={styles.caption}
                initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE, delay: 0.1 }}
              >
                <div className={styles.capLeft}>
                  {actual.titulo && <h4 className={styles.capTitulo}>{actual.titulo}</h4>}
                  {actual.fecha  && <span className={styles.capFecha}>{actual.fecha}</span>}
                </div>
                {actual.etiquetas && actual.etiquetas.length > 0 && (
                  <div className={styles.capTags}>
                    {actual.etiquetas.map(tag => (
                      <span key={tag} className={styles.capTag}>{tag}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>

          {gridItems.length > 1 && (
            <p className={styles.contador} aria-live="polite">
              {indice + 1} / {gridItems.length}
            </p>
          )}
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  )
}
