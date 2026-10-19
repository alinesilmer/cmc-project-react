import { ExternalLink } from "lucide-react";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import styles from "./valoresEticos.module.scss";
import Button from "@/website/components/UI/Button/Button";

type Props = {
  ruta: string;
  etiqueta: string;
  onError: (mensaje: string) => void;
};

/** Abre un PDF guardado. */
export default function VerPdf({ ruta, etiqueta, onError }: Props) {
  return (
    <Button variant="plano"
      type="button"
      className={styles.eticaViewLink}
      aria-label={`${etiqueta} (PDF)`}
      onClick={() => abrirAdjunto(ruta).catch((e: Error) => onError(e.message))}
    >
      <ExternalLink size={14} aria-hidden="true" />
      {etiqueta}
    </Button>
  );
}
