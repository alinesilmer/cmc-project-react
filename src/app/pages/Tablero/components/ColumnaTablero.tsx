import type { PointerEvent } from "react";
import { Plus } from "lucide-react";

import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";
import type { Estado, Tarjeta } from "../tablero.types";
import s from "../Tablero.module.scss";
import TarjetaItem from "./TarjetaItem";

type Props = {
  estado: Estado;
  rotulo: string;
  tarjetas: Tarjeta[];
  seleccionId: string | null;
  arrastradaId: string | null;
  /** Dónde caería la tarjeta que se arrastra, si cae en esta columna. */
  indiceDestino: number | null;
  onAbrir: (id: string) => void;
  onPuntero: (e: PointerEvent<HTMLElement>, id: string) => void;
  onAgregar: (estado: Estado) => void;
  puedeAgregar: boolean;
};

export default function ColumnaTablero({
  estado,
  rotulo,
  tarjetas,
  seleccionId,
  arrastradaId,
  indiceDestino,
  onAbrir,
  onPuntero,
  onAgregar,
  puedeAgregar,
}: Props) {
  // El lugar se cuenta sin la tarjeta que se mueve.
  const otras = tarjetas.filter((t) => t.id !== arrastradaId);
  const alFinal = indiceDestino !== null && indiceDestino >= otras.length;

  return (
    <section className={`${s.columna} ${s[estado]} ${indiceDestino !== null ? s.sobre : ""}`} data-estado={estado}>
      <header className={s.cabeceraColumna}>
        <h3>{rotulo}</h3>
        <span className={s.cuentaColumna}>{tarjetas.length}</span>
        <BotonPlano
          type="button"
          className={s.masColumna}
          onClick={() => onAgregar(estado)}
          disabled={!puedeAgregar}
          aria-label={`Agregar tarjeta en ${rotulo}`}
          title="Agregar tarjeta"
        >
          <Plus size={16} aria-hidden="true" />
        </BotonPlano>
      </header>

      <div className={`${s.lista} ${alFinal ? s.lineaAbajo : ""}`}>
        {tarjetas.map((t) => (
          <TarjetaItem
            key={t.id}
            tarjeta={t}
            seleccionada={t.id === seleccionId}
            arrastrada={t.id === arrastradaId}
            lineaArriba={indiceDestino !== null && otras[indiceDestino]?.id === t.id}
            onAbrir={() => onAbrir(t.id)}
            onPuntero={(e) => onPuntero(e, t.id)}
          />
        ))}
        {tarjetas.length === 0 && <p className={s.columnaVacia}>Sin tarjetas</p>}
      </div>
    </section>
  );
}
