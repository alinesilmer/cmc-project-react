import type { ReactNode } from "react";

import s from "./Segmentos.module.scss";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Opcion<V extends string> = { valor: V; rotulo: ReactNode };

type Props<V extends string> = {
  opciones: Opcion<V>[];
  valor: V;
  onChange: (valor: V) => void;
  ariaLabel: string;
};

/** Selector de una opción entre pocas, como píldoras dentro de una pista. */
export default function Segmentos<V extends string>({ opciones, valor, onChange, ariaLabel }: Props<V>) {
  return (
    <div className={s.pista} role="group" aria-label={ariaLabel}>
      {opciones.map((o) => (
        <BotonPlano
          key={o.valor}
          type="button"
          aria-pressed={o.valor === valor}
          className={`${s.opcion} ${o.valor === valor ? s.activa : ""}`}
          onClick={() => onChange(o.valor)}
        >
          {o.rotulo}
        </BotonPlano>
      ))}
    </div>
  );
}
