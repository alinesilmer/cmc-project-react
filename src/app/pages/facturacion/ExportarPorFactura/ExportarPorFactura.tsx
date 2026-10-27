import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { listarFacturas } from "../api";
import type { FacturaRead } from "../types";
import { formatMoney } from "../money";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
// Mismo formato que las demás herramientas de exportación de Facturación.
import styles from "../TxtUnne/TxtUnne.module.scss";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

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

interface Props {
  /** Obra social de las facturas (cod_obr). */
  obraSocial: string;
  titulo: string;
  subtitulo: string;
  /** Texto de «<OS> todavía no tiene facturas.». */
  sinFacturas: string;
  icono: LucideIcon;
  textoBoton: string;
  descargar: (facturaId: number) => Promise<{ blob: Blob }>;
  nombreArchivo: (factura: FacturaRead) => string;
}

/**
 * Herramientas → exportable de una obra social por período (Excel o TXT con el formato que
 * pide cada una). Se elige la factura y se descarga el archivo; el armado lo hace la API.
 */
export default function ExportarPorFactura({
  obraSocial, titulo, subtitulo, sinFacturas, icono: Icono, textoBoton, descargar, nombreArchivo,
}: Props) {
  const [facturas, setFacturas] = useState<FacturaRead[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [elegida, setElegida] = useState<number | "">("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    listarFacturas({ cod_obra: obraSocial, solo_complementos: false, limit: 36 })
      .then(({ data }) => {
        if (!activo) return;
        setFacturas(data);
        if (data.length > 0) setElegida(data[0].id_prestaciones);
      })
      .catch((e) => { if (activo) setErrorCarga(mensajeDeError(e, "No se pudieron cargar las facturas.")); });
    return () => { activo = false; };
  }, [obraSocial]);

  const factura = useMemo(
    () => facturas?.find((f) => f.id_prestaciones === elegida) ?? null,
    [facturas, elegida],
  );
  const abierta = factura?.estado === "A";
  const selectId = `exportar-${obraSocial}-periodo`;

  // Al cambiar de período se limpia el resultado anterior.
  useEffect(() => { setError(null); setHecho(null); }, [elegida]);

  const generar = async () => {
    if (!factura) return;
    setGenerando(true);
    setError(null);
    setHecho(null);
    try {
      const { blob } = await descargar(factura.id_prestaciones);
      const nombre = nombreArchivo(factura);
      await saveAs(blob, nombre);
      setHecho(`Se descargó ${nombre}.`);
    } catch (e) {
      setError(await mensajeDelError(e));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}><Icono size={22} /></span>
        <div>
          <h1 className={styles.title}>{titulo}</h1>
          <p className={styles.subtitle}>{subtitulo}</p>
        </div>
      </div>

      <div className={styles.card}>
        {errorCarga && <div className={styles.error}>{errorCarga}</div>}
        {!errorCarga && facturas === null && <p className={styles.muted}>Cargando períodos…</p>}
        {facturas !== null && facturas.length === 0 && <p className={styles.muted}>{sinFacturas}</p>}

        {facturas !== null && facturas.length > 0 && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor={selectId}>Período</label>
              <select
                id={selectId}
                className={styles.input}
                value={elegida}
                onChange={(e) => setElegida(Number(e.target.value))}
              >
                {facturas.map((f) => (
                  <option key={f.id_prestaciones} value={f.id_prestaciones}>
                    {f.periodo_label || f.periodo} · Exp. {f.id_prestaciones} · {f.estado === "A" ? "Abierto" : "Cerrado"}
                  </option>
                ))}
              </select>
            </div>

            {factura && (
              <div className={styles.resumen}>
                <span className={`${styles.chip} ${abierta ? styles.chipAbierta : styles.chipCerrada}`}>
                  {abierta ? "Abierto" : "Cerrado"}
                </span>
                <span className={`${styles.chip} ${styles.chipGris}`}>Período {factura.periodo}</span>
                {!abierta && factura.importe != null && <span>Total {formatMoney(factura.importe)}</span>}
              </div>
            )}

            {abierta && (
              <div className={styles.aviso}>
                El período sigue abierto: el archivo sale con las prestaciones de hoy y puede cambiar si se
                cargan o corrigen más antes del cierre.
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.acciones}>
              <BotonPlano type="button" className={styles.btn} disabled={!factura || generando} onClick={generar}>
                {generando ? <Cargando size={16} /> : <Download size={16} />}
                {generando ? "Generando…" : textoBoton}
              </BotonPlano>
              {hecho && <span className={styles.ok}>{hecho}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
