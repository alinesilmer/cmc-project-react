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
  fecha: string; // YYYY-MM-DD
  orderMode: "Auto" | "Manual";
  orderNumber?: string;
  percHonorario?: number;
  percGasto?: number;
  percAyudante?: number;
};

type Props = {
  rows: PracticeRow[];
  onEdit?: (row: PracticeRow) => void; // ← pass full row
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
        {r.obraSocCode} - {r.obraSocName}
      </td>
      <td className={styles.tdCodigo}>{r.codigo}</td>
      <td className={styles.tdCant}>{r.cantidad}</td>
      <td className={styles.tdFecha}>
        {new Date(r.fecha).toLocaleDateString()}
      </td>
      <td className={styles.tdPct}>
        {r.percHonorario != null ? `${r.percHonorario.toFixed(0)},00%` : "—"}
      </td>
      <td className={styles.tdPct}>
        {r.percGasto != null ? `${r.percGasto.toFixed(0)},00%` : "—"}
      </td>
      <td className={styles.tdPct}>
        {r.percAyudante != null ? `${r.percAyudante.toFixed(0)},00%` : "—"}
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
      <div className={styles.panelHead}>Prácticas</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>N° Orden</th>
              <th>N° documento</th>
              <th>Obra</th>
              <th>Código</th>
              <th>Cant.</th>
              <th>Fecha Práctica</th>
              <th>Honorario</th>
              <th>Gasto</th>
              <th>Ayudante</th>
              <th className={styles.thActions}>Acciones</th>
            </tr>
          </thead>
          <AnimatePresence mode="popLayout">
            {rows.length === 0 ? (
              <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <td className={styles.empty} colSpan={10}>
                  Sin registros.
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
        </table>
      </div>
    </div>
  );
}
