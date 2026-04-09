/*this page is for the "Padrón Sucio" section, 
 which allows users to view and download a PDF and Excel file containing 
 the list of medical providers registered with the Colegio Médico de Corrientes. 
 The PDF is embedded in an iframe for easy viewing, 
 and the Excel file can be downloaded with a single click. */

"use client";

import { saveAs } from "file-saver";
import { Download } from "lucide-react";

import styles from "./PadronSucio.module.scss";
import Button from "../../components/atoms/Button/Button";
import PadronPdf from "../../assets/prestadores_padron.pdf";

const TITLE = "Prestadores del Colegio Médico de Corrientes";

const PadronXlsxUrl = "/prestadores_listado.xlsx";

const PadronSucio = () => {

  function downloadExcel() {
    saveAs(PadronXlsxUrl, `${TITLE}.xlsx`);
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        

        <div className={styles.card}>
          <div className={styles.cardContent}>
            <div className={styles.topRow}>
              <div className={styles.actions}>
                

                <Button type="button" variant="primary" onClick={downloadExcel}>
                  <Download size={18} />
                  <span>Descargar Excel</span>
                </Button>
              </div>
            </div>

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
