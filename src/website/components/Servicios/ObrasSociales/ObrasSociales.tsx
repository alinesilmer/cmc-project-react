import { useEffect, useRef, useState } from "react"
import { FiSearch, FiX } from "react-icons/fi"
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
  pageSize?: number
}

function normalize(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

export default function ObrasSociales({
  titulo = "Convenios con Obras Sociales",
  subtitulo = "Convenios vigentes con el Colegio Médico de Corrientes",
  obras,
  loading = false,
  error = null,
  pageSize = 12,
}: Props) {
  const [isVisible, setIsVisible] = useState(false)
  const [query, setQuery] = useState("")
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const loadMoreRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setIsVisible(true) }, [])

  // Reset pagination when obras or query changes
  useEffect(() => { setVisibleCount(pageSize) }, [obras, pageSize, query])

  const filtered = query
    ? obras.filter((o) => normalize(o.nombre).includes(normalize(query)))
    : obras

  const visibleObras = filtered.slice(0, visibleCount)
  const hasMore = visibleCount < filtered.length
  const remaining = filtered.length - visibleCount

  function handleLoadMore() {
    setVisibleCount((c) => Math.min(c + pageSize, filtered.length))
    setTimeout(() => loadMoreRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80)
  }

  function clearSearch() {
    setQuery("")
    inputRef.current?.focus()
  }

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

      {!loading && !error && obras.length > 0 && (
        <div className={styles.searchWrapper}>
          <label htmlFor="os-search" className={styles.srOnly}>
            Buscar obra social
          </label>
          <div className={styles.searchBox}>
            <FiSearch className={styles.searchIcon} aria-hidden="true" />
            <input
              ref={inputRef}
              id="os-search"
              type="search"
              className={styles.searchInput}
              placeholder="Buscar obra social…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            {query && (
              <button
                className={styles.searchClear}
                onClick={clearSearch}
                aria-label="Limpiar búsqueda"
                type="button"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className={styles.skeletonGrid} aria-busy="true" aria-label="Cargando convenios">
          {Array.from({ length: pageSize }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className={styles.statusMsg} role="alert">{error}</p>
      )}

      {!loading && !error && obras.length === 0 && (
        <p className={styles.statusMsg}>No hay convenios disponibles en este momento.</p>
      )}

      {!loading && !error && obras.length > 0 && (
        <>
          <p className={styles.counter} aria-live="polite">
            {query
              ? filtered.length === 0
                ? "Sin resultados para esa búsqueda"
                : <>
                    <strong>{Math.min(visibleObras.length, filtered.length)}</strong> resultado{filtered.length !== 1 ? "s" : ""} para <em>"{query}"</em>
                  </>
              : <>
                  Mostrando <strong>{visibleObras.length}</strong> de <strong>{obras.length}</strong> obras sociales
                </>
            }
          </p>

          {filtered.length > 0 && (
            <div className={styles.list} role="list">
              {visibleObras.map((o, index) =>
                o.href ? (
                  <a
                    key={o.id}
                    href={o.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="listitem"
                    className={`${styles.item} ${isVisible ? styles.itemVisible : ""}`}
                    style={{ animationDelay: `${(index % pageSize) * 0.04}s` }}
                    aria-label={`Abrir detalles de ${o.nombre}`}
                  >
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.name}>{o.nombre}</span>
                  </a>
                ) : (
                  <div
                    key={o.id}
                    role="listitem"
                    className={`${styles.item} ${isVisible ? styles.itemVisible : ""}`}
                    style={{ animationDelay: `${(index % pageSize) * 0.04}s` }}
                  >
                    <span className={styles.dot} aria-hidden="true" />
                    <span className={styles.name}>{o.nombre}</span>
                  </div>
                )
              )}
            </div>
          )}

          {hasMore && (
            <div className={styles.loadMoreWrapper} ref={loadMoreRef}>
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                aria-label={`Cargar ${Math.min(pageSize, remaining)} obras sociales más`}
              >
                <span>Ver más obras sociales</span>
                <span className={styles.loadMoreBadge}>+{remaining}</span>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
