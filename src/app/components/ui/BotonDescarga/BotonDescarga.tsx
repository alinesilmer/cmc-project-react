import type { MouseEvent, ReactNode } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";

type Formato = "pdf" | "excel" | "csv";

interface Props {
  formato: Formato;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  /** Mientras se arma el archivo: bloquea el botón y dice «Generando…». */
  cargando?: boolean;
  /** Otro rótulo en lugar de «PDF» / «Excel» / «CSV» («PDF por especialidad»). */
  children?: ReactNode;
}

// El aspecto nació en Padrones: PDF en rojo, Excel en verde, los dos de contorno.
const FORMATOS = {
  pdf: { rotulo: "PDF", variante: "danger", Icono: FileText },
  excel: { rotulo: "Excel", variante: "success", Icono: FileSpreadsheet },
  csv: { rotulo: "CSV", variante: "ghost", Icono: Download },
} as const;

/** EL botón de descarga del panel. */
export default function BotonDescarga({ formato, onClick, disabled = false, cargando = false, children }: Props) {
  const { rotulo, variante, Icono } = FORMATOS[formato];
  return (
    <Button
      type="button"
      size="md"
      variant={variante}
      leftIcon={<Icono size={18} aria-hidden="true" />}
      onClick={onClick}
      disabled={disabled || cargando}
    >
      {cargando ? "Generando…" : (children ?? rotulo)}
    </Button>
  );
}
