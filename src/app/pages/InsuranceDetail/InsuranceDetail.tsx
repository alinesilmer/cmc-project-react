// app/pages/InsuranceDetail/InsuranceDetail.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion } from "framer-motion";
// import Sidebar from "../../../components/molecules/Sidebar/Sidebar";
import Button from "../../../components/atoms/Button/Button";
import InsuranceTable, {
  type InsuranceRow,
} from "../../../components/molecules/InsuranceDetailTable/InsuranceDetailTable";
import styles from "./InsuranceDetail.module.scss";


import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

type LocationState =
  | {
      insurance?: string; // nombre descriptivo
    }
  | undefined;

const API_BASE =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

// === Endpoints back ===
const LIQ_RESUMEN = (liqId: string | number) =>
  `${API_BASE}/api/liquidacion/liquidaciones_por_os/${liqId}`;
const LIQ_DETALLES_VISTA = (liqId: string | number) =>
  `${API_BASE}/api/liquidacion/liquidaciones_por_os/${liqId}/detalles_vista`;

// Débitos/Créditos por DETALLE (by_detalle)
const DC_BY_DETALLE = (detalleId: string | number) =>
  `${API_BASE}/api/debitos_creditos/by_detalle/${detalleId}`;



const currency = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0 });

// ---------------- helpers de mapeo robustos ----------------
function parseNumber(n: any, fallback = 0): number {
  if (n === null || n === undefined || n === "") return fallback;
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

function normalizeTipo(raw: any): "N" | "C" | "D" {
  // preferimos el nuevo campo 'tipo' si viene listo
  if (raw?.tipo === "N" || raw?.tipo === "C" || raw?.tipo === "D") return raw.tipo;
  // fallback al viejo: tipo_dc ('d'|'c')
  const t = String(raw?.tipo_dc ?? "").toLowerCase();
  if (t === "d") return "D";
  if (t === "c") return "C";
  return "N";
}

function coerceRow(raw: any): InsuranceRow {
  const det_id = raw.det_id;

  const importe = parseNumber(raw.importe, 0);
  const pagado = parseNumber(raw.pagado, 0);

  // monto preferido: 'monto', fallback: 'monto_dc'
  const monto = parseNumber(raw.monto ?? raw.monto_dc, 0);

  // obs preferida: 'obs', fallback: 'obs_dc'
  const obs = raw.obs ?? raw.obs_dc ?? null;

  const tipo = normalizeTipo(raw);

  // total: si el back no lo trae, lo calculamos acá (base importe)
  let total = raw.total;
  if (total === undefined || total === null) {
    total =
      tipo === "D" ? importe - monto :
      tipo === "C" ? importe + monto :
      importe;
  }

  // xCant: si no vino directo, lo armamos con cantidad/cantidad_tratamiento
  const xCant =
    raw.xCant ??
    `${parseNumber(raw.cantidad, 1)}-${parseNumber(raw.cantidad_tratamiento, 1)}`;

  // Fecha a dd/mm/aaaa si vino en ISO
  const fechaStr =
    typeof raw.fecha === "string" && raw.fecha.length >= 8
      ? new Date(raw.fecha).toLocaleDateString("es-AR")
      : (raw.fecha || "");

  return {
    det_id,
    socio: raw.socio,
    nombreSocio: (raw.nombreSocio || "").toString().trim(),
    matri: raw.matri,
    nroOrden: raw.nroOrden,
    fecha: fechaStr,
    codigo: raw.codigo,
    nroAfiliado: raw.nroAfiliado ?? "",
    afiliado: raw.afiliado ?? "",
    xCant,
    porcentaje: parseNumber(raw.porcentaje, 0),
    honorarios: parseNumber(raw.honorarios, 0),
    gastos: parseNumber(raw.gastos, 0),
    coseguro: parseNumber(raw.coseguro, 0),
    importe,
    pagado,
    tipo,   // "N" default si no hay DC
    monto,  // 0 default si no hay DC
    obs,    // null default si no hay DC
    total: parseNumber(total, importe),
  };
}

// ---------------- exportar a Excel ----------------
async function exportInsuranceRowsToExcel(period: string, rows: InsuranceRow[]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`Período ${period}`);

  ws.columns = [
    { header: "Socio", key: "socio", width: 10 },
    { header: "Nombre Socio", key: "nombreSocio", width: 22 },
    { header: "Matri.", key: "matri", width: 8 },
    { header: "Nro. Orden", key: "nroOrden", width: 14 },
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Código", key: "codigo", width: 10 },
    { header: "Nro. Afiliado", key: "nroAfiliado", width: 16 },
    { header: "Afiliado", key: "afiliado", width: 22 },
    { header: "X-Cant.", key: "xCant", width: 8 },
    { header: "%", key: "porcentaje", width: 6 },
    { header: "Honorarios", key: "honorarios", width: 14 },
    { header: "Gastos", key: "gastos", width: 10 },
    { header: "Coseguro", key: "coseguro", width: 12 },
    { header: "Importe", key: "importe", width: 12 },
    { header: "Pagado", key: "pagado", width: 12 },
    { header: "Tipo", key: "tipo", width: 6 },
    { header: "Monto", key: "monto", width: 12 },
    { header: "Obs", key: "obs", width: 20 },
    { header: "Total", key: "total", width: 12 },
  ] as ExcelJS.Column[];

  rows.forEach((r) => ws.addRow({ ...r }));
  ws.getRow(1).font = { bold: true };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `detalle_${period}.xlsx`);
}

// ---------------- exportar D/C a PDF ----------------
async function exportDebCredToPDF(
  period: string,
  rows: InsuranceRow[],
  insuranceName: string,
  nroLiquidacion?: string
) {
  // Import dinámico (necesitás instalar deps: npm i jspdf jspdf-autotable)
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default as any;

  // Filtramos SOLO filas con DC válidos
  const dcRows = rows.filter(
    (r) => (r.tipo === "D" || r.tipo === "C") && Number(r.monto) > 0
  );

  // Early-return si no hay nada
  if (dcRows.length === 0) {
    alert("No hay débitos/créditos para exportar.");
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "A4",
  });

  // Encabezado
  const left = 40;
  let y = 40;
  doc.setFontSize(14);
  doc.text(`Débitos / Créditos — ${insuranceName}`, left, y);
  y += 18;
  doc.setFontSize(11);
  doc.text(`Período: ${period}`, left, y);
  if (nroLiquidacion) {
    doc.text(`Nro. Liquidación: ${nroLiquidacion}`, left + 220, y);
  }

  // Tabla
  const currency = new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const head = [
    ["Tipo", "Socio", "Nro de prestación", "Observaciones", "Monto", "Código"],
  ];

  const body = dcRows.map((r) => [
    r.tipo ?? "",
    `${r.socio} - ${r.nombreSocio}`.trim(),
    String(r.nroOrden ?? ""),
    (r.obs ?? "").toString(),
    `$ ${currency.format(Number(r.monto ?? 0))}`,
    String(r.codigo ?? ""),
  ]);

  autoTable(doc, {
    startY: y + 14,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 6, halign: "left", valign: "middle" },
    headStyles: { fillColor: [27, 86, 255], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 40 },  // Tipo
      1: { cellWidth: 200 }, // Socio
      2: { cellWidth: 90 }, // Nro de prestación
      3: { cellWidth: 200 }, // Observaciones
      4: { cellWidth: 70, halign: "right" }, // Monto
      5: { cellWidth: 70 }, // Código
    },
    didDrawPage: (data: any) => {
      console.log(data)
      // Footer con número de página
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.height ?? pageSize.getHeight();
      const pageWidth = pageSize.width ?? pageSize.getWidth();
      const page = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(9);
      doc.text(
        `Página ${page}`,
        pageWidth - 60,
        pageHeight - 16
      );
    },
  });

  doc.save(`debitos_creditos_${period}.pdf`);
}

type ResumenOS = {
  id: number;
  resumen_id: number;
  obra_social_id: number;
  mes_periodo: number;
  anio_periodo: number;
  nro_liquidacion: string;
  total_bruto: string;
  total_debitos: string;
  total_neto: string;
  estado : string;
};

type ServerRowOut = {
  det_id: number;
  tipo: "N" | "D" | "C";
  monto: number;
  obs: string | null;
  importe: number;
  pagado: number;
  total: number;
};

type ServerResumenOut = {
  liquidacion_id: number;
  nro_liquidacion?: string | null;
  total_bruto: number;
  total_debitos: number;
  total_neto: number;
};

type ServerRecalcOut = {
  det_id: number;
  debito_credito_id: number | null;
  row: ServerRowOut;
  resumen: ServerResumenOut;
};

function applyServerRecalc(
  data: ServerRecalcOut,
  setRowsFn: React.Dispatch<React.SetStateAction<InsuranceRow[]>>,
  setResumenFn: React.Dispatch<React.SetStateAction<ResumenOS | null>>
) {
  // 1) Actualizar la fila en memoria
  const r = data.row;
  setRowsFn((prev) =>
    prev.map((item) =>
      item.det_id === r.det_id
        ? {
            ...item,
            tipo: r.tipo,
            monto: r.monto,
            obs: r.obs ?? "",
            // mantenemos importe/pagado por si el back decidió actualizarlos
            importe: r.importe ?? item.importe,
            pagado: r.pagado ?? item.pagado,
            total: r.total,
          }
        : item
    )
  );

  // 2) Actualizar resumen de badges (usa tu shape ResumenOS)
  setResumenFn((prev) => {
    const current: ResumenOS =
      prev ?? {
        id: data.resumen.liquidacion_id,
        resumen_id: 0,
        obra_social_id: 0,
        mes_periodo: 0,
        anio_periodo: 0,
        nro_liquidacion: data.resumen.nro_liquidacion ?? "",
        total_bruto: "0",
        total_debitos: "0",
        total_neto: "0",
        estado : "A"
      };
    return {
      ...current,
      nro_liquidacion: data.resumen.nro_liquidacion ?? current.nro_liquidacion,
      total_bruto: String(data.resumen.total_bruto),
      total_debitos: String(data.resumen.total_debitos),
      total_neto: String(data.resumen.total_neto),
    };
  });
}

// const ALLOW_PAGE_SIZE_SELECT = false; // o false si querés ocultar el select y dejar 50 fijo

// const PAGER_LABELS = {
//   rowsPerPage: "Filas por página",
//   page: "Página",
//   of: "de",
//   previous: "Anterior",
//   next: "Siguiente",
//   first: "«",
//   last: "»",
//   showing: "Mostrando",
//   toSep: "–",
//   ofTotal: "de",
// } as const;



const InsuranceDetail: React.FC = () => {
  // params esperados: /liquidation/:id/insurance/:osId/:period/:liquidacionId
  const params = useParams<{
    id?: string;
    osId?: string;
    period?: string;
    liquidacionId?: string;
  }>();
  const location = useLocation();
  const state = location.state as LocationState;

  const osId = params.osId!;
  const period = params.period ?? "YYYY-MM";
  const liqId = params.liquidacionId!;

  const insuranceName = state?.insurance ?? `Obra Social ${osId}`;

  const [rows, setRows] = useState<InsuranceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Resumen del período (para mostrar nro_liquidacion y totales)
  const [resumen, setResumen] = useState<ResumenOS | null>(null);

  const [q, setQ] = useState("");
  const isOpen = String(resumen?.estado ?? "A").trim().toUpperCase() === "A";
  // const [debouncedQ, setDebouncedQ] = useState("");

  // useEffect(() => {
  //   const id = setTimeout(() => setDebouncedQ(q.trim()), 350);
  //   return () => clearTimeout(id);
  // }, [q]);

  // useEffect(() => {
  //   setPage(1);
  // }, [debouncedQ]);

  // --- Paginación ---
  // const [page, setPage] = useState(1);      // página 1-based
  // const [limit, setLimit] = useState(50);   // tamaño de página
  // const [total, setTotal] = useState(0);    // total de filas en el servidor

  // const offset = (page - 1) * limit;

  // const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  // const canPrev = page > 1;
  // const canNext = page < totalPages;
  // const start = total === 0 ? 0 : (page - 1) * limit + 1;
  // const end = total === 0 ? 0 : Math.min(page * limit, total);

  // ### Cargar solo el resumen por liquidacion_id
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    (async () => {
      setErr(null);
      try {
        const r1 = await fetch(LIQ_RESUMEN(liqId), { signal: controller.signal });
        if (!r1.ok) throw new Error(`Error ${r1.status} al obtener resumen`);
        const resumenJson: ResumenOS = await r1.json();
        if (!ignore) setResumen(resumenJson);
      } catch (e: any) {
        if (!ignore && e?.name !== "AbortError") setErr(e?.message || "No se pudo cargar el resumen.");
      }
    })();
    return () => { ignore = true; controller.abort(); };
  }, [liqId]);

  // ### Cargar vista de detalles paginada (offset/limit)
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const url = new URL(LIQ_DETALLES_VISTA(liqId));
        // SIN offset/limit ni q
        const r2 = await fetch(url.toString(), { signal: controller.signal });
        if (!r2.ok) throw new Error(`Error ${r2.status} al obtener detalle`);
        const detalleVista = await r2.json();
        const mapped: InsuranceRow[] = (detalleVista ?? []).map(coerceRow);
        if (!ignore) setRows(mapped);
      } catch (e: any) {
        if (!ignore && e?.name !== "AbortError") setErr(e?.message || "No se pudo cargar el detalle.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; controller.abort(); };
  }, [liqId]);

  // ### Crear/editar/eliminar DC por detalle
  // TIP: si tenés auth real, cambiá este userId (lo necesita el back al crear)
  const CURRENT_USER_ID = 10;

  // ====== REEMPLAZÁ tus funciones upsertDC y deleteDC por estas ======
  const upsertDC = useCallback(
    async (
      detalleId: number | string,
      payload: { tipo: "D" | "C"; monto: number; observacion?: string }
    ) => {
      const resp = await fetch(DC_BY_DETALLE(detalleId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: payload.tipo.toLowerCase(), // back usa 'd' | 'c'
          monto: payload.monto,
          observacion: payload.observacion ?? null,
          created_by_user: CURRENT_USER_ID,
        }),
      });

      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(
          `Fallo guardar débito/crédito (${resp.status}): ${t || resp.statusText}`
        );
      }

      const data: ServerRecalcOut = await resp.json();
      applyServerRecalc(data, setRows, setResumen);
      return data;
    },
    []
  );

  const deleteDC = useCallback(async (detalleId: number | string) => {
    const resp = await fetch(DC_BY_DETALLE(detalleId), { method: "DELETE" });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(
        `Fallo eliminar débito/crédito (${resp.status}): ${t || resp.statusText}`
      );
    }
    const data: ServerRecalcOut = await resp.json();
    applyServerRecalc(data, setRows, setResumen);
    return data;
  }, []);

  // ### Integración con la tabla: al guardar desde el drawer (sin cálculo local)
  const handleSaveRow = useCallback(
    async (draft: InsuranceRow) => {
      const detalleId = draft.det_id;
      if (detalleId === undefined || detalleId === null) {
        throw new Error("No se pudo determinar el ID del detalle (det_id).");
      }

      // Sin DC => DELETE
      if (draft.tipo === "N" || !draft.monto || Number(draft.monto) <= 0) {
        await deleteDC(detalleId);
        return;
      }

      // Con DC => POST (upsert)
      await upsertDC(detalleId, {
        tipo: draft.tipo as "D" | "C",
        monto: Number(draft.monto),
        observacion: draft.obs || undefined,
      });
    },
    [deleteDC, upsertDC]
  );

  // const totalImporte = useMemo(
  //   () => rows.reduce((s, r) => s + (r.total ?? 0), 0),
  //   [rows]
  // );

  return (
    <div className={styles.page}>
      {/* <Sidebar /> */}
      <div className={styles.content}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={styles.wrapper_content}
        >
          <div className={styles.header}>
            <div>
              <div className={styles.breadcrumb}>Detalle de Obra Social</div>
              <h1 className={styles.title}>
                {insuranceName} — <span className={styles.period}>Período {period}</span>
              </h1>
              {resumen && (
                <div className={styles.meta}>
                  <span className={styles.periodBadge}>
                    Nro. Liquidación: <strong>{resumen.nro_liquidacion}</strong>
                  </span>
                  <span className={styles.periodBadge}>
                    Bruto: <strong>${currency.format(parseNumber(resumen.total_bruto))}</strong>
                  </span>
                  <span className={styles.periodBadge}>
                    Débitos: <strong>${currency.format(parseNumber(resumen.total_debitos))}</strong>
                  </span>
                  <span className={styles.periodBadge}>
                    Neto: <strong>${currency.format(parseNumber(resumen.total_neto))}</strong>
                  </span>
                </div>
              )}
            </div>
            <div className={styles.headerRight}>
              {/* <div className={styles.totalPill}>
                Total Importe: <strong>${currency.format(totalImporte)}</strong>
              </div> */}
              <Button
                variant="success"
                onClick={() => exportInsuranceRowsToExcel(period, rows)}
                disabled={loading || rows.length === 0}
              >
                Excel
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  exportDebCredToPDF(
                    period,
                    rows,
                    insuranceName,
                    resumen?.nro_liquidacion
                  )
                }
                disabled={
                  loading ||
                  rows.every(
                    (r) => !(r.tipo === "D" || r.tipo === "C") || !(Number(r.monto) > 0)
                  )
                }
              >
                PDF
              </Button>

            </div>
          </div>

          <div className={styles.tableSection}>
            {err ? (
              <div className={styles.error}>{err}</div>
            ) : (
              <InsuranceTable
                period={period}
                rows={rows}
                onChange={setRows}
                onSaveRow={handleSaveRow}
                loading={loading}
                searchValue={q}
                onSearchChange={(e) => setQ(e.target.value)}
                canEdit={isOpen}
              />
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default InsuranceDetail;
