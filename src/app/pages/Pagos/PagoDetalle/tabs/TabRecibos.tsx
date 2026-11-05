import React, { useCallback, useEffect, useRef, useState } from "react";
import { borrarRecibos, generarRecibos, listarRecibos } from "@/app/pages/Pagos/pagos.api";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import Button from "@/app/components/ui/Button/Button";
import SelectableTable from "@/app/components/ui/SelectableTable/SelectableTable";
import type { ColumnDef } from "@/app/components/ui/SelectableTable/types";
import lq from "../../Liquidacion.module.scss";
import MenuImprimir from "./MenuImprimir";
import styles from "./tabs.module.scss";
import { type Pago, fmt } from "../../types";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import Dialogo from "@/app/components/ui/Dialogo/Dialogo";
import paleta from "@/app/styles/paleta.module.scss";
import { comoErrorApi, detalleDeError } from "@/app/shared/lib/httpErrors";
import { CMC_LOGO_SRC, fetchAsDataUrl } from "@/app/shared/lib/documentos/institucion";
import { generarReciboPdf, type DetalleJson } from "../../pdf/reciboPdf";
import { generarTotalesRecibosPdf, type TipoTotales } from "../../pdf/totalesRecibosPdf";

// ── Tipos ─────────────────────────────────────────────────────────

type ReciboRow = {
  id: number;
  nro_recibo: string;
  pago_id: number;
  medico_id: number;
  pago_medico_id?: number;
  total_neto: string | number;
  emision_timestamp: string | null;
  estado: "en_revision" | "liquidado" | "emitido" | string;
  detalle_json?: DetalleJson;
};

// ── Helpers ───────────────────────────────────────────────────────

const ESTADO_LABEL: Record<string, string> = {
  en_revision: "En revisión",
  liquidado: "Liquidado",
  emitido: "Emitido",
};

// El recibo no lleva número (lo pidió el Colegio): se lo nombra por el socio.
const nombreSocio = (r: ReciboRow) => r.detalle_json?.info_medico?.nombre ?? `Médico #${r.medico_id}`;

const estadoClass = (e: string) => {
  if (e === "emitido")    return styles.reciboEmitido;
  if (e === "liquidado")  return styles.medicoLiquidado;
  if (e === "en_revision") return styles.medicoPendiente;
  return "";
};

const ESTADO_OPTIONS = [
  { value: "",            label: "Todos" },
  { value: "en_revision", label: "En revisión" },
  { value: "liquidado",   label: "Liquidado" },
  { value: "emitido",     label: "Emitido" },
];

// ── Componente ────────────────────────────────────────────────────

type Props = { pago: Pago; pagoId: number };

const TabRecibos: React.FC<Props> = ({ pago, pagoId }) => {
  const notify = useAppSnackbar();

  const [rows, setRows] = useState<ReciboRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState("");

  // El logo se baja una sola vez: la segunda impresión ya lo tiene.
  const logoRef = useRef<ReturnType<typeof fetchAsDataUrl> | null>(null);
  const obtenerLogo = () => (logoRef.current ??= fetchAsDataUrl(CMC_LOGO_SRC));

  // Modal generar/actualizar
  const [generarOpen, setGenerarOpen]   = useState(false);
  const [generando, setGenerando]       = useState(false);
  const [generarResult, setGenerarResult] = useState<number | null>(null);
  const [generarError, setGenerarError] = useState<string | null>(null);


  // Modal eliminar
  const [deleteTarget, setDeleteTarget] = useState<ReciboRow | null>(null);
  const [deleting, setDeleting]         = useState(false);

  // ── Carga ──

  const loadData = useCallback(async (estado: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listarRecibos<ReciboRow>(pagoId, estado);
      setRows(data ?? []);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(err?.message || "No se pudieron cargar los recibos.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => { loadData(estadoFiltro); }, [loadData, estadoFiltro]);

  // ── Acciones ──

  const handleGenerar = async () => {
    setGenerando(true);
    setGenerarError(null);
    try {
      const result = await generarRecibos<ReciboRow[]>(pagoId);
      setGenerarResult(Array.isArray(result) ? result.length : 0);
      await loadData(estadoFiltro);
    } catch (e) {
      setGenerarError(detalleDeError(e, "Error al generar."));
    } finally {
      setGenerando(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await borrarRecibos(pagoId, { recibo_ids: [deleteTarget.id] });
      notify(`Recibo de ${nombreSocio(deleteTarget)} eliminado.`);
      setDeleteTarget(null);
      await loadData(estadoFiltro);
    } catch (e) {
      const err = comoErrorApi(e);
      const datos = err.response?.data;
      if (datos?.reason === "recibos_pagados") {
        notify("No se pueden eliminar recibos en estado 'pagado'.", "error");
      } else {
        notify(typeof datos?.message === "string" ? datos.message : detalleDeError(e, "Error al eliminar."), "error");
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  // ── PDF ──

  const generatePDF = async (recibo: ReciboRow) => {
    const logo = await obtenerLogo();
    const doc = await generarReciboPdf(recibo, pago, logo);
    doc.save(`recibo_pago${pagoId}_socio${recibo.detalle_json?.info_medico?.nro_socio ?? recibo.medico_id}.pdf`);
  };

  // Totales de los recibos que se ven en la lista (respeta el filtro de estado).
  // La librería de PDF y el logo se adelantan cuando el navegador está ocioso, al abrir la pestaña: así elegir una
  // opción no espera nada y, al pasar el mouse, el menú no compite con la carga (esa carga es pesada).
  useEffect(() => {
    const precargar = () => {
      void obtenerLogo();
      void import("jspdf");
      void import("jspdf-autotable");
    };
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(precargar, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(precargar, 1500);
    return () => window.clearTimeout(id);
  }, []);

  const imprimirTotales = async (tipo: TipoTotales) => {
    try {
      // Se cede el turno para que «Generando…» se pinte antes de armar un PDF largo.
      await new Promise((r) => setTimeout(r, 30));
      const logo = await obtenerLogo();
      const filtro = estadoFiltro ? ESTADO_LABEL[estadoFiltro] ?? estadoFiltro : undefined;
      const doc = await generarTotalesRecibosPdf(rows, tipo, pago, logo, filtro);
      doc.save(`totales_${tipo}_pago${pagoId}.pdf`);
    } catch (e) {
      notify(detalleDeError(e, "No se pudo generar el PDF."), "error");
    }
  };

  // ── Columnas ──

  const columns: ColumnDef<ReciboRow>[] = [
    {
      key: "medico_id",
      header: "Socio",
      render: (r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{nombreSocio(r)}</div>
          {r.detalle_json?.info_medico?.nro_socio != null && (
            <div style={{ fontSize: 11, color: paleta.gray400 }}>Socio #{r.detalle_json.info_medico.nro_socio}</div>
          )}
        </div>
      ),
    },
    {
      key: "total_neto",
      header: "Neto",
      alignRight: true,
      render: (r) => `$${fmt(r.total_neto)}`,
    },
    {
      key: "emision_timestamp",
      header: "Fecha Emisión",
      // Sólo un recibo emitido tiene fecha de emisión (los viejos traían la del cierre o la del recálculo).
      render: (r) => r.emision_timestamp && (r.estado === "emitido" || r.estado === "pagado")
        ? new Date(r.emision_timestamp).toLocaleDateString("es-AR")
        : "—",
    },
    {
      key: "estado",
      header: "Estado",
      render: (r) => (
        <span className={`${styles.badge} ${estadoClass(r.estado)}`}>
          {ESTADO_LABEL[r.estado] ?? r.estado}
        </span>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (r) => (
        <div className={styles.rowActions}>
          {r.estado !== "emitido" && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
            >
              Eliminar
            </Button>
          )}
          <BotonDescarga formato="pdf" onClick={(e) => { e.stopPropagation(); return generatePDF(r); }} />
        </div>
      ),
    },
  ];

  // ── Render ──

  return (
    <div className={styles.tabWrap}>
      <div className={styles.toolbarFiltro}>
        <label className={lq.campo}>
          <span className={lq.rotulo}>Estado</span>
          <select
            className={lq.select}
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            disabled={loading}
          >
            {ESTADO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <div className={styles.toolbarLeft}>
          {/* Sólo con el pago abierto: al cerrarlo los recibos ya quedan generados y un pago cerrado no se recalcula. */}
          {pago.estado === "A" && (
            <Button
              variant="secondary"
              onClick={() => { setGenerarResult(null); setGenerarError(null); setGenerarOpen(true); }}
            >
              Generar / Actualizar
            </Button>
          )}
          <MenuImprimir deshabilitado={loading || rows.length === 0} onElegir={imprimirTotales} />
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <SelectableTable
        rows={rows}
        columns={columns}
        actions={[]}
        emptyMessage={pago.estado === "A" ? "No hay recibos. Usá 'Generar / Actualizar' para crear los recibos del pago." : "Este pago no tiene recibos."}
        loading={loading}
      />

      {/* Modal generar/actualizar */}
      {generarOpen && (
        <Dialogo
          titulo="Generar o actualizar recibos"
          onClose={() => { setGenerarOpen(false); setGenerarResult(null); setGenerarError(null); }}
          acciones={
            <>
              <Button
                variant="secondary"
                onClick={() => { setGenerarOpen(false); setGenerarResult(null); setGenerarError(null); }}
                disabled={generando}
              >
                {generarResult != null ? "Cerrar" : "Cancelar"}
              </Button>
              {generarResult == null && (
                <Button variant="primary" onClick={handleGenerar} disabled={generando}>
                  {generando ? "Generando…" : "Generar"}
                </Button>
              )}
            </>
          }
        >
              {generarError && <div className={styles.errorInline}>{generarError}</div>}
              {generarResult != null ? (
                <div className={styles.successInline}>
                  Listo. Se generaron / actualizaron <strong>{generarResult}</strong> recibos.
                </div>
              ) : !generando && (
                <p>
                  Se generarán o actualizarán los recibos para todos los médicos del pago.
                  <br />
                  <span style={{ fontSize: 12, color: paleta.gray500 }}>
                    Esta operación es idempotente — si ya existen, se actualizan.
                  </span>
                </p>
              )}
              {generando && <p style={{ color: paleta.gray500 }}>Generando… por favor esperá.</p>}
            </Dialogo>
      )}

      {/* Modal eliminar */}
      {deleteTarget && (
        <Dialogo
          titulo="Eliminar recibo"
          peligro
          onClose={(deleting) ? undefined : () => setDeleteTarget(null)}
          acciones={
            <>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Eliminando…" : "Eliminar"}
              </Button>
            </>
          }
        >
              <p>
                ¿Eliminar el recibo de <strong>{nombreSocio(deleteTarget)}</strong>?
                <br />
                <span style={{ fontSize: 12, color: paleta.gray500 }}>Esta acción no se puede deshacer.</span>
              </p>
            </Dialogo>
      )}
    </div>
  );
};

export default TabRecibos;
