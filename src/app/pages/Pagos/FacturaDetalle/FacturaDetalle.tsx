import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { getJSON } from "../../../lib/http";
import BackButton from "../../../components/atoms/BackButton/BackButton";
import Button from "../../../components/atoms/Button/Button";
import Card from "../../../components/atoms/Card/Card";
import styles from "./FacturaDetalle.module.scss";
import { type Liquidacion, fmt, mesLabel } from "../types";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const LIQ_URL = (id: string | number) => `/api/liquidacion/liquidaciones_por_os/${id}`;
const DETALLES_VISTA_URL = (id: string | number, search?: string, medicoId?: string) => {
  const p = new URLSearchParams();
  if (search) p.set("search", search);
  if (medicoId) p.set("medico_id", medicoId);
  return `/api/liquidacion/liquidaciones_por_os/${id}/detalles_vista?${p}`;
};

type DcItem = { ajuste_id: number; tipo: "D" | "C"; honorarios: number; gastos: number; total: number; obs: string | null };

type VistaRow = {
  det_id: number;
  socio: number;
  nombreSocio: string;
  matri: number;
  nroOrden: number;
  fecha: string;
  codigo: string;
  nroAfiliado: string;
  afiliado: string;
  xCant: string;
  porcentaje: number;
  honorarios: number;
  gastos: number;
  coseguro: number;
  importe: number;
  pagado: number;
  debitos_creditos_list: DcItem[];
  total: number;
};

const PAGE_SIZE = 100;

const FacturaDetalle: React.FC = () => {
  const { pagoId, liquidacionId } = useParams<{ pagoId: string; liquidacionId: string }>();
  const navigate = useNavigate();

  const [liq, setLiq] = useState<Liquidacion | null>(null);
  const [rows, setRows] = useState<VistaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [searchDebounce, setSearchDebounce] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounce(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchData = useCallback(async () => {
    if (!liquidacionId) return;
    setLoading(true);
    setError(null);
    try {
      const [liqData, vistaData] = await Promise.all([
        getJSON<Liquidacion>(LIQ_URL(liquidacionId)),
        getJSON<VistaRow[]>(DETALLES_VISTA_URL(liquidacionId, searchDebounce || undefined)),
      ]);
      setLiq(liqData);
      setRows(vistaData ?? []);
      setHasMore((vistaData ?? []).length === PAGE_SIZE);
    } catch (e: any) {
      setError(e?.message || "No se pudo cargar la factura.");
    } finally {
      setLoading(false);
    }
  }, [liquidacionId, searchDebounce]);

  useEffect(() => { setPage(1); fetchData(); }, [fetchData]);

  const exportExcel = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Detalle");
    ws.columns = [
      { header: "Socio", key: "socio", width: 10 },
      { header: "Nombre", key: "nombreSocio", width: 24 },
      { header: "Matri.", key: "matri", width: 8 },
      { header: "Nro. Orden", key: "nroOrden", width: 14 },
      { header: "Fecha", key: "fecha", width: 12 },
      { header: "Código", key: "codigo", width: 10 },
      { header: "Nro. Afiliado", key: "nroAfiliado", width: 16 },
      { header: "Afiliado", key: "afiliado", width: 22 },
      { header: "X-Cant.", key: "xCant", width: 8 },
      { header: "Honorarios", key: "honorarios", width: 14 },
      { header: "Gastos", key: "gastos", width: 10 },
      { header: "Coseguro", key: "coseguro", width: 12 },
      { header: "Importe", key: "importe", width: 12 },
      { header: "Total", key: "total", width: 12 },
    ] as ExcelJS.Column[];
    rows.forEach((r) => ws.addRow({ ...r }));
    ws.getRow(1).font = { bold: true };
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `factura_${liquidacionId}.xlsx`);
  };

  const periodo = liq ? `${mesLabel(liq.mes_periodo)} ${liq.anio_periodo}` : "—";

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <BackButton />
              <div className={styles.breadcrumb}>LIQUIDACIÓN / PAGO {pagoId} / FACTURA</div>
              <h1 className={styles.title}>Factura — OS {liq?.obra_social_id ?? "…"} · {periodo}</h1>
              {liq?.nro_factura && (
                <span style={{ fontSize: 13, color: "#64748b" }}>Nro: {liq.nro_factura}</span>
              )}
              {liq && (
                <div className={styles.chips}>
                  <span className={styles.chip}>Bruto: ${fmt(liq.total_bruto)}</span>
                  <span className={`${styles.chip} ${styles.chipRed}`}>Débitos: -${fmt(liq.total_debitos)}</span>
                  <span className={`${styles.chip} ${styles.chipGreen}`}>Créditos: +${fmt(liq.total_creditos)}</span>
                  <span className={styles.chip} style={{ fontWeight: 700 }}>Neto: ${fmt(liq.total_neto)}</span>
                </div>
              )}
            </div>
            <div className={styles.headerActions}>
              <Button variant="success" onClick={exportExcel} disabled={rows.length === 0}>Exportar Excel</Button>
              <Button variant="secondary" onClick={() => navigate(`/panel/liquidation/${pagoId}?tab=lotes`)}>
                Ver Lotes ↗
              </Button>
            </div>
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.filterBar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar por médico, matrícula o código…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Card className={styles.tableCard}>
            {loading ? (
              <div className={styles.loadingState}>Cargando prestaciones…</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Socio</th>
                        <th>Nombre</th>
                        <th>Matri.</th>
                        <th>Nro. Orden</th>
                        <th>Fecha</th>
                        <th>Código</th>
                        <th>Afiliado</th>
                        <th>X-Cant.</th>
                        <th className={styles.numCell}>Honorarios</th>
                        <th className={styles.numCell}>Gastos</th>
                        <th className={styles.numCell}>Importe</th>
                        <th>Ajustes DC</th>
                        <th className={styles.numCell}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.length === 0 && (
                        <tr>
                          <td colSpan={13} className={styles.emptyCell}>
                            {search ? `Sin resultados para "${search}".` : "Sin prestaciones para esta factura."}
                          </td>
                        </tr>
                      )}
                      {rows.map((r) => (
                        <tr key={r.det_id}>
                          <td>{r.socio}</td>
                          <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.nombreSocio}
                          </td>
                          <td>{r.matri}</td>
                          <td>{r.nroOrden}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{r.fecha}</td>
                          <td>{r.codigo}</td>
                          <td style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {r.afiliado}
                          </td>
                          <td>{r.xCant}</td>
                          <td className={styles.numCell}>${fmt(r.honorarios)}</td>
                          <td className={styles.numCell}>${fmt(r.gastos)}</td>
                          <td className={styles.numCell}>${fmt(r.importe)}</td>
                          <td>
                            {r.debitos_creditos_list && r.debitos_creditos_list.length > 0 ? (
                              <div className={styles.dcList}>
                                {r.debitos_creditos_list.map((dc) => (
                                  <span
                                    key={dc.ajuste_id}
                                    className={`${styles.dcItem} ${dc.tipo === "D" ? styles.dcD : styles.dcC}`}
                                    title={dc.obs ?? ""}
                                  >
                                    {dc.tipo === "D" ? "-" : "+"} ${fmt(dc.total)}{dc.obs ? ` (${dc.obs})` : ""}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td className={styles.numCell} style={{ fontWeight: 700 }}>${fmt(r.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default FacturaDetalle;
