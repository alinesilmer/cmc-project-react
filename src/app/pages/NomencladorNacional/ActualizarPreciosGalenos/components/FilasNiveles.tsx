import { ArrowRight } from "lucide-react";

import s from "./TablaGalenos.module.scss";
import type { GalenoResumenOut } from "../../nomenclador.types";
import { formatUnidades, honorarioDe, type Grupo } from "../precios.helpers";
import { formatoPesos } from "@/app/shared/lib/formatos";

type Props = {
  grupo: Grupo;
  info?: GalenoResumenOut;
  /** El valor nuevo ya validado, o `null` si no se está editando. */
  nuevo: number | null;
};

/** Los niveles de un galeno nivelado, en sólo lectura: unidades, valor actual y el honorario que resulta. */
export default function FilasNiveles({ grupo, info, nuevo }: Props) {
  const ajustados = new Map((info?.niveles ?? []).map((x) => [x.nivel, x]));

  return (
    <>
      {grupo.niveles.map((n) => {
        const actual = parseFloat(n.valor_unitario);
        // Unidades efectivas (ajuste de la OS o escala del nomenclador); si el resumen todavía no llegó, las propias del galeno.
        const efectivo = ajustados.get(n.nivel ?? -1);
        const unidadesHon = efectivo ? efectivo.unidades_honorarios : n.unidades_honorarios;
        const unidadesAyu = efectivo ? efectivo.unidades_ayudante : n.unidades_ayudante;
        const uHon = formatUnidades(unidadesHon);
        const uAyu = formatUnidades(unidadesAyu);
        const honActual = honorarioDe(unidadesHon, actual);
        const honNuevo = nuevo != null ? honorarioDe(unidadesHon, nuevo) : null;

        return (
          <tr key={n.id} className={s.nivel}>
            <td>Nivel {n.nivel}</td>
            <td>
              {uHon ?? "—"} un. hon.
              {uAyu != null && ` · ${uAyu} ay.`}
              {efectivo?.ajustado && (
                <span className={s.ajustado} title="Esta obra social pactó unidades distintas a las de la escala del nomenclador">
                  ajustado
                </span>
              )}
            </td>
            <td>{formatoPesos.format(actual)}</td>
            <td>
              {honActual == null ? (
                <span className={s.sinDato}>sin unidades de honorarios</span>
              ) : honNuevo == null ? (
                <span title={`${uHon} × ${formatoPesos.format(actual)}`}>= {formatoPesos.format(honActual)}</span>
              ) : (
                <span className={s.cambio} title={`${uHon} × ${formatoPesos.format(nuevo as number)}`}>
                  <span className={s.previo}>{formatoPesos.format(honActual)}</span>
                  <ArrowRight size={12} aria-hidden="true" />
                  <span className={s.nuevoHon}>{formatoPesos.format(honNuevo)}</span>
                </span>
              )}
            </td>
            <td />
          </tr>
        );
      })}
    </>
  );
}
