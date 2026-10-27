import { ExternalLink } from "lucide-react";

import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import Button from "@/app/components/ui/Button/Button";
import { abrirAdjunto } from "@/app/shared/lib/archivos";

type Props = {
  ruta: string;
  etiqueta: string;
  onError: (mensaje: string) => void;
  /** En una fila de tabla: sólo el ojo. */
  compacto?: boolean;
};

/** Abre un PDF guardado. */
export default function VerPdf({ ruta, etiqueta, onError, compacto = false }: Props) {
  const abrir = () => abrirAdjunto(ruta).catch((e: Error) => onError(e.message));

  if (compacto) return <BotonVer etiqueta={`${etiqueta} (PDF)`} onClick={abrir} />;
  return (
    <Button variant="ghost" leftIcon={<ExternalLink size={16} aria-hidden="true" />} onClick={abrir} aria-label={`${etiqueta} (PDF)`}>
      {etiqueta}
    </Button>
  );
}
