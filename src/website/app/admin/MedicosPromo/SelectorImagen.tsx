import { Upload } from "lucide-react";
import SelectorArchivo from "../../../components/UI/SelectorArchivo/SelectorArchivo";
import { useVistaPrevia } from "../../../hooks/useVistaPrevia";
import { IMAGENES } from "../../../lib/subidas";
import styles from "./MedicosPromo.module.scss";

type Props = {
  etiqueta: string;
  textoBoton: string;
  archivo: File | null;
  onArchivo: (archivo: File) => void;
  onError: (mensaje: string | null) => void;
  size?: "small" | "medium";
};

/** Elegir la imagen de un aviso y verla antes de guardar. */
export default function SelectorImagen({ etiqueta, textoBoton, archivo, onArchivo, onError, size = "medium" }: Props) {
  const vista = useVistaPrevia(archivo);

  return (
    <div className={styles.row}>
      <span className={styles.etiqueta}>{etiqueta}</span>
      <div className={styles.fileRow}>
        <SelectorArchivo
          extensiones={IMAGENES}
          variant="outline"
          size={size}
          iconoIzquierda={<Upload />}
          onElegir={([f]) => onArchivo(f)}
          onError={onError}
        >
          {textoBoton}
        </SelectorArchivo>
        {archivo && <span className={styles.filename}>{archivo.name}</span>}
      </div>
      {vista && (
        <div className={styles.preview}>
          <img src={vista} alt="Vista previa del aviso" />
        </div>
      )}
    </div>
  );
}
