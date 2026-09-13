import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import s from "./export.module.scss";

interface Props {
  onExport: (formato: "pdf" | "xlsx") => Promise<void>;
  disabled?: boolean;
  disabledHint?: string;
}

export default function ExportButtons({ onExport, disabled, disabledHint }: Props) {
  const [cargando, setCargando] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (formato: "pdf" | "xlsx") => {
    setError(null);
    setCargando(formato);
    try {
      await onExport(formato);
    } catch (e: any) {
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
