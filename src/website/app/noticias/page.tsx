import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft as FiChevronLeft,
  ChevronRight as FiChevronRight,
  Filter as FiFilter,
  Search as FiSearch,
  X as FiX,
} from "lucide-react";
import NoticiaCard from "../../components/Noticias/NoticiaCard/NoticiaCard";
import PageHero from "../../components/UI/Hero/Hero";
import { listNews } from "../../lib/news.client";

import type { Noticia } from "../../types";
import styles from "./noticias.module.scss";

/** Cuántas noticias por página (3 filas de 3 en escritorio). */
const POR_PAGINA = 9;

/**
 * Normaliza para buscar: sin acentos y en minúsculas, así "cardiologia"
 * encuentra "Cardiología" y viceversa.
 */
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    // \p{Diacritic} = las marcas de acento que NFD dejó sueltas.
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Páginas a mostrar, con "…" cuando son muchas. */
function paginasVisibles(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (actual >= total - 3)
    return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", actual - 1, actual, actual + 1, "…", total];
}

export default function NoticiasPage() {
  const [noticias, setNoticias] = useState<Noticia[]>([]);
  const [loading, setLoading] = useState(true);
  const [badgeFiltro, setBadgeFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const listaRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Noticias | Colegio Médico de Corrientes";
    return () => {
      document.title = "Colegio Médico de Corrientes";
    };
  }, []);

  useEffect(() => {
    cargarNoticias();
  }, []);

  const cargarNoticias = async () => {
    try {
      setLoading(true);
      const data = await listNews({ tipo: "Noticia" });
      const normalized = data.map((n: any) => ({
        ...n,
        fechaCreacion: n.fecha_creacion ?? n.fechaCreacion ?? null,
        fechaActualizacion:
          n.fecha_actualizacion ?? n.fechaActualizacion ?? null,
      }));
      setNoticias(normalized);
    } catch (error) {
      console.error("Error al cargar noticias:", error);
    } finally {
      setLoading(false);
    }
  };

  const badges = useMemo(
    () =>
      Array.from(
        new Set(noticias.map((n) => n.badge).filter(Boolean))
      ) as string[],
    [noticias]
  );

  // Busca en título, resumen, autor y badge. El contenido queda afuera a
  // propósito: trae mucho ruido de HTML y devuelve resultados que no se ven.
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return noticias.filter((n) => {
      if (badgeFiltro && n.badge !== badgeFiltro) return false;
      if (!q) return true;
      const heno = normalizar(
        [n.titulo, n.resumen, n.autor, n.badge].filter(Boolean).join(" ")
      );
      // Todas las palabras tienen que aparecer, en cualquier orden.
      return q.split(/\s+/).every((palabra) => heno.includes(palabra));
    });
  }, [noticias, busqueda, badgeFiltro]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));

  // Si cambia el filtro o la búsqueda, volvemos a la primera página: si no,
  // se puede quedar en una página que ya no existe.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, badgeFiltro]);

  const visibles = useMemo(
    () => filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA),
    [filtradas, pagina]
  );

  const irAPagina = (p: number) => {
    setPagina(Math.min(Math.max(1, p), totalPaginas));
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const hayFiltros = Boolean(busqueda.trim() || badgeFiltro);

  return (
    <div>
      <PageHero
        title="NOTICIAS"
        subtitle="Descubre las últimas novedades en el Colegio Médico de Corrientes"
        backgroundImage="https://res.cloudinary.com/dcfkgepmp/image/upload/q_auto/f_auto/v1775665371/heroImg_fus7an.png"
      />
      <main className={styles.noticiasPage}>
        <div className={styles.container}>
          {!loading && noticias.length > 0 && (
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <FiSearch className={styles.searchIcon} />
                <input
                  type="search"
                  className={styles.searchInput}
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar noticias por título, autor o tema…"
                  aria-label="Buscar noticias"
                />
                {busqueda && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => setBusqueda("")}
                    aria-label="Limpiar búsqueda"
                  >
                    <FiX />
                  </button>
                )}
              </div>

              {badges.length > 0 && (
                <div className={styles.filterRow}>
                  <span className={styles.filterLabel}>
                    <FiFilter />
                    Filtrar:
                  </span>
                  {badges.map((b) => (
                    <button
                      key={b}
                      type="button"
                      className={`${styles.filterBtn} ${
                        badgeFiltro === b ? styles.filterBtnActive : ""
                      }`}
                      onClick={() =>
                        setBadgeFiltro((prev) => (prev === b ? null : b))
                      }
                      aria-pressed={badgeFiltro === b}
                    >
                      {b}
                      {badgeFiltro === b && (
                        <FiX className={styles.filterBtnIcon} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && hayFiltros && (
            <p className={styles.resultados} role="status">
              {filtradas.length === 0
                ? "No se encontraron noticias"
                : `${filtradas.length} ${
                    filtradas.length === 1
                      ? "noticia encontrada"
                      : "noticias encontradas"
                  }`}
              {busqueda.trim() && <> para «{busqueda.trim()}»</>}
            </p>
          )}

          <div ref={listaRef}>
            {loading ? (
              <div className={styles.loading}>Cargando noticias...</div>
            ) : noticias.length === 0 ? (
              <div className={styles.empty}>
                <p>No hay noticias disponibles en este momento.</p>
              </div>
            ) : filtradas.length === 0 ? (
              <div className={styles.empty}>
                <p>Ninguna noticia coincide con tu búsqueda.</p>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={() => {
                    setBusqueda("");
                    setBadgeFiltro(null);
                  }}
                >
                  Ver todas las noticias
                </button>
              </div>
            ) : (
              <div className={styles.grid}>
                {visibles.map((noticia) => (
                  <NoticiaCard
                    key={noticia.id}
                    noticia={noticia}
                    variant="square"
                    onClick={() => navigate(`/noticias/${noticia.id}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {!loading && totalPaginas > 1 && (
            <nav className={styles.paginacion} aria-label="Paginación de noticias">
              <button
                type="button"
                className={styles.pageArrow}
                onClick={() => irAPagina(pagina - 1)}
                disabled={pagina === 1}
                aria-label="Página anterior"
              >
                <FiChevronLeft />
              </button>

              {paginasVisibles(pagina, totalPaginas).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className={styles.pageGap}>
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    className={`${styles.pageBtn} ${
                      p === pagina ? styles.pageBtnActive : ""
                    }`}
                    onClick={() => irAPagina(p)}
                    aria-current={p === pagina ? "page" : undefined}
                    aria-label={`Página ${p}`}
                  >
                    {p}
                  </button>
                )
              )}

              <button
                type="button"
                className={styles.pageArrow}
                onClick={() => irAPagina(pagina + 1)}
                disabled={pagina === totalPaginas}
                aria-label="Página siguiente"
              >
                <FiChevronRight />
              </button>
            </nav>
          )}
        </div>
      </main>
    </div>
  );
}
