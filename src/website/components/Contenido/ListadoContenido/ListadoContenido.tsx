import { useMemo, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import TarjetaPublicacion from "../TarjetaPublicacion/TarjetaPublicacion";
import Buscador from "../../UI/Buscador/Buscador";
import FiltroChips from "../../UI/FiltroChips/FiltroChips";
import Paginacion from "../../UI/Paginacion/Paginacion";
import Button from "../../UI/Button/Button";
import Esqueletos from "../../UI/Esqueletos/Esqueletos";
import { usePaginacion } from "../../../hooks/usePaginacion";
import { coincide } from "../../../lib/texto";
import type { Noticia } from "../../../types";
import type { TextosListado } from "../publicaciones";
import styles from "./ListadoContenido.module.scss";

/** Cuántos ítems por página (3 filas de 3 en escritorio). */
const POR_PAGINA = 9;

type Props = {
  items: Noticia[];
  loading: boolean;
  textos: TextosListado;
  /** Ruta del detalle: cada tarjeta lleva a `${rutaDetalle}/${id}`. */
  rutaDetalle: string;
};

/**
 * Listado público de publicaciones: buscador, filtro por etiqueta, grilla de
 * tarjetas cuadradas y paginación. Lo comparten /noticias y /cursos.
 */
export default function ListadoContenido({ items, loading, textos, rutaDetalle }: Props) {
  const [etiqueta, setEtiqueta] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const listaRef = useRef<HTMLDivElement>(null);

  const etiquetas = useMemo(
    () => Array.from(new Set(items.map((n) => n.badge).filter((b): b is string => Boolean(b)))),
    [items]
  );

  // Busca en título, resumen, autor y etiqueta. El contenido queda afuera a
  // propósito: trae mucho ruido de HTML y devuelve resultados que no se ven.
  const filtradas = useMemo(
    () =>
      items.filter(
        (n) =>
          (!etiqueta || n.badge === etiqueta) &&
          coincide(busqueda, [n.titulo, n.resumen, n.autor, n.badge])
      ),
    [items, busqueda, etiqueta]
  );

  const { pagina, totalPaginas, visibles, irA } = usePaginacion(
    filtradas,
    POR_PAGINA,
    `${busqueda}|${etiqueta}`
  );

  const cambiarPagina = (p: number) => {
    irA(p);
    listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const limpiarFiltros = () => {
    setBusqueda("");
    setEtiqueta(null);
  };

  const hayFiltros = Boolean(busqueda.trim() || etiqueta);

  return (
    <section aria-label={textos.plural}>
      <div>
        {!loading && items.length > 0 && (
          <div className={styles.toolbar}>
            <Buscador
              valor={busqueda}
              onCambio={setBusqueda}
              placeholder={textos.buscarPlaceholder}
              etiqueta={`Buscar ${textos.plural}`}
              className={styles.buscador}
            />
            {etiquetas.length > 0 && (
              <div className={styles.filtrosBloque}>
                {/* Una pista chica: muchos no se dan cuenta de que las chips filtran. */}
                <span className={styles.pista}>
                  <SlidersHorizontal aria-hidden="true" />
                  {etiqueta ? "Tocá de nuevo para quitarlo" : "Filtrá por tema"}
                </span>
                <FiltroChips
                  opciones={etiquetas}
                  activa={etiqueta}
                  onElegir={setEtiqueta}
                  etiqueta="Filtrar por etiqueta"
                  desmarcable
                  tono="amarillo"
                  className={styles.filtros}
                />
              </div>
            )}
          </div>
        )}

        {!loading && hayFiltros && (
          <p className={styles.resultados} role="status">
            {filtradas.length === 0
              ? `No se encontraron ${textos.plural}`
              : `${filtradas.length} ${
                  filtradas.length === 1 ? `${textos.singular} encontrado` : `${textos.plural} encontrados`
                }`}
            {busqueda.trim() && <> para «{busqueda.trim()}»</>}
          </p>
        )}

        <div ref={listaRef}>
          {loading ? (
            <Esqueletos cantidad={6} className={styles.grid} clasePieza={styles.esqueleto} />
          ) : items.length === 0 ? (
            <div className={styles.estado}>
              <p>{textos.vacio}</p>
            </div>
          ) : filtradas.length === 0 ? (
            <div className={styles.estado}>
              <p>{textos.sinResultados}</p>
              <Button variant="default" size="medium" onClick={limpiarFiltros}>
                {textos.verTodos}
              </Button>
            </div>
          ) : (
            <div className={styles.grid}>
              {visibles.map((item) => (
                <TarjetaPublicacion
                  key={item.id}
                  publicacion={item}
                  href={`${rutaDetalle}/${item.id}`}
                />
              ))}
            </div>
          )}
        </div>

        {!loading && (
          <Paginacion
            pagina={pagina}
            totalPaginas={totalPaginas}
            onCambiar={cambiarPagina}
            etiqueta={`Paginación de ${textos.plural}`}
          />
        )}
      </div>
    </section>
  );
}
