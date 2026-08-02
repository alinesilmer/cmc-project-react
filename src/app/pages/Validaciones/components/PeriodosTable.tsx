import { CalendarRange, FileDown } from "lucide-react";

import { formatMoneda, nombreMes } from "../validaciones.types";
import type { Periodo } from "../validaciones.types";
import s from "./Tablas.module.scss";

interface Props {
  periodos: Periodo[];
  cargando: boolean;
  onVerComprobante: (p: Periodo) => void;
}

export default function PeriodosTable({ periodos, cargando, onVerComprobante }: Props) {
  if (cargando)
    return (
      <div className={s.skeletonWrap}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={s.skeletonRow} />
        ))}
      </div>
    );

  if (periodos.length === 0)
    return (
      <div className={s.empty}>
        <CalendarRange size={30} />
        <p>Todavía no hay períodos con prestaciones cargadas.</p>
      </div>
    );

  return (
    <>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Período</th>
              <th className={s.center}>Prestaciones</th>
              <th className={s.right}>Total facturado</th>
              <th className={s.center}>Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {periodos.map((p) => (
              <tr key={`${p.anio}-${p.mes}`}>
                <td className={s.periodoNombre}>
                  {nombreMes(p.mes)} {p.anio}
                </td>
                <td className={s.center}>{p.cantidad}</td>
                <td className={`${s.right} ${s.mono} ${s.total}`}>
                  {formatMoneda(p.total)}
                </td>
                <td className={s.center}>
                  <button
                    type="button"
                    className={s.pdfBtn}
                    onClick={() => onVerComprobante(p)}
                  >
                    <FileDown size={15} /> Ver PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className={s.cardList}>
        {periodos.map((p) => (
          <li key={`${p.anio}-${p.mes}`} className={s.card}>
            <div className={s.cardTop}>
              <strong className={s.periodoNombre}>
                {nombreMes(p.mes)} {p.anio}
              </strong>
              <span className={`${s.mono} ${s.total}`}>{formatMoneda(p.total)}</span>
            </div>
            <p className={s.cardSub}>{p.cantidad} prestaciones autorizadas</p>
            <div className={s.cardActions}>
              <button
                type="button"
                className={s.cardBtn}
                onClick={() => onVerComprobante(p)}
              >
                <FileDown size={15} /> Ver comprobante
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
