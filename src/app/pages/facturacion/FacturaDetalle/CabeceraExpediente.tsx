import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Copy, Download, FileCheck2, SlidersHorizontal,
} from "lucide-react";

import { formatMoney, parseMoney } from "../money";
import type { FacturaDetalleResponse } from "../types";
import { ORDEN_TIPOS } from "./vista/types";
import { RESUMEN_TIPO_LABEL } from "./totales";
import type { PrestacionConSocio } from "./FilaPrestacion";
import ExportarOsBoton from "./ExportarOsBoton";
import { usePeriodosVecinos } from "./usePeriodosVecinos";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import styles from "./CabeceraExpediente.module.scss";

// Alto de la barra compacta fija. La tabla (`.tablaEncabezado`) lo suma a su `top` para
// quedar pegada debajo de ella: el padre lo recibe en `onCompactaChange`.
export const ALTO_BARRA_COMPACTA = 56;
// El alto del topbar de la app (64px + su borde): la barra fija va debajo.
const ALTO_TOPBAR = 65;

const estadoChip = (estado: string | null | undefined) => (estado === "A" ? styles.chipAbierta : styles.chipCerrada);
const estadoLabel = (estado: string | null | undefined) =>
  estado === "A" ? "Abierta" : estado === "C" ? "Cerrada" : estado || "—";

const entero = (n: number): string => n.toLocaleString("es-AR");

interface Props {
  detalle: FacturaDetalleResponse | null;
  /** Todas las prestaciones de la factura (sin los filtros de la vista). */
  filas: PrestacionConSocio[];
  onVista: () => void;
  onExportar: () => void;
  onVolver: () => void;
  /** Abre otra factura de la misma obra social (período anterior o siguiente). */
  onIrAFactura: (idFactura: number) => void;
  /** Avisa cuando la barra compacta aparece o desaparece. */
  onCompactaChange: (compacta: boolean) => void;
}

export default function CabeceraExpediente({
  detalle, filas, onVista, onExportar, onVolver, onIrAFactura, onCompactaChange,
}: Props) {
  const cabeceraRef = useRef<HTMLDivElement>(null);
  const [compacta, setCompacta] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const { anterior, siguiente } = usePeriodosVecinos(detalle?.cod_obra, detalle?.periodo);

  // La barra compacta aparece cuando la cabecera completa se fue por arriba (debajo del
  // topbar), no cuando todavía no se llegó a ella.
  useEffect(() => {
    const el = cabeceraRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([e]) => setCompacta(!e.isIntersecting && e.boundingClientRect.top < ALTO_TOPBAR),
      { rootMargin: `-${ALTO_TOPBAR}px 0px 0px 0px` },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [detalle]);

  useEffect(() => { onCompactaChange(compacta); }, [compacta, onCompactaChange]);

  // Cantidades en unidades facturadas (cantidad × sesión), como el total de prestaciones.
  const stats = useMemo(() => {
    const unidades = (p: PrestacionConSocio) => (p.cantidad || 1) * (p.sesion || 1);
    const porTipo = new Map<string, number>();
    let revisadas = 0;
    let total = 0;
    let coseguro = 0;
    for (const p of filas) {
      const u = unidades(p);
      total += u;
      if (p.revisado) revisadas += u;
      if (p.tipo) porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + u);
      coseguro += parseMoney(p.coseguro) * u;
    }
    return {
      total, revisadas, coseguro,
      porcentaje: total > 0 ? Math.round((revisadas / total) * 100) : 0,
      porTipo: ORDEN_TIPOS.map((tipo) => ({ tipo, cantidad: porTipo.get(tipo) ?? 0 })).filter((t) => t.cantidad > 0),
    };
  }, [filas]);

  // Documentación digital: «Total a facturar» suma sólo lo auditado y la «Proyección» todo. Se calcula de las
  // filas (no del detalle del servidor) para que tildar «Auditado» actualice las cards al instante.
  const conDocumentacion = !!detalle?.documentacion_digital;
  const doc = useMemo(() => {
    let proyectado = 0;
    let auditado = 0;
    let auditadas = 0;
    let requieren = 0;
    let conDocs = 0;
    for (const p of filas) {
      const monto = parseMoney(p.subtotal);
      proyectado += monto;
      if (p.revisado) { auditado += monto; auditadas += 1; }
      if (p.requiere_documentacion) {
        requieren += 1;
        if ((p.documentos_count ?? 0) > 0) conDocs += 1;
      }
    }
    return { proyectado, auditado, sinAuditar: filas.length - auditadas, requieren, conDocs };
  }, [filas]);
  const totalMostrado = conDocumentacion ? doc.auditado : parseMoney(detalle?.total_importe);
  const abierta = detalle?.estado === "A";

  const copiar = async () => {
    if (!detalle) return;
    try {
      await navigator.clipboard.writeText(String(detalle.id_factura));
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1500);
    } catch { /* sin permiso de portapapeles */ }
  };

  const botones = (
    <>
      <button type="button" className={styles.btn} onClick={onVista} disabled={!detalle}>
        <SlidersHorizontal size={15} /> Vista
      </button>
      <button type="button" className={`${styles.btn} ${styles.btnPrimario}`} onClick={onExportar} disabled={!detalle}>
        <Download size={15} /> Exportar
      </button>
      <ExportarOsBoton detalle={detalle} />
    </>
  );

  if (!detalle) {
    return (
      <div className={styles.simple}>
        <h1 className={styles.tituloSimple}>Listado de prestaciones</h1>
        <BackButton onClick={onVolver} />
      </div>
    );
  }

  const nombreOs = detalle.nombre_obra_social || `Obra social ${detalle.cod_obra}`;
  const complemento = (detalle.version ?? 1) > 1;

  return (
    <>
      <div className={styles.migas}>
        <nav className={styles.ruta} aria-label="Ubicación">
          <span>Facturación</span><span>›</span>
          <button type="button" className={styles.rutaLink} onClick={onVolver}>Períodos</button><span>›</span>
          <strong>Expediente {detalle.id_factura}</strong>
        </nav>
        <div className={styles.acciones}>
          {botones}
          <BackButton onClick={onVolver} />
        </div>
      </div>

      <div className={styles.tarjeta} ref={cabeceraRef}>
        <div className={styles.principal}>
          <span className={styles.icono}><FileCheck2 size={26} /></span>
          <div className={styles.expediente}>
            <span className={styles.etiquetaChica}>Expediente</span>
            <div className={styles.numeroFila}>
              <span className={styles.numero}>N.º {detalle.id_factura}</span>
              <button type="button" className={styles.copiar} onClick={copiar} aria-label="Copiar número de expediente">
                {copiado ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <span className={styles.separador} aria-hidden="true" />
          <div className={`${styles.bloque} ${styles.bloqueOs}`}>
            <span className={styles.etiquetaChica}>Obra social</span>
            <span className={styles.valorGrande}>
              {nombreOs} <span className={styles.valorNro}>({detalle.cod_obra})</span>
            </span>
          </div>
          <span className={styles.separador} aria-hidden="true" />
          <div className={styles.bloque}>
            <span className={styles.etiquetaChica}>Período</span>
            <div className={styles.periodoFila}>
              <button
                type="button" className={styles.flecha} disabled={!anterior}
                onClick={() => anterior && onIrAFactura(anterior.idFactura)}
                aria-label={anterior ? `Período anterior: ${anterior.label}` : "No hay un período anterior"}
                title={anterior ? anterior.label : undefined}
              >
                <ChevronLeft size={18} />
              </button>
              <span className={styles.valorGrande}>{detalle.periodo_label || detalle.periodo}</span>
              <button
                type="button" className={styles.flecha} disabled={!siguiente}
                onClick={() => siguiente && onIrAFactura(siguiente.idFactura)}
                aria-label={siguiente ? `Período siguiente: ${siguiente.label}` : "No hay un período siguiente"}
                title={siguiente ? siguiente.label : undefined}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className={styles.estados}>
            <span className={`${styles.chip} ${styles.chipGris}`}>
              {complemento ? `Complemento (versión ${detalle.version})` : "Factura original"}
            </span>
            <div className={styles.estadoFila}>
              <span className={styles.estadoDe}>Colegio</span>
              <span className={`${styles.chip} ${estadoChip(detalle.estado)}`}>{estadoLabel(detalle.estado)}</span>
            </div>
            <div className={styles.estadoFila}>
              <span className={styles.estadoDe}>Médicos</span>
              <span className={`${styles.chip} ${estadoChip(detalle.estado_doctor)}`}>{estadoLabel(detalle.estado_doctor)}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.stats} ${conDocumentacion ? styles.statsDoc : ""}`}>
          <div className={styles.stat}>
            <span className={styles.statEtiqueta}>Prestaciones</span>
            <span className={styles.statValor}>{entero(detalle.total_prestaciones)}</span>
            <span className={styles.statNota}>de {detalle.prestadores.length} médico{detalle.prestadores.length !== 1 ? "s" : ""}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statEtiqueta}>Revisadas</span>
            <span className={styles.statValor}>
              {entero(stats.revisadas)} <span className={styles.statDe}>/ {entero(stats.total)}</span>
            </span>
            <div className={styles.barra} role="progressbar" aria-valuenow={stats.porcentaje} aria-valuemin={0} aria-valuemax={100}>
              <div className={styles.barraRelleno} style={{ width: `${stats.porcentaje}%` }} />
            </div>
          </div>
          {conDocumentacion && (
            <div className={styles.stat}>
              <span className={styles.statEtiqueta}>Con documentación</span>
              <span className={styles.statValor}>
                {entero(doc.conDocs)} <span className={styles.statDe}>/ {entero(doc.requieren)}</span>
              </span>
              <span className={styles.statNota}>prestaciones que la requieren</span>
            </div>
          )}
          <div className={styles.stat}>
            <span className={styles.statEtiqueta}>Por tipo</span>
            <div className={styles.tipos}>
              {stats.porTipo.length === 0 && <span className={styles.statNota}>—</span>}
              {stats.porTipo.map((t) => (
                <div key={t.tipo} className={styles.tipoFila}>
                  <span>{RESUMEN_TIPO_LABEL[t.tipo]}</span><strong>{entero(t.cantidad)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.stat}>
            <span className={styles.statEtiqueta}>Coseguro</span>
            <span className={styles.statValor}>{formatMoney(stats.coseguro)}</span>
            <span className={styles.statNota}>ya descontado del total</span>
          </div>
          {conDocumentacion && (
            <div className={styles.stat}>
              <span className={styles.statEtiqueta}>Proyección a facturar</span>
              <span className={styles.statValor}>{formatMoney(doc.proyectado)}</span>
              <span className={styles.statNota}>auditadas y sin auditar</span>
            </div>
          )}
          <div className={`${styles.stat} ${styles.statTotal}`}>
            <span className={styles.statEtiqueta}>Total a facturar</span>
            <span className={`${styles.statValor} ${styles.statValorTotal}`}>{formatMoney(totalMostrado)}</span>
            <span className={styles.statNota}>
              {conDocumentacion
                ? `solo las ${entero(filas.length - doc.sinAuditar)} auditadas`
                : `suma de las ${entero(detalle.total_prestaciones)} prestaciones`}
            </span>
          </div>
        </div>

        {conDocumentacion && abierta && doc.sinAuditar > 0 && (
          <div className={styles.alertaCierre} role="alert">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              <strong>No se puede cerrar esta factura:</strong> hay {entero(doc.sinAuditar)} prestaci{doc.sinAuditar === 1 ? "ón" : "ones"} sin
              auditar. El «Total a facturar» suma solo las auditadas; la «Proyección» suma todas.
            </span>
          </div>
        )}
      </div>

      {compacta && (
        <div className={styles.compacta} style={{ top: ALTO_TOPBAR, height: ALTO_BARRA_COMPACTA }} role="region" aria-label="Resumen del expediente">
          <span className={styles.compactaIcono}><FileCheck2 size={18} /></span>
          <strong className={styles.compactaNumero}>Exp. N.º {detalle.id_factura}</strong>
          <span className={styles.compactaOs} title={nombreOs}>{nombreOs}</span>
          <span className={`${styles.chip} ${styles.chipOs}`}>OS {detalle.cod_obra}</span>
          <span className={`${styles.chip} ${styles.chipGris}`}>{detalle.periodo_label || detalle.periodo}</span>
          <span className={`${styles.chip} ${estadoChip(detalle.estado)}`}>{estadoLabel(detalle.estado)}</span>
          <span className={styles.compactaCant}>{entero(detalle.total_prestaciones)} prestaciones</span>
          <span className={`${styles.chip} ${styles.chipTotal} ${styles.compactaTotal}`}>Total {formatMoney(totalMostrado)}</span>
          {botones}
          <button
            type="button" className={`${styles.btn} ${styles.btnIcono}`} aria-label="Ir al encabezado completo"
            onClick={() => cabeceraRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          >
            <ChevronDown size={15} />
          </button>
        </div>
      )}
    </>
  );
}
