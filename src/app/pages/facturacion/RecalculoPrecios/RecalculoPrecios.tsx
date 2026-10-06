import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Calculator, Eye, Loader2, RefreshCw } from "lucide-react";

import { useAppSnackbar } from "../../../hooks/useAppSnackbar";
import { fetchPeriodoActivo, previewCierre, recalcularPrecios } from "../api";
import type { CierrePreviewResponse, ObraSocialOption, RecalculoFila, RecalculoResponse } from "../types";
import { mensajeDeError } from "@/app/shared/lib/httpErrors";
import { formatMoney, parseMoney } from "../money";
import ObraSocialAutocomplete from "../components/ObraSocialAutocomplete";
import ConfirmActionModal from "../components/ConfirmActionModal";
import base from "../CierrePeriodo/CierrePeriodo.module.scss";
import styles from "./RecalculoPrecios.module.scss";
import { ListaOmitidas, TablaCambios } from "./TablaCambios";

/**
 * Recálculo de precios de una factura abierta (O.S. + período), o de un código
 * de ella. Recotiza las prestaciones automáticas con el precio vigente a la
 * fecha de cada práctica (sin fecha: hoy) y la especialidad del médico, y
 * guarda el total con la misma fórmula que tenía cada fila. Las manuales, las
 * que no tienen precio y las que darían $0 quedan como están.
 *
 * Primero se previsualiza (no graba) y recién después se aplica.
 */

/** Las filas de un mismo equipo juntas, en el orden en que aparece cada equipo. */
function agruparPorEquipo(filas: RecalculoFila[]): RecalculoFila[] {
  const orden: number[] = [];
  const grupos = new Map<number, RecalculoFila[]>();
  for (const f of filas) {
    const clave = f.grupo_equipo_id ?? -f.id;
    if (!grupos.has(clave)) {
      grupos.set(clave, []);
      orden.push(clave);
    }
    grupos.get(clave)!.push(f);
  }
  return orden.flatMap((k) => grupos.get(k)!);
}

const RecalculoPrecios: React.FC = () => {
  const navigate = useNavigate();
  const notify = useAppSnackbar();

  const [obraSocial, setObraSocial] = useState<ObraSocialOption | null>(null);
  const [periodo, setPeriodo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [factura, setFactura] = useState<CierrePreviewResponse | null>(null);
  const [facturaError, setFacturaError] = useState<string | null>(null);

  const [resultado, setResultado] = useState<RecalculoResponse | null>(null);
  const [trabajando, setTrabajando] = useState<"previa" | "aplicar" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Período activo al elegir la O.S. (como en Cierre).
  useEffect(() => {
    if (!obraSocial) return;
    (async () => {
      try {
        const p = await fetchPeriodoActivo(String(obraSocial.nro_obra_social));
        setPeriodo(p.periodo);
      } catch {
        setPeriodo("");
      }
    })();
  }, [obraSocial]);

  // Lo que se ve cambia con la O.S., el período o el código: la vista previa vieja ya no vale.
  useEffect(() => {
    setResultado(null);
    setError(null);
  }, [obraSocial, periodo, codigo]);

  // Contexto de la factura (cantidad, total, abierta/cerrada) sin backend nuevo.
  useEffect(() => {
    if (!obraSocial || periodo.length !== 6) {
      setFactura(null);
      setFacturaError(null);
      return;
    }
    let vigente = true;
    (async () => {
      try {
        const data = await previewCierre(String(obraSocial.nro_obra_social), periodo);
        if (vigente) {
          setFactura(data);
          setFacturaError(null);
        }
      } catch (e) {
        if (vigente) {
          setFactura(null);
          setFacturaError(mensajeDeError(e, "No se pudo leer la factura."));
        }
      }
    })();
    return () => {
      vigente = false;
    };
  }, [obraSocial, periodo]);

  const correr = async (dryRun: boolean) => {
    if (!obraSocial || periodo.length !== 6) return;
    setTrabajando(dryRun ? "previa" : "aplicar");
    setError(null);
    try {
      const r = await recalcularPrecios({
        cod_obra: String(obraSocial.nro_obra_social),
        periodo,
        codigo: codigo.trim() || null,
        dry_run: dryRun,
      });
      setResultado(r);
      if (!dryRun) {
        setConfirmOpen(false);
        notify(`${r.cambian} prestación${r.cambian === 1 ? "" : "es"} recalculada${r.cambian === 1 ? "" : "s"}.`);
        // El total de la factura cambió: se refresca el contexto.
        setFactura(await previewCierre(String(obraSocial.nro_obra_social), periodo));
      }
    } catch (e) {
      setError(mensajeDeError(e, "No se pudo recalcular."));
      if (!dryRun) setConfirmOpen(false);
    } finally {
      setTrabajando(null);
    }
  };

  const filasOrdenadas = useMemo(
    () => (resultado ? agruparPorEquipo(resultado.filas) : []),
    [resultado]
  );

  const cerrada = factura?.cerrado ?? false;
  const listo = !!obraSocial && periodo.length === 6 && !cerrada && !trabajando;
  const puedeAplicar = !!resultado && resultado.dry_run && resultado.cambian > 0 && listo;
  const diferencia = resultado ? parseMoney(resultado.diferencia) : 0;

  return (
    <div className={base.container}>
      <div className={base.header}>
        <span className={base.headerIcon}>
          <Calculator size={22} />
        </span>
        <div>
          <h1 className={base.title}>Recalcular precios</h1>
          <p className={base.subtitle}>
            Recotiza las prestaciones automáticas de una factura abierta con el precio vigente.
          </p>
        </div>
        <div className={base.headerRight}>
          <button type="button" className={base.backBtn} onClick={() => navigate("/panel/facturacion/periodos")}>
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </div>

      <motion.div
        className={`${base.layout} ${styles.anchoCompleto}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`${base.section} ${styles.relativo}`}>
          <span className={base.sectionTitle}>Factura</span>
          <div className={base.fieldsRow}>
            <div className={base.filterField}>
              <label className={base.filterLabel}>Obra social</label>
              <ObraSocialAutocomplete
                value={obraSocial?.nro_obra_social ?? null}
                onChange={(_, os) => setObraSocial(os)}
                disabled={!!trabajando}
              />
            </div>
            <div className={base.filterField}>
              <label className={base.filterLabel}>Período (YYYYMM)</label>
              <input
                className={base.input}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej. 202609"
                disabled={!obraSocial || !!trabajando}
              />
            </div>
            <div className={base.filterField}>
              <label className={base.filterLabel}>Código (opcional)</label>
              <input
                className={base.input}
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.trim())}
                placeholder="Vacío = todas las prestaciones"
                disabled={!obraSocial || !!trabajando}
              />
            </div>
          </div>

          {facturaError && <div className={base.errorBox}>{facturaError}</div>}
          {factura && (
            <div className={base.previewRow}>
              <span className={`${base.infoChip} ${base.chipNeutral}`}>
                {factura.cantidad} prestación{factura.cantidad !== 1 ? "es" : ""}
              </span>
              <span className={`${base.infoChip} ${base.chipTotal}`}>Total: {formatMoney(factura.importe_total)}</span>
              <span className={`${base.infoChip} ${cerrada ? base.chipCerrada : base.chipAbierta}`}>
                {cerrada ? "Cerrada" : "Abierta"}
              </span>
            </div>
          )}
          {cerrada && (
            <p className={base.mutedText}>
              La factura de este período ya está cerrada: sus precios no se pueden recalcular.
            </p>
          )}

          <p className={base.mutedText}>
            Se usa la fecha de cada práctica (sin fecha, la de hoy) y la especialidad principal del médico.
            Se respeta cantidad, sesión, porcentaje y coseguro, y el total se guarda con la misma fórmula
            que ya tenía cada prestación. Las manuales, las que no tienen precio y las que darían $0 no se tocan.
          </p>

          {trabajando && (
            <div className={styles.cargando}>
              <Loader2 size={22} className={styles.spin} />
              <span>
                {trabajando === "previa"
                  ? "Calculando la vista previa… puede tardar en facturas grandes."
                  : `Recalculando ${resultado?.cambian ?? ""} prestaciones… no cierres esta pantalla.`}
              </span>
            </div>
          )}
        </div>

        {error && <div className={base.errorBox}>{error}</div>}

        {resultado && (
          <div className={base.section}>
            <span className={base.sectionTitle}>
              {resultado.dry_run ? "Vista previa (no se grabó nada)" : "Resultado"}
              {resultado.codigo ? ` · código ${resultado.codigo}` : ""}
            </span>
            <div className={base.previewRow}>
              <span className={`${base.infoChip} ${base.chipNeutral}`}>
                {resultado.cambian} {resultado.dry_run ? "cambian" : "recalculadas"}
              </span>
              <span className={`${base.infoChip} ${styles.chipGris}`}>{resultado.sin_cambios} sin cambios</span>
              <span className={`${base.infoChip} ${base.chipAbierta}`}>{resultado.omitidas} no se tocan</span>
              <span className={`${base.infoChip} ${styles.chipGris}`}>
                {formatMoney(resultado.importe_antes)} → {formatMoney(resultado.importe_despues)}
              </span>
              <span className={`${base.infoChip} ${diferencia < 0 ? styles.chipBaja : styles.chipSube}`}>
                Diferencia: {diferencia > 0 ? "+" : ""}{formatMoney(resultado.diferencia)}
              </span>
              {resultado.publicadas_afectadas > 0 && (
                <span className={`${base.infoChip} ${base.chipAbierta}`}>
                  {resultado.publicadas_afectadas} ya publicadas al médico
                </span>
              )}
            </div>

            {filasOrdenadas.length > 0 && <TablaCambios filas={filasOrdenadas} />}
            {resultado.omitidas_detalle.length > 0 && <ListaOmitidas omitidas={resultado.omitidas_detalle} />}
          </div>
        )}

        <div className={base.formFooter}>
          <button type="button" className={base.btnGhost} onClick={() => void correr(true)} disabled={!listo}>
            <Eye size={15} /> {trabajando === "previa" ? "Calculando…" : "Previsualizar"}
          </button>
          <button
            type="button"
            className={base.btnDanger}
            onClick={() => setConfirmOpen(true)}
            disabled={!puedeAplicar}
            title={!resultado?.dry_run ? "Previsualizá antes de aplicar" : undefined}
          >
            <RefreshCw size={15} /> Aplicar recálculo
          </button>
        </div>
      </motion.div>

      {resultado && (
        <ConfirmActionModal
          isOpen={confirmOpen}
          icon={RefreshCw}
          variant="danger"
          title="Aplicar el recálculo"
          message={
            <>
              Se van a recalcular <strong>{resultado.cambian}</strong> prestaciones de la O.S.{" "}
              {resultado.cod_obra}, período {resultado.periodo}
              {resultado.codigo ? `, código ${resultado.codigo}` : ""}. El total de la factura pasa de{" "}
              {formatMoney(resultado.importe_antes)} a <strong>{formatMoney(resultado.importe_despues)}</strong>.
            </>
          }
          warning={
            <>
              No se puede deshacer.
              {resultado.publicadas_afectadas > 0 &&
                ` ${resultado.publicadas_afectadas} ya están publicadas: el médico verá el importe nuevo.`}
            </>
          }
          confirmLabel={trabajando === "aplicar" ? "Recalculando…" : "Aplicar"}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => void correr(false)}
          loading={trabajando === "aplicar"}
        />
      )}
    </div>
  );
};

export default RecalculoPrecios;
