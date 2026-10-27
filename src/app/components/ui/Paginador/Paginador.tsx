import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import s from "./Paginador.module.scss";

interface Props {
  /** Página actual, desde 1. */
  pagina: number;
  /** Si se conoce, el botón «Siguiente» se apaga en la última. Con una sola página no se dibujan los botones. */
  totalPaginas?: number;
  /** Cuando no se conoce el total: si hay más páginas después de esta. */
  hayMas?: boolean;
  onCambiar: (pagina: number) => void;
  /** Mientras carga: apaga los dos botones. */
  ocupado?: boolean;
  /** Reemplaza el «Página X de Y» del medio («1–25 de 120»). */
  estado?: ReactNode;
  /** A la izquierda del paginador («120 socios»). */
  resumen?: ReactNode;
  /** Con el total conocido, muestra también los números de página. */
  numerado?: boolean;
  /** Suma un «««» para volver de un salto a la primera página, en las listas largas sin total. */
  conPrimera?: boolean;
  etiqueta?: string;
}

/** Los números a mostrar: la primera, la última y dos a cada lado de la actual; `null` es un hueco. */
function ventana(pagina: number, total: number): (number | null)[] {
  const visibles = Array.from({ length: total }, (_, i) => i + 1).filter(
    (n) => n === 1 || n === total || (n >= pagina - 2 && n <= pagina + 2)
  );
  return visibles.reduce<(number | null)[]>((acc, n, i) => {
    if (i > 0 && n - (visibles[i - 1] as number) > 1) acc.push(null);
    acc.push(n);
    return acc;
  }, []);
}

/** EL paginador del panel: anterior, dónde estoy y siguiente. */
export default function Paginador({
  pagina,
  totalPaginas,
  hayMas,
  onCambiar,
  ocupado = false,
  estado,
  resumen,
  numerado = false,
  conPrimera = false,
  etiqueta = "Paginación",
}: Props) {
  const sinPaginas = totalPaginas !== undefined && totalPaginas <= 1;
  const ultima = totalPaginas !== undefined ? pagina >= totalPaginas : !hayMas;

  return (
    <nav className={s.paginador} aria-label={etiqueta}>
      {resumen && <span className={s.resumen}>{resumen}</span>}

      {!sinPaginas && (
        <div className={s.controles}>
          {conPrimera && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pagina <= 1 || ocupado}
              onClick={() => onCambiar(1)}
              aria-label="Primera página"
            >
              ««
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pagina <= 1 || ocupado}
            onClick={() => onCambiar(pagina - 1)}
            leftIcon={<ChevronLeft size={16} aria-hidden="true" />}
          >
            Anterior
          </Button>

          {numerado && totalPaginas ? (
            <div className={s.numeros}>
              {ventana(pagina, totalPaginas).map((n, i) =>
                n === null ? (
                  <span key={`hueco-${i}`} className={s.hueco}>
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    className={`${s.numero} ${n === pagina ? s.numeroActivo : ""}`}
                    onClick={() => onCambiar(n)}
                    disabled={ocupado}
                    aria-current={n === pagina ? "page" : undefined}
                  >
                    {n}
                  </button>
                )
              )}
            </div>
          ) : (
            <span className={s.estado} aria-live="polite">
              {estado ?? (totalPaginas ? `Página ${pagina} de ${totalPaginas}` : `Página ${pagina}`)}
            </span>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={ultima || ocupado}
            onClick={() => onCambiar(pagina + 1)}
            rightIcon={<ChevronRight size={16} aria-hidden="true" />}
          >
            Siguiente
          </Button>
        </div>
      )}
    </nav>
  );
}
