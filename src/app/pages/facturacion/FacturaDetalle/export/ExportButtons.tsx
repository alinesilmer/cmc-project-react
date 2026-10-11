import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { abrirVentanaPdf } from "@/app/shared/lib/abrirPdf";
import s from "./export.module.scss";

interface Props {
  // Para el PDF recibe la pestaña ya abierta (ver `abrirVentanaPdf`) donde mostrarlo.
  onExport: (formato: "pdf" | "xlsx", ventana: Window | null) => Promise<void>;
  disabled?: boolean;
  disabledHint?: string;
}

export default function ExportButtons({ onExport, disabled, disabledHint }: Props) {
  const [cargando, setCargando] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (formato: "pdf" | "xlsx") => {
    setError(null);
    setCargando(formato);
    // El PDF se abre en una pestaña nueva, que tiene que abrirse acá, dentro del clic.
    const ventana = formato === "pdf" ? abrirVentanaPdf() : null;
    try {
      await onExport(formato, ventana);
    } catch (e: any) {
      ventana?.close();
      setError(e?.message || "No se pudo generar el archivo.");
    } finally {
      setCargando(null);
    }
  };

  return (
    <div className={s.section}>
      {disabled && disabledHint && <p className={s.exportHint}>{disabledHint}</p>}
      {error && <p className={s.exportError}>{error}</p>}

      <div className={s.exportBtnRow}>
        <button
          type="button"
          className={`${s.exportBtn} ${s.exportBtnExcel}`}
          onClick={() => handle("xlsx")}
          disabled={disabled || cargando !== null}
        >
          {cargando === "xlsx" ? <Loader2 size={16} className={s.spin} /> : <FileSpreadsheet size={16} />}
          Excel
        </button>

        <button
          type="button"
          className={`${s.exportBtn} ${s.exportBtnPDF}`}
          onClick={() => handle("pdf")}
          disabled={disabled || cargando !== null}
        >
          {cargando === "pdf" ? <Loader2 size={16} className={s.spin} /> : <FileText size={16} />}
          PDF
        </button>
      </div>
    </div>
  );
}
