import { useState } from "react";
import type { ObraSocialListItem } from "../obrasSociales.types";
import type { ExportField } from "./exportService";
import { exportToExcel, exportToPDF } from "./exportService";
import s from "./export.module.scss";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";

interface Props {
  items: ObraSocialListItem[];
  fields: ExportField[];
  appliedFilters: string[];
}

export default function ExportButtons({ items, fields, appliedFilters }: Props) {
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);
  const disabled = items.length === 0 || !fields.some((f) => f.enabled);

  const handleExcel = async () => {
    setLoadingExcel(true);
    try {
      await exportToExcel(items, fields);
    } finally {
      setLoadingExcel(false);
    }
  };

  const handlePDF = async () => {
    setLoadingPDF(true);
    try {
      await Promise.resolve(); // yield to allow spinner to render
      exportToPDF(items, fields, appliedFilters);
    } finally {
      setLoadingPDF(false);
    }
  };

  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <h3 className={s.sectionTitle}>Exportar</h3>
        <span className={s.resultCount}>
          {items.length} resultado{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {disabled && (
        <p className={s.exportHint}>
          {items.length === 0
            ? "Sin resultados para exportar."
            : "Seleccioná al menos una columna."}
        </p>
      )}

      <div className={s.exportBtnRow}>
        <BotonDescarga formato="excel" onClick={handleExcel} disabled={disabled} cargando={loadingExcel} />

        <BotonDescarga formato="pdf" onClick={handlePDF} disabled={disabled} cargando={loadingPDF} />
      </div>
    </div>
  );
}
