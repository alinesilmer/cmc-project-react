import { ExternalLink } from "lucide-react";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import styles from "./valoresEticos.module.scss";

type Props = {
  ruta: string;
  etiqueta: string;
  onError: (mensaje: string) => void;
};

/**
 * Abre un PDF guardado. Va por `abrirAdjunto` y no por un enlace directo: el
 * archivo está detrás de la API y necesita el token de la sesión.
 */
export default function VerPdf({ ruta, etiqueta, onError }: Props) {
  return (
    <button
      type="button"
      className={styles.eticaViewLink}
      aria-label={`${etiqueta} (PDF)`}
      onClick={() => abrirAdjunto(ruta).catch((e: Error) => onError(e.message))}
    >
      <ExternalLink size={14} aria-hidden="true" />
      {etiqueta}
    </button>
  );
}
