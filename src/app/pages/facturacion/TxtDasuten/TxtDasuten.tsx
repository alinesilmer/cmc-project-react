import { FileText } from "lucide-react";

import { descargarTxtDasuten } from "../api";
import ExportarPorFactura from "../ExportarPorFactura/ExportarPorFactura";

/**
 * Herramientas → "TXT DASUTEN".
 *
 * Archivo de prestaciones de una factura de DASUTEN - UTN (obra social 137), una línea por
 * prestación en el formato de ancho fijo que usa la obra social.
 */
export default function TxtDasuten() {
  return (
    <ExportarPorFactura
      obraSocial="137"
      titulo="TXT DASUTEN"
      subtitulo="Archivo de prestaciones de DASUTEN - UTN (obra social 137) por período."
      sinFacturas="DASUTEN todavía no tiene facturas."
      icono={FileText}
      textoBoton="Descargar TXT"
      descargar={descargarTxtDasuten}
      nombreArchivo={(f) => `prestacionesDASUTEN_${f.periodo}.txt`}
    />
  );
}
