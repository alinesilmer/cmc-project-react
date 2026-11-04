import React, { useCallback, useEffect, useState } from "react";
import { saveAs } from "@/app/shared/lib/fileSaver";
import { getVistaPrevia } from "@/app/pages/Pagos/pagos.api";
import Card from "@/app/components/ui/Card/Card";
import styles from "./tabs.module.scss";
import { fmt, mesLabel } from "../../types";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import paleta from "@/app/styles/paleta.module.scss";
import { comoErrorApi } from "@/app/shared/lib/httpErrors";
import { CMC_LOGO_SRC, fetchAsDataUrl } from "@/app/shared/lib/documentos/institucion";
import { armarResumen, generarResumenPdf, type VistaPrevia } from "../../pdf/resumenPagoPdf";
import { generarResumenExcel } from "../../pdf/resumenPagoExcel";

type Props = { pagoId: number };

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <h3 style={{ fontSize: 14, fontWeight: 700, color: paleta.gray800 }}>
    {children}
  </h3>
);

const TabResumen: React.FC<Props> = ({ pagoId }) => {
  const [data, setData] = useState<VistaPrevia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVistaPrevia<VistaPrevia>(pagoId);
      setData(res);
    } catch (e) {
      const err = comoErrorApi(e);
      setError(err?.message || "No se pudo cargar la vista previa.");
    } finally {
      setLoading(false);
    }
  }, [pagoId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return <div className={styles.loadingState}>Cargando vista previa…</div>;
  if (error) return <div className={styles.errorBanner}>{error}</div>;
  if (!data) return null;

  const { liquidaciones, deducciones } = data;
  const adelantos = data.adelantos ?? { items: [], totales: { total_bruto: "0" } };
  const compensaciones = data.compensaciones ?? { items: [], totales: { a_favor: "0", en_contra: "0", neto: "0" } };
  const conSigno = (n: number | string) => `${Number(n) < 0 ? "-" : "+"}$${fmt(Math.abs(Number(n)))}`;

  // El adelanto es producción del médico: suma al total a pagar igual que una factura.
  // Un solo total a pagar para todo el sistema: el que calcula la API (suma de los netos de los médicos). Antes se
  // sumaba acá otra vez los débitos y créditos de los lotes con factura, que la liquidación ya trae descontados.
  const resumen = data.resumen;
  const totalAPagar = resumen
    ? Number(resumen.total_a_pagar)
    : Number(liquidaciones.totales.total_neto) +
      Number(adelantos.totales.total_bruto) +
      Number(compensaciones.totales.neto) -
      Number(deducciones.totales.total_monto);

  const periodoLabel = `${mesLabel(data.mes)} ${data.anio}`;
  // Las mismas tablas, en el mismo orden y con las mismas columnas que el PDF y el Excel.
  const res = armarResumen(data, totalAPagar);
  const monto = (n: number, firmado: boolean) =>
    firmado ? <span className={n < 0 ? styles.negative : styles.positive}>{conSigno(n)}</span> : `$${fmt(n)}`;

  // ── Excel export ──────────────────────────────────────────────
  const exportExcel = async () => {
    saveAs(await generarResumenExcel(data, totalAPagar), `vista_previa_pago_${periodoLabel.replace(" ", "_")}.xlsx`);
  };

  // ── PDF export ────────────────────────────────────────────────
  const exportPDF = async () => {
    const logo = await fetchAsDataUrl(CMC_LOGO_SRC);
    const doc = await generarResumenPdf(data, totalAPagar, logo);
    doc.save(`vista_previa_pago_${periodoLabel.replace(" ", "_")}.pdf`);
  };

  return (
    <div className={styles.tabWrap}>
      {/* ── Toolbar con exportes ── */}
      <div className={styles.toolbar}>
        <div />
        <div style={{ display: "flex", gap: 8 }}>
          <BotonDescarga formato="excel" onClick={exportExcel} />
          <BotonDescarga formato="pdf" onClick={exportPDF} />
        </div>
      </div>

      {/* ── Facturas, adelantos, lotes y refacturaciones: una sola tabla ── */}
      <SectionTitle>Facturas, adelantos, lotes y refacturaciones</SectionTitle>
      <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableWrap}>
          <Tabla className={styles.table}>
            <thead>
              <tr>
                <th>Obra social</th>
                <th>Período</th>
                <th className={styles.numCell}>Honorarios</th>
                <th className={styles.numCell}>Gastos</th>
                <th>Concepto</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {res.filas.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyCell}>
                    Sin facturas, adelantos ni lotes en este pago.
                  </td>
                </tr>
              )}
              {res.filas.map((f, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 500 }}>{f.os}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{f.periodo}</td>
                  <td className={styles.numCell}>{monto(f.h, f.conSigno)}</td>
                  <td className={styles.numCell}>{monto(f.g, f.conSigno)}</td>
                  <td>{f.concepto}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 11 }}>{f.id}</td>
                </tr>
              ))}
            </tbody>
            {res.filas.length > 0 && (
              <tfoot>
                <tr className={styles.totalsRow}>
                  <td colSpan={2}>TOTAL</td>
                  <td className={styles.numCell}>${fmt(res.sumaH)}</td>
                  <td className={styles.numCell}>${fmt(res.sumaG)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </Tabla>
        </div>
      </Card>

      {/* ── Compensaciones ── */}
      {res.compensaciones.length > 0 && (
        <>
          <SectionTitle>Compensaciones</SectionTitle>
          <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
            <div className={styles.tableWrap}>
              <Tabla className={styles.table}>
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Socio</th>
                    <th>Leyenda del recibo</th>
                    <th className={styles.numCell}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {res.compensaciones.map((c) => (
                    <tr key={c.compensacion_id}>
                      <td style={{ fontWeight: 500 }}>#{c.compensacion_id}</td>
                      <td>{c.medico_nombre}</td>
                      <td>{c.leyenda}</td>
                      <td className={styles.numCell}>{monto(Number(c.importe), true)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={styles.totalsRow}>
                    <td colSpan={3}>TOTAL</td>
                    <td className={styles.numCell}>{monto(res.compensacionesNeto, true)}</td>
                  </tr>
                </tfoot>
              </Tabla>
            </div>
          </Card>
        </>
      )}

      {/* ── Deducciones por concepto ── */}
      <SectionTitle>Deducciones por concepto</SectionTitle>
      <Card className={styles.tableCard} style={{ marginBottom: 28 }}>
        <div className={styles.tableWrap}>
          <Tabla className={styles.table}>
            <thead>
              <tr>
                <th>Concepto</th>
                <th className={styles.numCell}>Socios</th>
                <th className={styles.numCell}>Total aplicado</th>
              </tr>
            </thead>
            <tbody>
              {res.deducciones.length === 0 && (
                <tr>
                  <td colSpan={3} className={styles.emptyCell}>
                    Sin deducciones en este pago.
                  </td>
                </tr>
              )}
              {res.deducciones.map((d) => (
                <tr key={d.concepto}>
                  <td style={{ fontWeight: 500 }}>{d.concepto}</td>
                  <td className={styles.numCell}>{d.socios}</td>
                  <td className={styles.numCell}>{monto(-d.total, true)}</td>
                </tr>
              ))}
            </tbody>
            {res.deducciones.length > 0 && (
              <tfoot>
                <tr className={styles.totalsRow}>
                  <td colSpan={2}>TOTAL</td>
                  <td className={styles.numCell}>{monto(-res.deduccionesTotal, true)}</td>
                </tr>
              </tfoot>
            )}
          </Tabla>
        </div>
      </Card>

      {/* ── Cierre de cuentas: los mismos números que el encabezado del pago ── */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <table style={{ minWidth: 320, borderCollapse: "collapse", fontSize: 13, color: paleta.gray800 }}>
          <tbody>
            {(
              [
                ["Brutos y débitos", monto(res.brutosYDebitos, false)],
                ["Compensaciones", monto(res.compensacionesTotal, true)],
                ["Deducciones", monto(-res.deduccionesAplicadas, true)],
                ...(res.arrastreCobrado !== 0 ? [["Saldo arrastrado", monto(-res.arrastreCobrado, true)]] : []),
              ] as [string, React.ReactNode][]
            ).map(([rotulo, valor]) => (
              <tr key={rotulo}>
                <td style={{ padding: "4px 16px 4px 0" }}>{rotulo}</td>
                <td className={styles.numCell} style={{ padding: "4px 0", textAlign: "right" }}>{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Total a Pagar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginTop: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${paleta.tonoAzul450B} 0%, ${paleta.tonoAzul550} 100%)`,
            color: paleta.white,
            borderRadius: 10,
            padding: "14px 28px",
            display: "flex",
            alignItems: "center",
            gap: 32,
            boxShadow: "0 4px 16px rgba(27,86,255,0.25)",
          }}
        >
          <span
            style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.04em" }}
          >
            TOTAL A PAGAR
          </span>
          <span
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}
          >
            ${fmt(totalAPagar)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TabResumen;
