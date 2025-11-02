"use client";

import { ThumbsUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./IoscorAffilliateTable.module.scss";

export type PracticeRow = {
  id: string;
  dni: string;
  isIoscor: boolean;
  obraSocCode: string;
  obraSocName: string;
  codigo: string;
  cantidad: number;
  fecha: string;
  orderMode: "Auto" | "Manual";
  orderNumber?: string;
  percHonorario?: number;
  percGasto?: number;
  percAyudante?: number;
};

type Props = {
  rows: PracticeRow[];
  onEdit?: (row: PracticeRow) => void;
  onDelete?: (id: string) => void;
};

function Row({
  r,
  i,
  onEdit,
  onDelete,
}: {
  r: PracticeRow;
  i: number;
  onEdit?: Props["onEdit"];
  onDelete?: Props["onDelete"];
}) {
  const orden =
    r.orderMode === "Manual" && r.orderNumber ? r.orderNumber : r.orderMode;

  return (
    <motion.tr
      className={`${styles.tr} ${r.isIoscor ? styles.trOk : ""}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15, delay: i * 0.02 }}
    >
      <td className={styles.tdOrden}>{orden}</td>
      <td className={styles.tdDni}>
        <div className={styles.dniWrap}>
          <span className={styles.dni}>{r.dni}</span>
          {r.isIoscor && (
            <span className={styles.okIcon} title="Afiliado IOSCOR">
              <ThumbsUp size={14} />
            </span>
          )}
        </div>
      </td>
      <td className={styles.tdObra}>
        <div className={styles.obraWrap}>
          <span className={styles.obraCode}>{r.obraSocCode}</span>
          <span className={styles.obraName}>{r.obraSocName}</span>
        </div>
      </td>
      <td className={styles.tdCodigo}>{r.codigo}</td>
      <td className={styles.tdCant}>{r.cantidad}</td>
      <td className={styles.tdFecha}>
        {new Date(r.fecha).toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </td>
      <td className={styles.tdPct}>
        {r.percHonorario != null ? (
          <span className={styles.pctBadge}>{r.percHonorario.toFixed(0)}%</span>
        ) : (
          <span className={styles.pctEmpty}>—</span>
        )}
      </td>
      <td className={styles.tdPct}>
        {r.percGasto != null ? (
          <span className={styles.pctBadge}>{r.percGasto.toFixed(0)}%</span>
        ) : (
          <span className={styles.pctEmpty}>—</span>
        )}
      </td>
      <td className={styles.tdPct}>
        {r.percAyudante != null ? (
          <span className={styles.pctBadge}>{r.percAyudante.toFixed(0)}%</span>
        ) : (
          <span className={styles.pctEmpty}>—</span>
        )}
      </td>
      <td className={styles.tdActions}>
        <button className={styles.btnEdit} onClick={() => onEdit?.(r)}>
          Editar
        </button>
        <button className={styles.btnDelete} onClick={() => onDelete?.(r.id)}>
          Borrar
        </button>
      </td>
    </motion.tr>
  );
}

export default function IoscorAffilliateTable({
  rows,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Prácticas Registradas</h2>
        <span className={styles.panelCount}>
          {rows.length} {rows.length === 1 ? "registro" : "registros"}
        </span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>N° Orden</th>
              <th>N° Documento</th>
              <th>Obra Social</th>
              <th>Código</th>
              <th>Cant.</th>
              <th>Fecha</th>
              <th>Honorario</th>
              <th>Gasto</th>
              <th>Ayudante</th>
              <th className={styles.thActions}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {rows.length === 0 ? (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td className={styles.empty} colSpan={10}>
                    <div className={styles.emptyState}>
                      <svg
                        className={styles.emptyIcon}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className={styles.emptyText}>
                        No hay prácticas registradas
                      </p>
                      <p className={styles.emptyHint}>
                        Agregue una nueva práctica para comenzar
                      </p>
                    </div>
                  </td>
                </motion.tr>
              ) : (
                rows.map((r, i) => (
                  <Row
                    key={r.id}
                    r={r}
                    i={i}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
