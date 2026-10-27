
import SearchField from "@/app/components/ui/SearchField/SearchField";
import Paginador from "@/app/components/ui/Paginador/Paginador";

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
    <Paginador
      pagina={pagina}
      totalPaginas={paginas}
      onCambiar={onPagina}
      estado={`${desde}–${hasta} de ${total}`}
      etiqueta="Paginado de la tabla"
    />
  );
}
