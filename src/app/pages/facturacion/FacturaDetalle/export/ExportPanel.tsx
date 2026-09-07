import { useState } from "react";
import { X } from "lucide-react";
import { descargarExportDetalle, descargarExportCaratula } from "../../api";
import { saveAs } from "../../../../lib/fileSaver";
import type { FacturaDetalleResponse } from "../../types";
import type { ExportOpciones } from "./types";
import { OPCIONES_DEFAULT } from "./types";
import OrdenSection from "./OrdenSection";
import AgrupacionSection from "./AgrupacionSection";
import FiltrosSection from "./FiltrosSection";
import ColumnasSection from "./ColumnasSection";
import PresetsSection from "./PresetsSection";
import ExportButtons from "./ExportButtons";
import s from "./export.module.scss";

interface Props {
  detalle: FacturaDetalleResponse;
  onClose: () => void;
}

async function extraerMensajeError(err: any): Promise<string> {
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.detail) return String(parsed.detail);
    } catch {
      // el blob no era JSON — sigue al mensaje genérico de abajo
    }
  }
  return err?.message || "No se pudo generar el archivo.";
}

export default function ExportPanel({ detalle, onClose }: Props) {
  const [tab, setTab] = useState<"detalle" | "caratula">("detalle");
  const [opciones, setOpciones] = useState<ExportOpciones>(OPCIONES_DEFAULT);

  const prestadores = detalle.prestadores.map((p) => ({ cod_medico: p.cod_medico, nombre: p.nombre }));

  const exportarDetalle = async (formato: "pdf" | "xlsx") => {
    try {
      const { blob, filename } = await descargarExportDetalle(detalle.id_factura, formato, opciones);
      await saveAs(blob, filename ?? `detalle_factura_${detalle.id_factura}.${formato}`);
    } catch (err) {
      throw new Error(await extraerMensajeError(err));
    }
  };

  const exportarCaratula = async (formato: "pdf" | "xlsx") => {
    try {
      const { blob, filename } = await descargarExportCaratula(detalle.id_factura, formato);
      await saveAs(blob, filename ?? `caratula_factura_${detalle.id_factura}.${formato}`);
    } catch (err) {
      throw new Error(await extraerMensajeError(err));
    }
  };

  return (
    <>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <aside className={s.drawer} aria-label="Panel de exportación" role="complementary">
        <div className={s.drawerHeader}>
          <div>
            <h2 className={s.drawerTitle}>Exportar factura</h2>
            <p className={s.drawerSub}>Elegí el detalle o la carátula, ajustá las opciones y descargá.</p>
          </div>
          <button type="button" className={s.closeBtn} onClick={onClose} aria-label="Cerrar panel">
            <X size={18} />
          </button>
        </div>

        <div className={s.tabRow}>
          <button
            type="button"
            className={`${s.tabBtn} ${tab === "detalle" ? s.tabBtnOn : ""}`}
            onClick={() => setTab("detalle")}
          >
            Detalle
          </button>
          <button
            type="button"
            className={`${s.tabBtn} ${tab === "caratula" ? s.tabBtnOn : ""}`}
            onClick={() => setTab("caratula")}
          >
            Carátula
          </button>
        </div>

        <div className={s.drawerBody}>
          {tab === "detalle" ? (
            <>
              <OrdenSection orden={opciones.orden} onChange={(orden) => setOpciones((o) => ({ ...o, orden }))} />
              <AgrupacionSection
                agrupacion={opciones.agrupacion}
                onChange={(agrupacion) => setOpciones((o) => ({ ...o, agrupacion }))}
              />
              <FiltrosSection
                filtros={opciones}
                onChange={(filtros) => setOpciones((o) => ({ ...o, ...filtros }))}
                prestadores={prestadores}
              />
              <ColumnasSection
                columnas={opciones.columnas}
                onChange={(columnas) => setOpciones((o) => ({ ...o, columnas }))}
              />
              <PresetsSection tipoDocumento="detalle" opciones={opciones} onAplicar={setOpciones} />
              <ExportButtons
                onExport={exportarDetalle}
                disabled={detalle.total_prestaciones === 0}
                disabledHint="No hay prestaciones para exportar."
              />
            </>
          ) : (
            <>
              <div className={s.section}>
                <p className={s.sectionHint}>
                  La carátula siempre incluye el total completo de la factura — no aplica los filtros del detalle.
                </p>
              </div>
              <ExportButtons onExport={exportarCaratula} />
            </>
          )}
        </div>
      </aside>
    </>
  );
}
