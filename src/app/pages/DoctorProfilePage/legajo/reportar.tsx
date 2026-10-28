import type { ReactNode } from "react";
import reportStyles from "../ReportarCambioModal.module.scss";
import type { ReportTarget } from "../ReportarCambioModal";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

/** Botón "reportar" al lado de la etiqueta de un dato; sólo aparece en modo lectura. */
export const crearReportar =
  (activo: boolean, reportar: (t: ReportTarget) => void) =>
  (campo: string, label: string, valorActual?: unknown): ReactNode => {
    if (!activo) return null;
    return (
      <BotonPlano
        type="button"
        className={reportStyles.reportBtn}
        title={`Reportar que "${label}" está mal`}
        onClick={() =>
          reportar({
            campo,
            label,
            valorActual:
              valorActual == null || valorActual === "" ? null : String(valorActual),
          })
        }
      >
        reportar
      </BotonPlano>
    );
  };

export type Reportar = ReturnType<typeof crearReportar>;
