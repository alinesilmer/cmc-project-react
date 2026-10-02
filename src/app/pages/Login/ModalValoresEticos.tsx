import { createPortal } from "react-dom";
import { useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, ExternalLink, FileText, X } from "lucide-react";
import { useModal } from "@/website/hooks/useModal";
import pdf from "../../assets/CMC_08_2026.pdf";
import styles from "./ModalValoresEticos.module.scss";

type Props = { abierto: boolean; onCerrar: () => void };

/**
 * El boletín de Valores Éticos Mínimos en una ventana. En el celular muchos
 * navegadores no muestran un PDF dentro de la página: ahí se ofrecen abrirlo o
 * descargarlo, que funcionan siempre.
 */
export default function ModalValoresEticos({ abierto, onCerrar }: Props) {
  const cerrar = useCallback(() => onCerrar(), [onCerrar]);
  useModal(abierto, cerrar);

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <motion.div
          key="fondo"
          className={styles.fondo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cerrar}
        >
          <motion.div
            className={styles.ventana}
            role="dialog"
            aria-modal="true"
            aria-labelledby="valores-titulo"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className={styles.cabecera}>
              <span className={styles.icono} aria-hidden="true">
                <FileText />
              </span>
              <div className={styles.textos}>
                <h2 id="valores-titulo">Valores Éticos Mínimos</h2>
                <p>Boletín vigente del Colegio Médico de Corrientes</p>
              </div>
              <button type="button" className={styles.cerrar} onClick={cerrar} aria-label="Cerrar">
                <X aria-hidden="true" />
              </button>
            </header>

            <div className={styles.visor}>
              <iframe src={pdf} title="Valores Éticos Mínimos" className={styles.pdf} />
              <div className={styles.alternativa}>
                <FileText aria-hidden="true" />
                <p>Tocá «Abrir» para verlo en pantalla completa.</p>
              </div>
            </div>

            <footer className={styles.acciones}>
              <a href={pdf} target="_blank" rel="noopener noreferrer" className={styles.secundaria}>
                <ExternalLink aria-hidden="true" />
                Abrir
              </a>
              <a href={pdf} download className={styles.principal}>
                <Download aria-hidden="true" />
                Descargar PDF
              </a>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
