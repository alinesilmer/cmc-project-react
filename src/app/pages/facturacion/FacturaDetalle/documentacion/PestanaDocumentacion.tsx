import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";

import Button from "@/app/components/ui/Button/Button";
import { abrirVentanaPdf, mostrarPdf } from "@/app/shared/lib/abrirPdf";
import { descargarDocumentacionPdf } from "../../api";
import type { FacturaDetalleResponse } from "../../types";
import { opcionesDesdeVista } from "../export/types";
import type { PrestacionConSocio } from "../FilaPrestacion";
import type { VistaOpciones } from "../vista/types";
import styles from "./PestanaDocumentacion.module.scss";

interface Props {
  detalle: FacturaDetalleResponse;
  /** Todas las prestaciones de la factura (sin los filtros de la vista). */
  filas: PrestacionConSocio[];
  /** La vista del listado: el PDF sale con ese orden. */
  vista: VistaOpciones;
}

const entero = (n: number): string => n.toLocaleString("es-AR");

/** El mensaje de un error de descarga: con `responseType: blob` el JSON del servidor llega como Blob. */
async function mensajeDeErrorDeDescarga(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const detail = JSON.parse(await data.text())?.detail;
      if (typeof detail === "string") return detail;
      if (detail?.mensaje) return String(detail.mensaje);
    } catch {
      // no era JSON: sigue al mensaje genérico
    }
  }
  return (err as Error)?.message || "No se pudo generar el PDF.";
}

/** Pestaña «Documentación» de la factura: cuánto está listo y la exportación de todos los documentos en un PDF. */
export default function PestanaDocumentacion({ detalle, filas, vista }: Props) {
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cuenta = useMemo(() => {
    const exigen = filas.filter((p) => p.requiere_documentacion);
    const conDocs = (p: PrestacionConSocio) => (p.documentos_count ?? 0) > 0;
    return {
      llevan: exigen.length,
      listas: exigen.filter((p) => conDocs(p) && p.revisado).length,
      sinDocumentos: exigen.filter((p) => !conDocs(p)).length,
      sinAuditar: exigen.filter((p) => !p.revisado).length,
      conArchivos: filas.filter(conDocs).length,
    };
  }, [filas]);

  const pendientes = cuenta.sinDocumentos > 0 || cuenta.sinAuditar > 0;
  const nadaQueExportar = cuenta.conArchivos === 0;

  const exportar = async () => {
    setError(null);
    setGenerando(true);
    // El PDF se abre en una pestaña nueva, que tiene que abrirse acá, dentro del clic.
    const ventana = abrirVentanaPdf();
    try {
      // Sólo cuenta el orden de la vista: la documentación es la de toda la factura.
      const { blob, filename } = await descargarDocumentacionPdf(detalle.id_factura, opcionesDesdeVista(vista));
      await mostrarPdf(blob, ventana, filename ?? `documentacion_factura_${detalle.id_factura}.pdf`);
    } catch (e) {
      ventana?.close();
      setError(await mensajeDeErrorDeDescarga(e));
    } finally {
      setGenerando(false);
    }
  };

  const cards: { etiqueta: string; valor: number; clase?: string }[] = [
    { etiqueta: "Llevan documentación", valor: cuenta.llevan },
    { etiqueta: "Listas (con documentos y auditadas)", valor: cuenta.listas, clase: styles.ok },
    { etiqueta: "Sin documentos", valor: cuenta.sinDocumentos, clase: cuenta.sinDocumentos ? styles.alerta : undefined },
    { etiqueta: "Sin auditar", valor: cuenta.sinAuditar, clase: cuenta.sinAuditar ? styles.info : undefined },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.cards}>
        {cards.map((c) => (
          <div key={c.etiqueta} className={styles.card}>
            <span className={styles.etiqueta}>{c.etiqueta}</span>
            <span className={`${styles.valor} ${c.clase ?? ""}`}>{entero(c.valor)}</span>
          </div>
        ))}
      </div>

      <div className={styles.exportar}>
        <div className={styles.texto}>
          <strong>Exportar documentación</strong>
          <span>Un PDF con los médicos de la A a la Z y sus documentos en el orden del detalle.</span>
        </div>
        <div className={styles.boton}>
          <Button
            variant="primary"
            leftIcon={<FileDown size={18} aria-hidden="true" />}
            onClick={exportar}
            disabled={pendientes || nadaQueExportar || generando}
            isLoading={generando}
          >
            {generando ? "Generando…" : "Exportar PDF"}
          </Button>
          {pendientes && <span className={styles.aviso}>Se habilita cuando no quedan pendientes.</span>}
          {!pendientes && nadaQueExportar && <span className={styles.aviso}>Todavía no hay documentos cargados.</span>}
        </div>
      </div>

      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
