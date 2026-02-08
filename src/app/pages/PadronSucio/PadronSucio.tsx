"use client";

import { saveAs } from "file-saver";
import { FileText, Download } from "lucide-react";

import styles from "./PadronSucio.module.scss";
import Button from "../../components/atoms/Button/Button";
import PadronPdf from "../../assets/prestadores_padron.pdf";

const TITLE = "Prestadores del Colegio Médico de Corrientes";

const PadronSucio = () => {
  function downloadPdf() {
    saveAs(PadronPdf as unknown as string, `${TITLE}.pdf`);
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>{TITLE}</h1>
          </div>
        </div>

        {/* Card */}
        <div className={styles.card}>

          <div className={styles.cardContent}>
            <div className={styles.topRow}>
              <div className={styles.actions}>
                <Button type="button" variant="primary" onClick={downloadPdf}>
                  <Download size={18} />
                  <span>Descargar PDF</span>
                </Button>

              </div>
            </div>

            {/* Visor PDF */}
            <div className={styles.pdfViewer}>
              <iframe
                title={TITLE}
                src={`${PadronPdf}#view=FitH&toolbar=1&navpanes=0`}
                className={styles.pdfFrame}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PadronSucio;