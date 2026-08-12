import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft as FiChevronLeft,
  ChevronRight as FiChevronRight,
  Filter as FiFilter,
  Search as FiSearch,
  X as FiX,
} from "lucide-react";

import NoticiaCard from "../../Noticias/NoticiaCard/NoticiaCard";
import type { Noticia } from "../../../types";
import styles from "./ListadoContenido.module.scss";

/** Cuántos ítems por página (3 filas de 3 en escritorio). */
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

/** Los textos que cambian entre noticias y cursos. Todo lo demás es idéntico. */
export type ListadoTextos = {
  /** "noticia" / "curso" — para "3 noticias encontradas". */
  singular: string;
  plural: string;
  buscarPlaceholder: string;
  cargando: string;
  /** No hay nada publicado todavía. */
  vacio: string;
  /** Hay contenido pero ningún resultado para el filtro. */
  sinResultados: string;
  verTodos: string;
};

type Props = {
  items: Noticia[];
  loading: boolean;
  textos: ListadoTextos;
  onSelect: (id: Noticia["id"]) => void;
};

/**
 * Listado público de publicaciones: buscador, filtro por badge, grilla de
 * tarjetas cuadradas y paginación. Lo comparten /noticias y /cursos, que sólo
 * difieren en de dónde salen los datos, a dónde navegan y los textos — tenerlo
 * acá evita que las dos pantallas se separen visualmente con el tiempo.
 */
export default function ListadoContenido({
  items,
  loading,
  textos,
  onSelect,
}: Props) {
  const [badgeFiltro, setBadgeFiltro] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const listaRef = useRef<HTMLDivElement>(null);

  const badges = useMemo(
    () =>
      Array.from(new Set(items.map((n) => n.badge).filter(Boolean))) as string[],
    [items]
  );

  // Busca en título, resumen, autor y badge. El contenido queda afuera a
  // propósito: trae mucho ruido de HTML y devuelve resultados que no se ven.
  const filtradas = useMemo(() => {
    const q = normalizar(busqueda.trim());
    return items.filter((n) => {
      if (badgeFiltro && n.badge !== badgeFiltro) return false;
      if (!q) return true;
      const heno = normalizar(
        [n.titulo, n.resumen, n.autor, n.badge].filter(Boolean).join(" ")
      );
      // Todas las palabras tienen que aparecer, en cualquier orden.
      return q.split(/\s+/).every((palabra) => heno.includes(palabra));
    });
  }, [items, busqueda, badgeFiltro]);

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
    <main className={styles.listadoPage}>
      <div className={styles.container}>
        {!loading && items.length > 0 && (
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="search"
                className={styles.searchInput}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder={textos.buscarPlaceholder}
                aria-label={`Buscar ${textos.plural}`}
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
              ? `No se encontraron ${textos.plural}`
              : `${filtradas.length} ${
                  filtradas.length === 1
                    ? `${textos.singular} encontrado`
                    : `${textos.plural} encontrados`
                }`}
            {busqueda.trim() && <> para «{busqueda.trim()}»</>}
          </p>
        )}

        <div ref={listaRef}>
          {loading ? (
            <div className={styles.loading}>{textos.cargando}</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <p>{textos.vacio}</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className={styles.empty}>
              <p>{textos.sinResultados}</p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => {
                  setBusqueda("");
                  setBadgeFiltro(null);
                }}
              >
                {textos.verTodos}
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {visibles.map((item) => (
                <NoticiaCard
                  key={item.id}
                  noticia={item}
                  variant="square"
                  onClick={() => onSelect(item.id)}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && totalPaginas > 1 && (
          <nav
            className={styles.paginacion}
            aria-label={`Paginación de ${textos.plural}`}
          >
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
  );
}
