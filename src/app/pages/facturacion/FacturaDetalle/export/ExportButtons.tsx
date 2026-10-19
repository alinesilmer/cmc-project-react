import { useState } from "react";
import s from "./export.module.scss";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";

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
        <BotonDescarga
          formato="excel"
          onClick={() => handle("xlsx")}
          disabled={disabled || cargando !== null}
          cargando={cargando === "xlsx"}
        />

        <BotonDescarga
          formato="pdf"
          onClick={() => handle("pdf")}
          disabled={disabled || cargando !== null}
          cargando={cargando === "pdf"}
        />
      </div>
    </div>
  );
}
