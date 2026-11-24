import type { PointerEvent } from "react";
import { GripVertical } from "lucide-react";

import { hoyISO, parseFechaLocal } from "@/app/shared/lib/fechas";
import type { Tarjeta } from "../tablero.types";
import s from "../Tablero.module.scss";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** «20 nov», o vacío si la tarjeta no tiene fecha. */
function fechaCorta(iso: string): string {
  const d = parseFechaLocal(iso);
  return d ? `${d.getDate()} ${MESES[d.getMonth()]}` : "";
}

const vencida = (t: Tarjeta) => t.estado !== "hecho" && t.vence !== "" && t.vence < hoyISO();

type VistaProps = { tarjeta: Tarjeta };

/** Lo que se ve de la tarjeta; lo comparten la tarjeta de la columna y la que acompaña al puntero. */
export function VistaTarjeta({ tarjeta }: VistaProps) {
  const fecha = fechaCorta(tarjeta.vence);
  return (
    <>
      <span className={s.asa} data-asa aria-hidden="true">
        <GripVertical size={14} />
      </span>
      <i className={`${s.punto} ${s[tarjeta.prioridad]}`} title={`Prioridad ${tarjeta.prioridad}`} />
      <div className={s.textoTarjeta}>
        <h4>{tarjeta.titulo}</h4>
        <small>
          {tarjeta.asignadoNombre || "Sin asignar"}
          {fecha && <span className={vencida(tarjeta) ? s.vencida : undefined}> · {fecha}</span>}
        </small>
      </div>
    </>
  );
}

type Props = {
  tarjeta: Tarjeta;
  seleccionada: boolean;
  arrastrada: boolean;
  lineaArriba: boolean;
  onAbrir: () => void;
  onPuntero: (e: PointerEvent<HTMLElement>) => void;
};

export default function TarjetaItem({ tarjeta, seleccionada, arrastrada, lineaArriba, onAbrir, onPuntero }: Props) {
  const clases = [s.tarjeta, seleccionada ? s.seleccionada : "", arrastrada ? s.arrastrada : "", lineaArriba ? s.lineaArriba : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div
      className={clases}
      data-tarjeta={tarjeta.id}
      role="button"
      tabIndex={0}
      aria-label={`Abrir «${tarjeta.titulo}»`}
      onPointerDown={onPuntero}
      onClick={onAbrir}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAbrir();
        }
      }}
    >
      <VistaTarjeta tarjeta={tarjeta} />
    </div>
  );
}
