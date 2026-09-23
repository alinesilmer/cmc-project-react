import React, { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

import type { PrestacionRead } from "../types";
import { formatMoney } from "../money";
import { agruparPorObraSocial } from "./agruparPorObraSocial";
import styles from "./TablaPorObraSocial.module.scss";

interface Props {
  prestaciones: PrestacionRead[];
  cargando: boolean;
  /** Sólo la usa "detalle-medico" (Colegio) — "Mi recepción" no tiene permiso
   *  para entrar a la ficha completa de una prestación. */
  onRowClick?: (p: PrestacionRead) => void;
  /** Muestra el Nº de obra social a la izquierda del nombre. Sólo para el personal
   *  del Colegio ("detalle-medico"); el médico no lo ve en "Mi recepción". */
  mostrarCodigoOS?: boolean;
}

const COLUMNAS = 6;

const TablaPorObraSocial: React.FC<Props> = ({ prestaciones, cargando, onRowClick, mostrarCodigoOS }) => {
  // Qué grupos (obra social) están ABIERTOS — por defecto todos colapsados.
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const toggleGrupo = (clave: string) => {
    setAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  if (cargando) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyText}>Cargando detalle…</p>
      </div>
    );
  }

  if (prestaciones.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyTextStrong}>No hay prestaciones para mostrar.</p>
      </div>
    );
  }

  const grupos = agruparPorObraSocial(prestaciones);
  const totalGeneral = grupos.reduce((acc, g) => acc + g.totalImporte, 0);

  return (
    <motion.div
      className={styles.tableWrap}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <table className={styles.table}>
        <colgroup>
          <col className={styles.colCodigo} />
          <col className={styles.colAfiliado} />
          <col className={styles.colCantidad} />
          <col className={styles.colMoney} />
          <col className={styles.colMoney} />
          <col className={styles.colMoney} />
        </colgroup>
        <thead>
          <tr>
            <th>Código</th>
            <th>Afiliado</th>
            <th>Cantidad - Sesión</th>
            <th className={styles.thMoney}>Honorarios</th>
            <th className={styles.thMoney}>Gastos</th>
            <th className={styles.thMoney}>Total</th>
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => {
            const colapsado = !abiertos.has(g.clave);
            return (
            <React.Fragment key={g.clave}>
              <tr className={styles.resumenRow}>
                <td colSpan={COLUMNAS}>
                  <div className={styles.resumenContent}>
                    <button
                      type="button"
                      className={`${styles.toggleBtn} ${colapsado ? styles.toggleBtnColapsado : ""}`}
                      onClick={() => toggleGrupo(g.clave)}
                      aria-expanded={!colapsado}
                      aria-label={colapsado ? `Mostrar detalle de ${g.nombre}` : `Ocultar detalle de ${g.nombre}`}
                    >
                      <ChevronDown size={16} />
                    </button>
                    {mostrarCodigoOS && g.clave !== "sin-os" && (
                      <span className={styles.resumenCodigo}>{g.clave}</span>
                    )}
                    <span className={styles.resumenLabel}>{g.nombre}</span>
                    <span className={styles.resumenMoney}>
                      Honorarios: <strong>{formatMoney(g.totalHonorarios)}</strong>
                    </span>
                    <span className={styles.resumenMoney}>
                      Gastos: <strong>{formatMoney(g.totalGastos)}</strong>
                    </span>
                    <span className={styles.resumenTotalBadge}>
                      Total: {formatMoney(g.totalImporte)}
                    </span>
                  </div>
                </td>
              </tr>
              {!colapsado && g.prestaciones.map((p) => (
                <tr
                  key={p.id}
                  className={[
                    p.estado === "X" ? styles.rowAnulada : "",
                    onRowClick ? styles.rowClickable : "",
                  ].join(" ")}
                  onClick={onRowClick ? () => onRowClick(p) : undefined}
                >
                  <td>
                    <span className={styles.codeCell}>{p.cod_nomenclador ?? "—"}</span>
                    {p.descripcion && <span className={styles.codeDesc}>{p.descripcion}</span>}
                  </td>
                  <td>{p.nombre_paciente || <span className={styles.mutedText}>—</span>}</td>
                  <td>{p.cantidad ?? "—"} - {p.sesion ?? "—"}</td>
                  <td className={styles.tdMoney}>
                    <span className={styles.moneyCell}>{formatMoney(p.honorarios)}</span>
                  </td>
                  <td className={styles.tdMoney}>
                    <span className={styles.moneyCell}>{formatMoney(p.gastos)}</span>
                  </td>
                  <td className={styles.tdMoney}>
                    <span className={styles.subtotalCell}>{formatMoney(p.importe_total)}</span>
                  </td>
                </tr>
              ))}
            </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className={styles.totalGeneralRow}>
            <td colSpan={COLUMNAS - 1} className={styles.totalLabelCell}>Total general</td>
            <td className={styles.tdMoney}>
              <span className={styles.totalGeneralValue}>{formatMoney(totalGeneral)}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </motion.div>
  );
};

export default TablaPorObraSocial;
