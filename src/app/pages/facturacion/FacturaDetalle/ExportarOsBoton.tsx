import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { FileSpreadsheet, FileText } from "lucide-react";

import { useNotify } from "@/app/hooks/useNotify";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import {
  descargarPlanoBoreal, descargarPlanoOmint, descargarTxtDasuten, descargarTxtUnne,
} from "../api";
import type { FacturaDetalleResponse } from "../types";
import styles from "./CabeceraExpediente.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

type Descargar = (facturaId: number, params: { tipo?: string; nro_factura?: string }) => Promise<{ blob: Blob }>;

interface Exportable {
  texto: string;
  icono: LucideIcon;
  descargar: Descargar;
  nombreArchivo: (periodo: string) => string;
  /** UNNE lleva el tipo y el nº de factura en cada línea: si la factura no está numerada se piden. */
  pideNumeroFactura?: boolean;
}

// El exportable propio de cada obra social (cod_obra): sólo aparece en su factura.
const EXPORTABLE_POR_OBRA_SOCIAL: Record<string, Exportable> = {
  "81": {
    texto: "TXT UNNE", icono: FileText, pideNumeroFactura: true,
    descargar: (id, params) => descargarTxtUnne(id, params),
    nombreArchivo: (p) => `${p}_81.txt`,
  },
  "137": {
    texto: "TXT DASUTEN", icono: FileText,
    descargar: (id) => descargarTxtDasuten(id),
    nombreArchivo: (p) => `prestacionesDASUTEN_${p}.txt`,
  },
  "243": {
    texto: "Plano OMINT", icono: FileSpreadsheet,
    descargar: (id) => descargarPlanoOmint(id),
    nombreArchivo: (p) => `plano omint ${p.slice(4, 6)}-${p.slice(0, 4)}.xlsx`,
  },
  "285": {
    texto: "Plano Boreal", icono: FileSpreadsheet,
    descargar: (id) => descargarPlanoBoreal(id),
    nombreArchivo: (p) => `plano boreal ${p.slice(4, 6)}-${p.slice(0, 4)}.xlsx`,
  },
};

// Con `responseType: "blob"` el detalle del error llega dentro de un Blob.
async function mensajeDelError(e: unknown): Promise<string> {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const detalle = JSON.parse(await data.text())?.detail;
      if (typeof detalle === "string" && detalle) return detalle;
    } catch { /* no era JSON */ }
  }
  return mensajeDeError(e, "No se pudo generar el archivo.");
}

/**
 * Botón con el exportable propio de la obra social de la factura abierta (TXT UNNE, Plano Boreal,
 * Plano OMINT, TXT DASUTEN), al lado de "Exportar". Si la obra social no tiene uno, no se muestra.
 */
export default function ExportarOsBoton({ detalle }: { detalle: FacturaDetalleResponse | null }) {
  const notify = useNotify();
  const [generando, setGenerando] = useState(false);
  const [pedirNumero, setPedirNumero] = useState(false);
  const [tipo, setTipo] = useState("");
  const [nro, setNro] = useState("");

  const exportable = detalle ? EXPORTABLE_POR_OBRA_SOCIAL[String(detalle.cod_obra).trim()] : undefined;
  if (!detalle || !exportable) return null;
  const Icono = exportable.icono;

  const generar = async () => {
    setGenerando(true);
    try {
      const params = pedirNumero ? { tipo: tipo.trim().toUpperCase(), nro_factura: nro.trim() } : {};
      const { blob } = await exportable.descargar(detalle.id_factura, params);
      const nombre = exportable.nombreArchivo(detalle.periodo);
      await saveAs(blob, nombre);
      notify.success(exportable.texto, `Se descargó ${nombre}.`);
      setPedirNumero(false);
    } catch (e) {
      const mensaje = await mensajeDelError(e);
      // La factura todavía no tiene tipo ni número: se piden acá y se reintenta con el mismo botón.
      if (exportable.pideNumeroFactura && !pedirNumero && /tipo ni n.mero/i.test(mensaje)) {
        setPedirNumero(true);
        notify.info(exportable.texto, "La factura todavía no está numerada: indicá el tipo y el número.");
      } else {
        notify.error(exportable.texto, mensaje);
      }
    } finally {
      setGenerando(false);
    }
  };

  return (
    <>
      {pedirNumero && (
        <>
          <input
            className={`${styles.numeroFactura} ${styles.numeroFacturaTipo}`} value={tipo} maxLength={1} placeholder="B"
            aria-label="Tipo de factura" onChange={(e) => setTipo(e.target.value.toUpperCase())}
          />
          <input
            className={styles.numeroFactura} value={nro} maxLength={14}
            placeholder="00031-00005130" aria-label="Número de factura" onChange={(e) => setNro(e.target.value)}
          />
        </>
      )}
      <BotonPlano
        type="button" className={styles.btn} onClick={generar}
        disabled={generando || (pedirNumero && (tipo.trim() === "" || nro.trim() === ""))}
      >
        {generando ? <Cargando size={15} /> : <Icono size={15} />} {exportable.texto}
      </BotonPlano>
    </>
  );
}
