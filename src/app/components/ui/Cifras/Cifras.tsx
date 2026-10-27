import type { ReactNode } from "react";

import s from "./Cifras.module.scss";

export type CifraItem = {
  valor: ReactNode;
  rotulo: string;
  /** `apagada` para lo que no se toca, `error` para lo que falló. */
  tono?: "apagada" | "error";
};

/** Los totales de una vista previa o un resultado: cifras grandes con su rótulo debajo. */
export default function Cifras({ items }: { items: CifraItem[] }) {
  return (
    <dl className={s.cifras}>
      {items.map((c) => (
        <div key={c.rotulo} className={`${s.cifra} ${c.tono ? s[c.tono] : ""}`}>
          <dt className={s.rotulo}>{c.rotulo}</dt>
          <dd className={s.numero}>{c.valor}</dd>
        </div>
      ))}
    </dl>
  );
}
