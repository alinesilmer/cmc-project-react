import Tabla from "@/app/components/ui/Tabla/Tabla";
import { moneda } from "@/app/pages/BoletinMedico/boletinMedico.formato";
import type { FilaValor } from "./valoresGalenos";
import s from "./BoletinValoresGalenos.module.scss";

type Props = {
  filas: FilaValor[];
  /** El valor más alto de todo el tipo, no de lo filtrado. */
  tope: number;
};

/** Una obra social por fila: quién, una barra para comparar y cuánto. */
export default function ListaValores({ filas, tope }: Props) {
  return (
    <div className={s.lista}>
      <Tabla>
        <thead>
          <tr>
            <th className={s.colNro}>N°</th>
            <th>Obra social</th>
            <th className={s.colBarra} aria-hidden="true" />
            <th className={s.colMonto}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const distintos = f.minimo !== f.maximo;

            return (
              <tr key={f.nro}>
                <td className={s.nro}>{f.nro}</td>
                <td>
                  <span className={s.nombre}>{f.nombre}</span>
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
                </td>
                <td className={s.colBarra} aria-hidden="true">
                  <span className={s.barra}>
                    <span style={{ width: `${tope > 0 ? (f.maximo / tope) * 100 : 0}%` }} />
                  </span>
                </td>
                <td className={s.monto}>
                  {distintos
                    ? `${moneda.format(f.minimo)} a ${moneda.format(f.maximo)}`
                    : moneda.format(f.maximo)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Tabla>
    </div>
  );
}
