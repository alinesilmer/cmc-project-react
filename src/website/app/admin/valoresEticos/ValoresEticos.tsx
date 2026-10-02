import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import Alerta from "../../../components/UI/Alerta/Alerta";
import ZonaCarga from "./ZonaCarga";
import HistorialValores from "./HistorialValores";
import VerPdf from "./VerPdf";
import { useValoresEticos } from "./useValoresEticos";
import { formatearFecha } from "../../../lib/fechas";
import { nombreDeRuta } from "../../../lib/documentos";
import styles from "./valoresEticos.module.scss";

/** La solapa «Valores Éticos»: el PDF vigente, la carga de uno nuevo y el historial. */
export default function ValoresEticos() {
  const { ultimo, historial, cargando, errorCarga, subir, borrar } = useValoresEticos();
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [borrando, setBorrando] = useState<number | null>(null);

  useEffect(() => {
    if (!exito) return;
    const t = setTimeout(() => setExito(null), 4000);
    return () => clearTimeout(t);
  }, [exito]);

  const alSubir = async (archivo: File, observaciones: string) => {
    setSubiendo(true);
    setError(null);
    try {
      await subir(archivo, observaciones);
      setExito("PDF subido correctamente.");
      return true;
    } catch {
      setError("Error al subir el archivo. Intentá de nuevo.");
      return false;
    } finally {
      setSubiendo(false);
    }
  };

  const alBorrar = async (id: number) => {
    if (!confirm("¿Eliminar este registro y su archivo?")) return;
    setBorrando(id);
    setError(null);
    try {
      await borrar(id);
    } catch {
      setError("Error al eliminar. Intentá de nuevo.");
    } finally {
      setBorrando(null);
    }
  };

  const mensajeError = error ?? (errorCarga ? "No se pudo cargar el archivo actual." : null);

  return (
    <div className={styles.eticaSection}>
      <div className={styles.eticaHeader}>
        <h2>Valores Éticos</h2>
        <p className={styles.eticaDesc}>
          Subí un nuevo PDF para reemplazar el Boletín de Valores Éticos Mínimos que se muestra en el Inicio y en
          el Login. El archivo actual seguirá visible hasta que confirmes la carga.
        </p>
      </div>

      {exito && (
        <Alerta tono="exito" onCerrar={() => setExito(null)}>
          {exito}
        </Alerta>
      )}
      {mensajeError && <Alerta onCerrar={() => setError(null)}>{mensajeError}</Alerta>}

      <div className={styles.eticaCurrent}>
        <FileText className={styles.eticaCurrentIcon} aria-hidden="true" />
        <div>
          <span className={styles.eticaCurrentLabel}>Archivo actual</span>
          {cargando ? (
            <span className={styles.eticaLoadingText}>Cargando…</span>
          ) : ultimo ? (
            <>
              <span className={styles.eticaCurrentName}>{nombreDeRuta(ultimo.pdf_path)}</span>
              <span className={styles.eticaCurrentDate}>{formatearFecha(ultimo.fecha_update, "conHora")}</span>
              {ultimo.observaciones && <span className={styles.eticaCurrentObs}>{ultimo.observaciones}</span>}
            </>
          ) : (
            <span className={styles.eticaCurrentEmpty}>Sin archivo cargado</span>
          )}
        </div>
        {ultimo && <VerPdf ruta={ultimo.pdf_path} etiqueta="Ver PDF" onError={setError} />}
      </div>

      <ZonaCarga subiendo={subiendo} onSubir={alSubir} onError={setError} />

      {!cargando && <HistorialValores historial={historial} borrando={borrando} onBorrar={alBorrar} onError={setError} />}
    </div>
  );
}
