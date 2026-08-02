import { FileText, Inbox, Paperclip, Trash2 } from "lucide-react";

import { formatFecha, formatMoneda } from "../validaciones.types";
import type { EstadoPrestacion, Prestacion } from "../validaciones.types";
import s from "./Tablas.module.scss";

interface Props {
  prestaciones: Prestacion[];
  cargando: boolean;
  permiteAdjuntarOrden?: boolean;
  onEliminar: (p: Prestacion) => void;
  onAdjuntar?: (p: Prestacion) => void;
}

const ETIQUETA_ESTADO: Record<EstadoPrestacion, string> = {
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  pendiente: "Pendiente",
  cargada: "Cargada",
};

export function EstadoChip({
  estado,
  detalle,
}: {
  estado: EstadoPrestacion;
  detalle?: string;
}) {
  return (
    <span className={`${s.chip} ${s[`chip_${estado}`]}`} title={detalle}>
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export default function PrestacionesTable({
  prestaciones,
  cargando,
  permiteAdjuntarOrden = false,
  onEliminar,
  onAdjuntar,
}: Props) {
  if (cargando)
    return (
      <div className={s.skeletonWrap}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={s.skeletonRow} />
        ))}
      </div>
    );

  if (prestaciones.length === 0)
    return (
      <div className={s.empty}>
        <Inbox size={30} />
        <p>Todavía no cargaste prestaciones en este período.</p>
      </div>
    );

  const totalPeriodo = prestaciones
    .filter((p) => p.estado === "autorizada")
    .reduce((acc, p) => acc + p.total, 0);

  return (
    <>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Código</th>
              <th>Afiliado</th>
              <th>Validación</th>
              <th>Estado</th>
              <th className={s.right}>Honorarios</th>
              <th className={s.right}>Gastos</th>
              <th className={s.right}>Total</th>
              <th className={s.center}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {prestaciones.map((p) => (
              <tr key={p.id}>
                <td>{formatFecha(p.fecha)}</td>
                <td>
                  <span className={s.codigo}>{p.codigo}</span>
                  <span className={s.codigoDesc}>{p.descripcion}</span>
                </td>
                <td>
                  <span className={s.afiliadoNombre}>{p.nombreAfiliado}</span>
                  <span className={s.afiliadoNro}>{p.nroAfiliado}</span>
                </td>
                <td className={s.mono}>{p.nroValidacion ?? "—"}</td>
                <td>
                  <EstadoChip estado={p.estado} detalle={p.estadoDetalle} />
                </td>
                <td className={`${s.right} ${s.mono}`}>{formatMoneda(p.honorarios)}</td>
                <td className={`${s.right} ${s.mono}`}>{formatMoneda(p.gastos)}</td>
                <td className={`${s.right} ${s.mono} ${s.total}`}>
                  {formatMoneda(p.total)}
                </td>
                <td className={s.center}>
                  <div className={s.rowActions}>
                    {permiteAdjuntarOrden && onAdjuntar && (
                      <button
                        type="button"
                        className={`${s.iconBtn} ${p.orden ? s.iconBtnOk : ""}`}
                        title={p.orden ? `Orden: ${p.orden}` : "Adjuntar orden en PDF"}
                        onClick={() => onAdjuntar(p)}
                      >
                        {p.orden ? <FileText size={15} /> : <Paperclip size={15} />}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${s.iconBtn} ${s.iconBtnDanger}`}
                      title="Eliminar prestación"
                      onClick={() => onEliminar(p)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className={s.right}>
                Total autorizado del período
              </td>
              <td className={`${s.right} ${s.mono} ${s.total}`}>
                {formatMoneda(totalPeriodo)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mismas filas, en tarjetas, para pantallas chicas. */}
      <ul className={s.cardList}>
        {prestaciones.map((p) => (
          <li key={p.id} className={s.card}>
            <div className={s.cardTop}>
              <div>
                <span className={s.codigo}>{p.codigo}</span>
                <span className={s.codigoDesc}>{p.descripcion}</span>
              </div>
              <EstadoChip estado={p.estado} detalle={p.estadoDetalle} />
            </div>

            <dl className={s.cardData}>
              <div>
                <dt>Fecha</dt>
                <dd>{formatFecha(p.fecha)}</dd>
              </div>
              <div>
                <dt>Afiliado</dt>
                <dd>
                  {p.nombreAfiliado}
                  <span className={s.afiliadoNro}>{p.nroAfiliado}</span>
                </dd>
              </div>
              <div>
                <dt>Validación</dt>
                <dd className={s.mono}>{p.nroValidacion ?? "—"}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd className={`${s.mono} ${s.total}`}>{formatMoneda(p.total)}</dd>
              </div>
            </dl>

            {p.estado === "rechazada" && (
              <p className={s.cardMotivo}>{p.estadoDetalle}</p>
            )}

            <div className={s.cardActions}>
              {permiteAdjuntarOrden && onAdjuntar && (
                <button
                  type="button"
                  className={s.cardBtn}
                  onClick={() => onAdjuntar(p)}
                >
                  {p.orden ? <FileText size={15} /> : <Paperclip size={15} />}
                  {p.orden ? "Ver orden" : "Adjuntar orden"}
                </button>
              )}
              <button
                type="button"
                className={`${s.cardBtn} ${s.cardBtnDanger}`}
                onClick={() => onEliminar(p)}
              >
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          </li>
        ))}

        <li className={s.cardTotal}>
          <span>Total autorizado del período</span>
          <strong>{formatMoneda(totalPeriodo)}</strong>
        </li>
      </ul>
    </>
  );
}
