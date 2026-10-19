import { FileSpreadsheet } from "lucide-react";

import { descargarPlanoOmint } from "../api";
import ExportarPorFactura from "../ExportarPorFactura/ExportarPorFactura";

/**
 * Herramientas → "Plano OMINT".
 *
 * Excel de las prestaciones de una factura de OMINT (obra social 243): afiliado, beneficiario, fecha,
 * código, descripción, monto y especialidad.
 */
export default function PlanoOmint() {
  return (
    <ExportarPorFactura
      obraSocial="243"
      titulo="Plano OMINT"
      subtitulo="Excel de las prestaciones de OMINT (obra social 243) por período."
      sinFacturas="OMINT todavía no tiene facturas."
      icono={FileSpreadsheet}
      textoBoton="Descargar Excel"
      descargar={descargarPlanoOmint}
      nombreArchivo={(f) => `plano omint ${f.periodo.slice(4, 6)}-${f.periodo.slice(0, 4)}.xlsx`}
    />
  );
}
