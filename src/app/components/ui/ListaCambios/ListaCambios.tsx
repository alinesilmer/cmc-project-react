import type { ReactNode } from "react";
import { AlertCircle, MinusCircle, PlusCircle } from "lucide-react";

import s from "./ListaCambios.module.scss";

type Fila = {
  clave: string | number;
  /** `nuevo` se crea, `igual` ya existía y no se toca, `error` no se puede crear. */
  tono: "nuevo" | "igual" | "error";
  titulo: ReactNode;
  detalle?: ReactNode;
};

const ICONO = { nuevo: PlusCircle, igual: MinusCircle, error: AlertCircle };

/** Lista de lo que un cambio masivo crea, deja igual o no puede hacer, una fila por elemento. */
export default function ListaCambios({ filas }: { filas: Fila[] }) {
  return (
    <ul className={s.lista}>
      {filas.map((f) => {
        const Icono = ICONO[f.tono];
        return (
          <li key={f.clave} className={`${s.fila} ${s[f.tono]}`}>
            <Icono size={16} aria-hidden="true" />
            <span className={s.titulo}>{f.titulo}</span>
            {f.detalle && <span className={s.detalle}>{f.detalle}</span>}
          </li>
        );
      })}
    </ul>
  );
}
