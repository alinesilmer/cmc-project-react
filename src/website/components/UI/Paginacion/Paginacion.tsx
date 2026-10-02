import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./Paginacion.module.scss";

type Props = {
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  /** «Paginación de noticias». */
  etiqueta: string;
};

/** Páginas a mostrar, con «…» cuando son muchas: nunca más de siete botones. */
function paginasVisibles(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (actual <= 4) return [1, 2, 3, 4, 5, "…", total];
  if (actual >= total - 3) return [1, "…", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "…", actual - 1, actual, actual + 1, "…", total];
}

/**
 * Paginador del sitio. Lo usan los listados públicos y el administrador de
 * publicaciones, que tenía su propia versión con otra lógica de rango.
 */
export default function Paginacion({ pagina, totalPaginas, onCambiar, etiqueta }: Props) {
  if (totalPaginas <= 1) return null;

  return (
    <nav className={styles.paginacion} aria-label={etiqueta}>
      <button
        type="button"
        className={styles.boton}
        onClick={() => onCambiar(pagina - 1)}
        disabled={pagina === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft aria-hidden="true" />
      </button>

      {paginasVisibles(pagina, totalPaginas).map((p, i) =>
        p === "…" ? (
          <span key={`hueco-${i}`} className={styles.hueco} aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.boton} ${p === pagina ? styles.activa : ""}`}
            onClick={() => onCambiar(p)}
            aria-current={p === pagina ? "page" : undefined}
            aria-label={`Página ${p}`}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        className={styles.boton}
        onClick={() => onCambiar(pagina + 1)}
        disabled={pagina === totalPaginas}
        aria-label="Página siguiente"
      >
        <ChevronRight aria-hidden="true" />
      </button>
    </nav>
  );
}
