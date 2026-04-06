"use client";

import { useCallback, useState } from "react";
import {
  FileDown,
  RefreshCcw,
} from "lucide-react";

import styles from "./BoletinConsultaComun.module.scss";
import Button from "../../../website/components/UI/Button/Button";

import {
  CONSULTA_COMUN_CODE,
  shortDateFormatter,
} from "./boletinConsultaComun.constants";
import { generateConsultaComunPdf } from "./boletinConsultaComun.pdf";
import { useConsultaComunQuery } from "./useConsultaComunQuery";

export default function BoletinConsultaComun() {
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


  const {
    data = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useConsultaComunQuery();

  


  const handleDownloadPdf = useCallback(async () => {
    if (data.length === 0 || isGeneratingPdf) return;

    setPdfError(null);
    setIsGeneratingPdf(true);

    try {
      await generateConsultaComunPdf(data);
    } catch (err) {
      setPdfError(
        err instanceof Error
          ? `No se pudo generar el PDF. ${err.message}`
          : "No se pudo generar el PDF."
      );
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [data, isGeneratingPdf]);

  return (
    <div className={styles.container}>
      

      <section className={styles.panel}>
        <div className={styles.panelTop}>
          <div>
            <h2 className={styles.panelTitle}>Vista previa</h2>
            <p className={styles.panelDescription}>
              El PDF siempre se genera con <strong>todas</strong> las obras
              sociales disponibles para el código <strong>{CONSULTA_COMUN_CODE}</strong>.
            </p>
          </div>

          <div className={styles.actions}>
            <Button
              size="small"
              variant="secondary"
              onClick={() => void refetch()}
              disabled={isLoading || isFetching || isGeneratingPdf}
            >
              <span className={styles.buttonInner}>
                <RefreshCcw size={16} />
                Actualizar datos
              </span>
            </Button>

            <Button
              size="small"
              variant="secondary"
              onClick={() => void handleDownloadPdf()}
              disabled={
                isLoading ||
                isFetching ||
                isGeneratingPdf ||
                data.length === 0
              }
            >
              <span className={styles.buttonInner}>
                <FileDown size={16} />
                {isGeneratingPdf ? "Generando PDF..." : "Descargar PDF"}
              </span>
            </Button>
          </div>
        </div>

        <div className={styles.metaGrid}>
          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Práctica</span>
            <span className={styles.metaValue}>Consulta Común</span>
          </div>

          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Código</span>
            <span className={styles.metaValue}>{CONSULTA_COMUN_CODE}</span>
          </div>

          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Obras sociales</span>
            <span className={styles.metaValue}>{data.length}</span>
          </div>

          <div className={styles.metaCard}>
            <span className={styles.metaLabel}>Fecha del documento</span>
            <span className={styles.metaValue}>
              {shortDateFormatter.format(new Date())}
            </span>
          </div>
        </div>
        </section>
</div>
  );
}