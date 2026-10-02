import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, FileText, Trash2 } from "lucide-react";
import VerPdf from "./VerPdf";
import { formatearFecha } from "../../../lib/fechas";
import { nombreDeRuta } from "../../../lib/documentos";
import type { ValoresEticosOut } from "./valoresEticos.api";
import styles from "./HistorialValores.module.scss";

type Props = {
  historial: ValoresEticosOut[];
  borrando: number | null;
  onBorrar: (id: number) => void;
  onError: (mensaje: string) => void;
};

/** Las versiones anteriores del PDF, plegadas por defecto. */
export default function HistorialValores({ historial, borrando, onBorrar, onError }: Props) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className={styles.eticaHistorial}>
      <button
        type="button"
        className={styles.eticaHistorialToggle}
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
      >
        <ChevronDown size={16} className={abierto ? styles.girado : ""} aria-hidden="true" />
        Historial ({historial.length})
      </button>

      <AnimatePresence>
        {abierto && (
          <motion.div
            className={styles.eticaHistorialList}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {historial.length === 0 ? (
              <p className={styles.eticaNoData}>Sin registros anteriores.</p>
            ) : (
              historial.map((item) => (
                <div key={item.id} className={styles.eticaHistorialItem}>
                  <FileText size={16} className={styles.icono} aria-hidden="true" />
                  <div className={styles.eticaHistorialMeta}>
                    <span className={styles.eticaHistorialName}>{nombreDeRuta(item.pdf_path)}</span>
                    <span className={styles.eticaHistorialDate}>{formatearFecha(item.fecha_update, "conHora")}</span>
                    {item.observaciones && <span className={styles.eticaHistorialObs}>{item.observaciones}</span>}
                  </div>
                  <div className={styles.eticaHistorialActions}>
                    <VerPdf ruta={item.pdf_path} etiqueta="Ver" onError={onError} />
                    <button
                      type="button"
                      className={styles.eticaDeleteBtn}
                      onClick={() => onBorrar(item.id)}
                      disabled={borrando === item.id}
                      aria-label="Eliminar"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
