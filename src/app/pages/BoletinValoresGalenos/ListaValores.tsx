import { moneda } from "@/app/pages/BoletinMedico/boletinMedico.formato";
import type { FilaValor } from "./valoresGalenos";
import s from "./BoletinValoresGalenos.module.scss";

type Props = {
  filas: FilaValor[];
  /** El valor más alto de todo el tipo, no de lo filtrado: la barra de una
   * obra social no cambia de largo porque alguien escribió en el buscador. */
  tope: number;
};

/** Una obra social por renglón: quién, una barra para comparar y cuánto. */
export default function ListaValores({ filas, tope }: Props) {
  return (
    <ul className={s.lista}>
      {filas.map((f) => {
        const distintos = f.minimo !== f.maximo;

        return (
          <li key={f.nro} className={s.fila}>
            <span className={s.nro}>{f.nro}</span>
            <span className={s.nombre}>{f.nombre}</span>
            <span className={s.barra} aria-hidden="true">
              <span style={{ width: `${tope > 0 ? (f.maximo / tope) * 100 : 0}%` }} />
            </span>
            <span className={s.monto}>
              {distintos
                ? `${moneda.format(f.minimo)} a ${moneda.format(f.maximo)}`
                : moneda.format(f.maximo)}
            </span>

            {distintos && (
              <details className={s.niveles}>
                <summary>Ver los {f.niveles.length} niveles</summary>
                <ul>
                  {f.niveles.map((n) => (
                    <li key={n.nivel ?? 0}>
                      <span>Nivel {n.nivel}</span>
                      <strong>{moneda.format(n.valor)}</strong>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
