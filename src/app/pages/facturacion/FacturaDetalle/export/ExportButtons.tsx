import { useState } from "react";
import { abrirVentanaPdf } from "@/app/shared/lib/abrirPdf";
import s from "./export.module.scss";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";

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
