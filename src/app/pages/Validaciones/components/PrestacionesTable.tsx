import { FileText, Inbox, Paperclip, Trash2 } from "lucide-react";

import { esPendienteDeObraSocial, formatFecha, formatMoneda } from "../validaciones.types";
import type { EstadoPrestacion, Prestacion } from "../validaciones.types";
import s from "./Tablas.module.scss";
import Tabla from "@/app/components/ui/Tabla/Tabla";

interface Props {
  prestaciones: Prestacion[];
  cargando: boolean;
  /** Obra social donde el médico puede adjuntar la orden aunque no sea obligatoria. */
  permiteAdjuntarOrden?: boolean;
  onEliminar: (p: Prestacion) => void;
  /** Abre la gestión de documentos de la prestación (ver, agregar, reemplazar, eliminar). */
  onDocumentos?: (p: Prestacion) => void;
  /** Período cerrado: no se puede eliminar ni modificar la documentación, sólo verla. */
  soloLectura?: boolean;
}

/** Hay algo que mostrar de la documentación: la exige, ya tiene archivos, o la obra social deja adjuntar la orden. */
function conDocumentos(p: Prestacion, permiteAdjuntarOrden: boolean): boolean {
  return p.documentacion !== "no_aplica" || p.documentos.length > 0 || permiteAdjuntarOrden;
}

function textoDocumentos(p: Prestacion): string {
  if (p.documentacion === "falta") return "Falta documentación";
  return p.documentos.length > 0 ? `Documentos (${p.documentos.length})` : "Adjuntar";
}

const ETIQUETA_ESTADO: Record<EstadoPrestacion, string> = {
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  pendiente: "Pendiente",
  cargada: "Cargada",
};

function EstadoChip({
  estado,
  detalle,
}: {
  estado: EstadoPrestacion;
  detalle?: string;
}) {
  // Nobis grada el `P-Pendiente` como `rechazada` en la base (importe 0, fuera de factura — ver `validaciones.types.ts::esPendienteDeObraSocial`), pero mostrarlo como un rechazo liso confunde.
  // dato: el resto del panel sigue filtrando por `estado === "rechazada"`.
  const pendienteDeGestion = estado === "rechazada" && esPendienteDeObraSocial(detalle);
  const claseEstado = pendienteDeGestion ? "pendiente" : estado;

  return (
    <span className={`${s.chip} ${s[`chip_${claseEstado}`]}`} title={detalle}>
      {pendienteDeGestion ? "Pendiente" : ETIQUETA_ESTADO[estado]}
    </span>
  );
}

export default function PrestacionesTable({
  prestaciones,
  cargando,
  permiteAdjuntarOrden = false,
  onEliminar,
  onDocumentos,
  soloLectura = false,
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
    // `cargada` también factura: es el estado de Boreal y Omint, que con el filtro sólo por `autorizada` mostraban siempre $ 0.
    .filter((p) => p.estado === "autorizada" || p.estado === "cargada")
    .reduce((acc, p) => acc + p.total, 0);

  return (
    <>
      <div className={s.tableWrap}>
        <Tabla className={s.table}>
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
                {/* Sólo el nombre: el número de afiliado no queda a la vista una vez cargada la prestación. */}
                <td>
                  <span className={s.afiliadoNombre}>{p.nombreAfiliado}</span>
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
                    {onDocumentos && conDocumentos(p, permiteAdjuntarOrden) && (!soloLectura || p.documentos.length > 0) && (
                      <button
                        type="button"
                        className={`${s.docBtn} ${p.documentacion === "falta" ? s.docBtnFalta : p.documentos.length ? s.docBtnOk : ""}`}
                        title="Documentación de la prestación"
                        onClick={() => onDocumentos(p)}
                      >
                        {p.documentos.length ? <FileText size={15} /> : <Paperclip size={15} />}
                        {textoDocumentos(p)}
                      </button>
                    )}
                    {!soloLectura && (
                      <button
                        type="button"
                        className={`${s.iconBtn} ${s.iconBtnDanger}`}
                        title="Eliminar prestación"
                        onClick={() => onEliminar(p)}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
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
        </Tabla>
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
              {onDocumentos && conDocumentos(p, permiteAdjuntarOrden) && (!soloLectura || p.documentos.length > 0) && (
                <button
                  type="button"
                  className={`${s.cardBtn} ${p.documentacion === "falta" ? s.docBtnFalta : ""}`}
                  onClick={() => onDocumentos(p)}
                >
                  {p.documentos.length ? <FileText size={15} /> : <Paperclip size={15} />}
                  {textoDocumentos(p)}
                </button>
              )}
              {!soloLectura && (
                <button
                  type="button"
                  className={`${s.cardBtn} ${s.cardBtnDanger}`}
                  onClick={() => onEliminar(p)}
                >
                  <Trash2 size={15} /> Eliminar
                </button>
              )}
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
