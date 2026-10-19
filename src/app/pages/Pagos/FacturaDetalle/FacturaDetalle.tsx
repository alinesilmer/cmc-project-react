import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowUpRight, Receipt } from "lucide-react";
import { getJSON } from "@/app/shared/lib/http";
import BackButton from "@/app/components/ui/BackButton/BackButton";
import Button from "@/app/components/ui/Button/Button";
import Franja from "@/app/components/layout/Franja/Franja";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import lq from "../Liquidacion.module.scss";
import styles from "./FacturaDetalle.module.scss";
import { type Liquidacion, fmt, mesLabel } from "../types";
import type ExcelJS from "exceljs";
import { saveAs } from "@/app/shared/lib/fileSaver";
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";

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
  // TODO: la paginación no se muestra todavía; solo se reinicia y se calcula.
  const [, setPage] = useState(1);
  const [, setHasMore] = useState(false);

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
    const ExcelJSLib = (await import("exceljs")).default;
    const wb = new ExcelJSLib.Workbook();
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
    <div className={lq.pagina}>
      <Franja
        titulo="Factura"
        icono={Receipt}
        lateral={<span className={lq.franjaDato}>{periodo}</span>}
      />
      <BackButton label="Volver" />

      {liq && (
        <div className={lq.tira}>
          <div className={lq.tiraDato}>
            <span>Obra social</span>
            <b>#{liq.obra_social_id}</b>
          </div>
          {liq.nro_factura && (
            <div className={lq.tiraDato}>
              <span>Factura</span>
              <b className={lq.mono}>{liq.nro_factura}</b>
            </div>
          )}
          <div className={lq.tiraDato}>
            <span>Bruto</span>
            <b>${fmt(liq.total_bruto)}</b>
          </div>
          <div className={lq.tiraDato}>
            <span>Débitos</span>
            <b className={lq.menos}>-${fmt(liq.total_debitos)}</b>
          </div>
          <div className={lq.tiraDato}>
            <span>Créditos</span>
            <b className={lq.mas}>+${fmt(liq.total_creditos)}</b>
          </div>
          <div className={`${lq.tiraDato} ${lq.tiraNeto}`}>
            <span>Neto</span>
            <b>${fmt(liq.total_neto)}</b>
          </div>
          <div className={`${lq.tiraAccion} ${lq.acciones}`}>
            <BotonDescarga formato="excel" onClick={exportExcel} disabled={rows.length === 0} />
            <Button
              variant="ghost"
              size="md"
              rightIcon={<ArrowUpRight size={18} aria-hidden="true" />}
              onClick={() => navigate(`/panel/liquidation/${pagoId}?tab=lotes`)}
            >
              Ver lotes
            </Button>
          </div>
        </div>
      )}

      {error && <div className={lq.error} role="alert">{error}</div>}

      <SearchField
        placeholder="Buscar por médico, matrícula o código…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onClear={() => setSearch("")}
        ariaLabel="Buscar prestaciones"
      />

      <div className={lq.tablaCaja}>
        {loading ? (
          <div className={lq.cargando}>Cargando prestaciones…</div>
        ) : (
          <Tabla className={styles.table}>
            <thead>
              <tr>
                <th>Socio</th>
                <th>Nombre</th>
                <th>Matrícula</th>
                <th>Orden</th>
                <th>Fecha</th>
                <th>Código</th>
                <th>Afiliado</th>
                <th>Cant.</th>
                <th>Honorarios</th>
                <th>Gastos</th>
                <th>Importe</th>
                <th>Ajustes</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={13} className={lq.vacio}>
                    {search ? `Sin resultados para «${search}».` : "Sin prestaciones para esta factura."}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.det_id}>
                  <td>{r.socio}</td>
                  <td className={styles.recorte} title={r.nombreSocio}>{r.nombreSocio}</td>
                  <td>{r.matri}</td>
                  <td>{r.nroOrden}</td>
                  <td className={lq.monto}>{r.fecha}</td>
                  <td>{r.codigo}</td>
                  <td className={styles.recorte} title={r.afiliado}>{r.afiliado}</td>
                  <td>{r.xCant}</td>
                  <td className={lq.monto}>${fmt(r.honorarios)}</td>
                  <td className={lq.monto}>${fmt(r.gastos)}</td>
                  <td className={lq.monto}>${fmt(r.importe)}</td>
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
                      <span className={lq.tenue}>—</span>
                    )}
                  </td>
                  <td className={`${lq.monto} ${lq.neto}`}>${fmt(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        )}
      </div>
    </div>
  );
};

export default FacturaDetalle;
