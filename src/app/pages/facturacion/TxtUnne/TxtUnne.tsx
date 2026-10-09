import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { descargarTxtUnne, listarFacturas } from "../api";
import type { FacturaRead } from "../types";
import { formatMoney } from "../money";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import styles from "./TxtUnne.module.scss";

const OBRA_SOCIAL_UNNE = "81";

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

/**
 * Herramientas → "TXT UNNE".
 *
 * Arma el archivo de facturación de UNNE (obra social 81) de una de sus facturas. El tipo y el
 * número de factura van en cada línea: salen de la cabecera y, si la factura todavía no está
 * numerada (período abierto), se completan acá.
 */
export default function TxtUnne() {
  const [facturas, setFacturas] = useState<FacturaRead[] | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [elegida, setElegida] = useState<number | "">("");
  const [tipo, setTipo] = useState("");
  const [nro, setNro] = useState("");
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    listarFacturas({ cod_obra: OBRA_SOCIAL_UNNE, solo_complementos: false, limit: 36 })
      .then(({ data }) => {
        if (!activo) return;
        setFacturas(data);
        if (data.length > 0) setElegida(data[0].id_prestaciones);
      })
      .catch((e) => { if (activo) setErrorCarga(mensajeDeError(e, "No se pudieron cargar las facturas.")); });
    return () => { activo = false; };
  }, []);

  const factura = useMemo(
    () => facturas?.find((f) => f.id_prestaciones === elegida) ?? null,
    [facturas, elegida],
  );
  const numerada = Boolean(factura?.tipo_factura && factura?.nro_factura);
  const abierta = factura?.estado === "A";

  // Al cambiar de factura se limpia lo escrito a mano y el resultado anterior.
  useEffect(() => { setTipo(""); setNro(""); setError(null); setHecho(null); }, [elegida]);

  const puedeGenerar = Boolean(factura) && !generando && (numerada || (tipo.trim() !== "" && nro.trim() !== ""));

  const generar = async () => {
    if (!factura) return;
    setGenerando(true);
    setError(null);
    setHecho(null);
    try {
      const { blob } = await descargarTxtUnne(
        factura.id_prestaciones,
        numerada ? {} : { tipo: tipo.trim().toUpperCase(), nro_factura: nro.trim() },
      );
      const nombre = `${factura.periodo}_${OBRA_SOCIAL_UNNE}.txt`;
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
        <span className={styles.headerIcon}><FileText size={22} /></span>
        <div>
          <h1 className={styles.title}>TXT UNNE</h1>
          <p className={styles.subtitle}>Archivo de facturación de UNNE (obra social 81) por factura.</p>
        </div>
      </div>

      <div className={styles.card}>
        {errorCarga && <div className={styles.error}>{errorCarga}</div>}
        {!errorCarga && facturas === null && <p className={styles.muted}>Cargando facturas…</p>}
        {facturas !== null && facturas.length === 0 && (
          <p className={styles.muted}>UNNE todavía no tiene facturas.</p>
        )}

        {facturas !== null && facturas.length > 0 && (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="txt-unne-factura">Factura</label>
              <select
                id="txt-unne-factura"
                className={styles.input}
                value={elegida}
                onChange={(e) => setElegida(Number(e.target.value))}
              >
                {facturas.map((f) => (
                  <option key={f.id_prestaciones} value={f.id_prestaciones}>
                    {f.periodo_label || f.periodo} · Exp. {f.id_prestaciones} · {f.estado === "A" ? "Abierta" : "Cerrada"}
                  </option>
                ))}
              </select>
            </div>

            {factura && (
              <div className={styles.resumen}>
                <span className={`${styles.chip} ${abierta ? styles.chipAbierta : styles.chipCerrada}`}>
                  {abierta ? "Abierta" : "Cerrada"}
                </span>
                <span className={`${styles.chip} ${styles.chipGris}`}>Período {factura.periodo}</span>
                <span className={`${styles.chip} ${styles.chipGris}`}>
                  {numerada ? `Factura ${factura.tipo_factura} ${factura.nro_factura}` : "Sin número de factura"}
                </span>
                {!abierta && factura.importe != null && <span>Total {formatMoney(factura.importe)}</span>}
              </div>
            )}

            {factura && !numerada && (
              <div className={styles.field}>
                <span className={styles.label}>Tipo y número de factura (van en cada línea del archivo)</span>
                <div className={styles.row}>
                  <input
                    className={styles.input}
                    value={tipo}
                    maxLength={1}
                    placeholder="B"
                    aria-label="Tipo de factura"
                    onChange={(e) => setTipo(e.target.value.toUpperCase())}
                  />
                  <input
                    className={styles.input}
                    value={nro}
                    maxLength={14}
                    placeholder="00031-00005130"
                    aria-label="Número de factura"
                    onChange={(e) => setNro(e.target.value)}
                  />
                </div>
              </div>
            )}

            {abierta && (
              <div className={styles.aviso}>
                La factura sigue abierta: el archivo sale con las prestaciones de hoy y puede cambiar si se
                cargan o corrigen más antes del cierre.
              </div>
            )}

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.acciones}>
              <button type="button" className={styles.btn} disabled={!puedeGenerar} onClick={generar}>
                {generando ? <Loader2 size={16} className={styles.girando} /> : <Download size={16} />}
                {generando ? "Generando…" : "Descargar TXT"}
              </button>
              {hecho && <span className={styles.ok}>{hecho}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
