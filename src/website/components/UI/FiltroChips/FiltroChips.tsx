import { X } from "lucide-react";
import styles from "./FiltroChips.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Props = {
  opciones: string[];
  /** `null` = ninguna elegida. */
  activa: string | null;
  onElegir: (opcion: string | null) => void;
  etiqueta: string;
  /** Con `true`, tocar la chip activa la desmarca (filtro opcional). */
  desmarcable?: boolean;
  /** Azul para filtros de categoría, amarillo para etiquetas de publicaciones. */
  tono?: "azul" | "amarillo";
  className?: string;
};

/** Filtro por chips: categorías de beneficios, etiquetas de noticias. */
export default function FiltroChips({
  opciones,
  activa,
  onElegir,
  etiqueta,
  desmarcable = false,
  tono = "azul",
  className,
}: Props) {
  return (
    <div className={`${styles.fila} ${className ?? ""}`} role="group" aria-label={etiqueta}>
      {opciones.map((o) => {
        const elegida = o === activa;
        return (
          <Button variant="plano"
            key={o}
            type="button"
            className={`${styles.chip} ${styles[tono]} ${elegida ? styles.activa : ""}`}
            aria-pressed={elegida}
            onClick={() => onElegir(elegida && desmarcable ? null : o)}
          >
            {o}
            {elegida && desmarcable && <X className={styles.cruz} aria-hidden="true" />}
          </Button>
        );
      })}
    </div>
  );
}
