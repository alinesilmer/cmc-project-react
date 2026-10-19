import { ChevronLeft, ChevronRight } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import s from "./reporte.module.scss";
import SearchField from "@/app/components/ui/SearchField/SearchField";

/** Buscador de la tabla de un reporte. */
export function BuscadorTabla({
  valor,
  onCambio,
  placeholder,
}: {
  valor: string;
  onCambio: (v: string) => void;
  placeholder: string;
}) {
  return (
    <SearchField
      value={valor}
      onChange={(e) => onCambio(e.target.value)}
      onClear={() => onCambio("")}
      placeholder={placeholder}
    />
  );
}

/** Paginado. No se renderiza con una sola página. */
export function PaginadoTabla({
  pagina,
  paginas,
  desde,
  hasta,
  total,
  onPagina,
}: {
  pagina: number;
  paginas: number;
  desde: number;
  hasta: number;
  total: number;
  onPagina: (p: number) => void;
}) {
  if (paginas <= 1) return null;

  return (
    <nav className={s.paginado} aria-label="Paginado de la tabla">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pagina === 1}
        onClick={() => onPagina(pagina - 1)}
        leftIcon={<ChevronLeft size={16} />}
      >
        Anterior
      </Button>

      <span className={s.paginaActual} aria-live="polite">
        {desde}–{hasta} de {total}
      </span>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={pagina === paginas}
        onClick={() => onPagina(pagina + 1)}
        rightIcon={<ChevronRight size={16} />}
      >
        Siguiente
      </Button>
    </nav>
  );
}
