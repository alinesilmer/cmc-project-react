import { X } from "lucide-react";

import s from "./Fichas.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Props = {
  items: { clave: string; texto: string }[];
  /** Con esto cada ficha lleva su cruz para quitarla. */
  onQuitar?: (clave: string) => void;
  /** Con esto aparece «Limpiar» al final. */
  onLimpiar?: () => void;
};

/** Fichas con una etiqueta corta: lo elegido (con cruz) o lo que incluye algo (sin ella). */
export default function Fichas({ items, onQuitar, onLimpiar }: Props) {
  return (
    <ul className={s.fichas}>
      {items.map((f) => (
        <li key={f.clave} className={s.ficha}>
          {f.texto}
          {onQuitar && (
            <BotonPlano type="button" className={s.quitar} onClick={() => onQuitar(f.clave)} aria-label={`Quitar ${f.texto}`}>
              <X size={12} aria-hidden="true" />
            </BotonPlano>
          )}
        </li>
      ))}
      {onLimpiar && (
        <li>
          <BotonPlano type="button" className={s.limpiar} onClick={onLimpiar}>
            Limpiar
          </BotonPlano>
        </li>
      )}
    </ul>
  );
}
