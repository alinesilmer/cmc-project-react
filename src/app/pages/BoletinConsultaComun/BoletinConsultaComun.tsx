import { useCallback, useMemo, useState } from "react";
import { Stethoscope } from "lucide-react";

import styles from "./BoletinConsultaComun.module.scss";
import comun from "./components/Comun.module.scss";
import Caja, { Cajas } from "@/app/components/ui/Caja/Caja";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import Franja, { Solapa } from "@/app/components/layout/Franja/Franja";
import { useObrasSociales } from "@/app/pages/ObrasSociales/useObrasSociales";
import { detalleDeError } from "@/app/shared/lib/httpErrors";

import { CONSULTA_COMUN_CODE, EXCLUDED_OS } from "./boletinConsultaComun.constants";
import { generateConsultaComunPdf } from "./boletinConsultaComun.pdf";
import { generateConsultaComunExcel } from "./boletinConsultaComun.excel";
import { useConsultaComunQuery } from "./useConsultaComunQuery";
import { useGalenoQuery } from "./useGalenoQuery";
import { useObservaciones } from "./useObservaciones";
import { useNormasOperativas } from "./useNormasOperativas";
import { SIN_GALENOS } from "./boletinConsultaComun.types";
import ObservacionesTab from "./components/ObservacionesTab";
import ValoresTab from "./components/ValoresTab";

type Pestana = "observaciones" | "valor";

export default function BoletinConsultaComun() {
  const [pestana, setPestana] = useState<Pestana>("observaciones");
  const [exportError, setExportError] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false);

  const { data = [], error, isLoading, isFetching } = useConsultaComunQuery();
  const catalogo = useObrasSociales();
  const { data: galenoMap } = useGalenoQuery();
  const obs = useObservaciones();
  const { normasPorOS } = useNormasOperativas();
  const { observaciones } = obs;

  // Todas las obras sociales del catálogo: una puede tener observación sin tener valor cargado.
  const obras = useMemo(
    () =>
      (catalogo.data ?? [])
        .filter((o) => o.nro_obra_social && !EXCLUDED_OS.has(o.nro_obra_social))
        .map((o) => ({
          nro: o.nro_obra_social,
          nombre: (o.nombre || o.denominacion || `OS ${o.nro_obra_social}`).trim(),
        })),
    [catalogo.data]
  );
  const conObservacion = useMemo(() => obras.filter((o) => observaciones[o.nro]).length, [obras, observaciones]);

  /** Valores + observaciones + galenos reales: lo que llevan el PDF y el Excel. */
  const dataForExport = useMemo(
    () =>
      data.map((item) => ({
        ...item,
        observaciones: observaciones[item.nro] ? [observaciones[item.nro]] : item.observaciones,
        galenos: galenoMap?.get(item.nro) ?? SIN_GALENOS,
      })),
    [data, observaciones, galenoMap]
  );

  const handleDownloadPdf = useCallback(async () => {
    if (dataForExport.length === 0 || isGeneratingPdf) return;
    setExportError(null);
    setIsGeneratingPdf(true);
    try {
      await generateConsultaComunPdf(dataForExport, normasPorOS);
    } catch (err) {
      setExportError(err instanceof Error ? `No se pudo generar el PDF. ${err.message}` : "No se pudo generar el PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [dataForExport, normasPorOS, isGeneratingPdf]);

  const handleDownloadExcel = useCallback(async () => {
    if (dataForExport.length === 0 || isGeneratingExcel) return;
    setExportError(null);
    setIsGeneratingExcel(true);
    try {
      await generateConsultaComunExcel(dataForExport, observaciones);
    } catch (err) {
      setExportError(err instanceof Error ? `No se pudo generar el Excel. ${err.message}` : "No se pudo generar el Excel.");
    } finally {
      setIsGeneratingExcel(false);
    }
  }, [dataForExport, observaciones, isGeneratingExcel]);

  const sinDatos = isLoading || data.length === 0;

  return (
    <div className={styles.container}>
      <Franja titulo="Consulta común" icono={Stethoscope}>
        <Solapa activa={pestana === "observaciones"} onClick={() => setPestana("observaciones")} cuenta={conObservacion}>
          Observaciones
        </Solapa>
        <Solapa activa={pestana === "valor"} onClick={() => setPestana("valor")} cuenta={data.length}>
          Valor consulta {CONSULTA_COMUN_CODE}
        </Solapa>
      </Franja>

      <Cajas>
        <Caja titulo="Descargas">
          <BotonDescarga formato="pdf" onClick={() => void handleDownloadPdf()} disabled={sinDatos || isFetching} cargando={isGeneratingPdf} />
          <BotonDescarga formato="excel" onClick={() => void handleDownloadExcel()} disabled={sinDatos || isFetching} cargando={isGeneratingExcel} />
        </Caja>
      </Cajas>

      {exportError && <div className={`${comun.aviso} ${comun.avisoError}`}>{exportError}</div>}

      {pestana === "observaciones" ? (
        <ObservacionesTab
          obras={obras}
          cargando={catalogo.isLoading}
          error={catalogo.error ? detalleDeError(catalogo.error, "No se pudieron cargar las obras sociales.") : null}
          obs={obs}
          normasPorOS={normasPorOS}
        />
      ) : (
        <ValoresTab
          items={data}
          cargando={isLoading}
          error={error ? detalleDeError(error, "No se pudieron cargar los valores.") : null}
        />
      )}
    </div>
  );
}
