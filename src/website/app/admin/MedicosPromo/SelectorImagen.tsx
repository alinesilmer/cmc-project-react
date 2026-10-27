import { Upload } from "lucide-react";

import s from "./MedicosPromo.module.scss";
import c from "@/app/components/ui/Paso/Campos.module.scss";
import SelectorArchivo from "@/website/components/UI/SelectorArchivo/SelectorArchivo";
import { useVistaPrevia } from "@/website/hooks/useVistaPrevia";
import { IMAGENES } from "@/website/lib/subidas";

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
    <div className={c.campo}>
      <span className={c.rotulo}>{etiqueta}</span>
      <div className={s.fila}>
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
        {archivo && <span className={s.archivo}>{archivo.name}</span>}
      </div>
      {vista && (
        <div className={s.vista}>
          <img src={vista} alt="Vista previa del aviso" />
        </div>
      )}
    </div>
  );
}
