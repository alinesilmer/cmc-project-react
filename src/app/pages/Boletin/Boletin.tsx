"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { jsPDF } from "jspdf";
import { saveAs } from "@/app/shared/lib/fileSaver";
import styles from "./Boletin.module.scss";
import Button from "@/app/components/ui/Button/Button";
import logo from "../../assets/logoCMC.png";
import { http } from "@/app/shared/lib/http";

type RankedOS = {
  nro: number;
  nombre: string;
  honorariosA: number;
};

type RankedEntry = {
  row: RankedOS;
  rank: number;
  rankLabel: string;
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CMC_NAME = "Colegio Médico de Corrientes";
const CMC_PHONE = String(
  (import.meta as any).env?.VITE_CMC_PHONE ?? "(0379) 425 2323"
);
const CMC_EMAIL = String(
  (import.meta as any).env?.VITE_CMC_EMAIL ?? "auditoriacolegiomedico23@gmail.com"
);
const CMC_LOGO_SRC =
  String((import.meta as any).env?.VITE_CMC_LOGO_URL || "") || logo;

function safeNum(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const raw = v.trim();
    if (!raw) return 0;
    let normalized = raw;
    if (raw.includes(",")) {
      normalized = raw.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
      normalized = raw.replace(/\./g, "");
    }
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function normalizeText(s: any, maxLen = 160): string {
  const t = String(s ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!t) return "";
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}


// El `while (true)` que había acá no tenía techo: si el backend devolvía
// siempre páginas completas, el navegador quedaba pidiendo para siempre.
// `paginar` corta a las 100 páginas y además pide de a cuatro.
/**
 * El ranking a una fecha, desde el nomenclador nuevo.
 *
 * Antes salía de `valores_boletin` (la tabla legacy, que ya no se usa) y había
 * que paginarla entera y quedarse con la fila más nueva de cada obra social en
 * el navegador. `reportes_nm/ranking_valores` hace las dos cosas del lado del
 * servidor: una fila por obra social, la de vigencia más reciente, ya ordenada
 * de mayor a menor.
 */
async function fetchRanking(codigo: string, fecha: string): Promise<RankedOS[]> {
  const { data } = await http.get("/api/reportes_nm/ranking_valores", {
    params: { codigo, ...(fecha ? { fecha_referencia: fecha } : {}) },
  });
  const filas = Array.isArray(data?.ranking) ? data.ranking : [];
  return filas.map((r: any) => ({
    nro: Number(r?.obra_social_nro ?? 0),
    nombre: normalizeText(r?.nombre_os ?? `OS ${r?.obra_social_nro ?? ""}`),
    honorariosA: safeNum(r?.valor),
  }));
}

function buildRankedEntries(items: RankedOS[]): RankedEntry[] {
  const sorted = [...items].sort((a, b) => {
    if (b.honorariosA !== a.honorariosA) return b.honorariosA - a.honorariosA;
    const byName = a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
    if (byName !== 0) return byName;
    return a.nro - b.nro;
  });

  let distinctRank = 0;
  let lastAmount: number | null = null;

  return sorted.map((row) => {
    if (lastAmount === null || row.honorariosA !== lastAmount) {
      distinctRank += 1;
      lastAmount = row.honorariosA;
    }

    const rankLabel =
      distinctRank === 1
        ? "🥇"
        : distinctRank === 2
        ? "🥈"
        : distinctRank === 3
        ? "🥉"
        : String(distinctRank);

    return {
      row,
      rank: distinctRank,
      rankLabel,
    };
  });
}

function axiosErrorMessage(e: any): string {
  const status = e?.response?.status;
  const statusText = e?.response?.statusText;
  if (status) return `Error ${status}${statusText ? ` ${statusText}` : ""}`;
  if (e?.code === "ERR_NETWORK") return "Error de red (CORS o backend inaccesible)";
  return "Error al consultar el backend";
}

function csvEscape(value: string): string {
  return `"${String(value).replace(/"/g, `""`)}"`;
}

async function exportRankingToExcel(items: RankedEntry[]) {
  const rows = items.map((x) => ({
    Ranking: x.rankLabel,
    "N° Obra Social": x.row.nro,
    "Obra Social": x.row.nombre,
    Importe: x.row.honorariosA,
  }));

  try {
    const { downloadExcelSheet } = await import("@/app/shared/lib/excelExport");
    await downloadExcelSheet("ranking_obras_sociales.xlsx", "Ranking", rows);
    return;
  } catch {
    const header = ["Ranking", "N° Obra Social", "Obra Social", "Importe"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          csvEscape(r.Ranking),
          r["N° Obra Social"],
          csvEscape(r["Obra Social"]),
          String(r.Importe).replace(".", ","),
        ].join(",")
      ),
    ];
    const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ranking_obras_sociales.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}

async function loadImageAsDataUrl(src: string): Promise<string | null> {
  try {
    if (!src) return null;
    if (src.startsWith("data:image/")) return src;
    const response = await fetch(src, { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function getImageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const lower = dataUrl.toLowerCase();
  if (lower.startsWith("data:image/jpeg") || lower.startsWith("data:image/jpg")) return "JPEG";
  if (lower.startsWith("data:image/webp")) return "WEBP";
  return "PNG";
}

function formatDateTimeNow(): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function drawPdfRankBadge(
  doc: jsPDF,
  rank: number,
  cell: { x: number; y: number; width: number; height: number }
) {
  const centerX = cell.x + cell.width / 2;
  const centerY = cell.y + cell.height / 2 + 0.7;

  if (rank >= 1 && rank <= 3) {
    const medalFill =
      rank === 1 ? [234, 179, 8] : rank === 2 ? [148, 163, 184] : [180, 83, 9];
    const medalStroke =
      rank === 1 ? [161, 98, 7] : rank === 2 ? [100, 116, 139] : [124, 45, 18];

    doc.setFillColor(37, 99, 235);
    doc.rect(centerX - 3.2, centerY - 6.8, 2.2, 4.2, "F");
    doc.setFillColor(220, 38, 38);
    doc.rect(centerX + 1.0, centerY - 6.8, 2.2, 4.2, "F");

    doc.setFillColor(medalFill[0], medalFill[1], medalFill[2]);
    doc.setDrawColor(medalStroke[0], medalStroke[1], medalStroke[2]);
    doc.setLineWidth(0.3);
    doc.circle(centerX, centerY - 0.2, 3.3, "FD");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(String(rank), centerX, centerY + 0.9, { align: "center" });
    return;
  }

  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(String(rank), centerX, centerY + 0.8, { align: "center" });
}

async function exportRankingToPdf(items: RankedEntry[], codigo: string) {
  const { jsPDF: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoDataUrl = await loadImageAsDataUrl(CMC_LOGO_SRC);

  if (logoDataUrl) {
    const imageFormat = getImageFormatFromDataUrl(logoDataUrl);
    doc.addImage(logoDataUrl, imageFormat, 14, 12, 18, 18);
  }

  const textStartX = logoDataUrl ? 38 : 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(42, 60, 116);
  doc.text(CMC_NAME, textStartX, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Tel: ${CMC_PHONE}`, textStartX, 24);
  doc.text(`Email: ${CMC_EMAIL}`, textStartX, 29);

  doc.setDrawColor(42, 60, 116);
  doc.line(14, 34, pageWidth - 14, 34);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Ranking de Obras Sociales", 14, 43);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(`Código nomenclador: ${codigo}`, 14, 49);
  doc.text(`Generado: ${formatDateTimeNow()}`, pageWidth - 14, 49, { align: "right" });

  autoTable(doc, {
    startY: 56,
    head: [["Ranking", "N°", "Obra Social", "Importe"]],
    body: items.map((x) => [
      "",
      String(x.row.nro),
      x.row.nombre,
      money.format(x.row.honorariosA),
    ]),
    margin: { left: 14, right: 14 },
    styles: {
      font: "helvetica",
      fontSize: 10,
      cellPadding: 3,
      textColor: [40, 40, 40],
      lineColor: [225, 225, 225],
      lineWidth: 0.1,
      valign: "middle",
    },
    headStyles: {
      fillColor: [42, 60, 116],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      valign: "middle",
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 24 },
      1: { halign: "left", cellWidth: 28 },
      2: { halign: "left" },
      3: { halign: "right", cellWidth: 38 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 0) return;
      const entry = items[data.row.index];
      if (!entry) return;
      drawPdfRankBadge(doc, entry.rank, {
        x: data.cell.x,
        y: data.cell.y,
        width: data.cell.width,
        height: data.cell.height,
      });
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY ?? 56;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Empates de importe comparten la misma posición y la misma medalla en el top 3.",
    14,
    Math.min(finalY + 8, 285)
  );

  const blob = doc.output("blob");
  saveAs(blob, `ranking_obras_sociales_${codigo.trim() || "codigo"}.pdf`);
}

export default function Boletin() {
  const mountedRef = useRef(true);

  const [data, setData] = useState<RankedOS[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [codigo, setCodigo] = useState("420101");
  // Valores vigentes a esta fecha. Hoy por defecto: es el precio que rige.
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  const codigoVacio = codigo.trim() === "";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async (codigoActual: string, fechaActual: string) => {
    if (codigoActual.trim() === "") return;
    setLoading(true);
    setError(null);
    try {
      const latest = await fetchRanking(codigoActual.trim(), fechaActual);
      if (!mountedRef.current) return;
      setData(latest);
      if (latest.length === 0) setError("No se encontraron resultados para ese código.");
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(axiosErrorMessage(e));
      setData([]);
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(codigo, fecha);
    // Sólo al montar: después se recarga desde el buscador o el selector.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ranked = useMemo(() => buildRankedEntries(data), [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ranked;
    return ranked.filter(({ row }) => {
      const name = row.nombre.toLowerCase();
      const nro = String(row.nro);
      return name.includes(q) || nro.includes(q);
    });
  }, [ranked, query]);

  const handleConsultar = async () => {
    setQuery("");
    setData([]);
    await load(codigo, fecha);
  };

  const handleDownloadExcel = async () => {
    if (codigoVacio || ranked.length === 0) return;
    await exportRankingToExcel(ranked);
  };

  const handleDownloadPdf = async () => {
    if (codigoVacio || ranked.length === 0) return;
    try {
      setError(null);
      await exportRankingToPdf(ranked, codigo);
    } catch (e: any) {
      setError(`No se pudo generar el PDF. ${e?.message ? String(e.message) : ""}`.trim());
    }
  };

  return (
    <div className={styles.container}>
     

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Consulta</h2>
        </div>

        <div className={styles.cardContent}>
          <div className={styles.fieldGroup}>
            <label htmlFor="codigoInput" className={styles.fieldLabel}>
              Código nomenclador
            </label>
            <input
              id="codigoInput"
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: 420101"
              className={`${styles.fieldInput} ${codigoVacio ? styles.fieldInputError : ""}`}
            />
            {codigoVacio && (
              <p className={styles.fieldError}>
                Debe ingresar un código nomenclador para consultar datos.
              </p>
            )}
          </div>

          {/* Los precios de una obra social cambian con cada convenio: el
              ranking es siempre a una fecha. Hoy por defecto, que es el que
              rige. */}
          <div className={styles.fieldGroup}>
            <label htmlFor="fechaInput" className={styles.fieldLabel}>
              Valores vigentes al
            </label>
            <input
              id="fechaInput"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={styles.fieldInput}
            />
          </div>

          <div className={styles.actions}>
            <Button
              size="md"
              variant="primary"
              onClick={handleConsultar}
              disabled={loading || codigoVacio}
            >
              Consultar
            </Button>
            <Button
              size="md"
              variant="success"
              onClick={handleDownloadExcel}
              disabled={ranked.length === 0 || loading || codigoVacio}
            >
              Descargar Excel
            </Button>
            <Button
              size="md"
              variant="danger"
              onClick={handleDownloadPdf}
              disabled={ranked.length === 0 || loading || codigoVacio}
            >
              Descargar PDF
            </Button>
          </div>

          {loading && (
            <div className={styles.progressBar}>
              <div className={styles.progressFill} />
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {error}
            </div>
          )}
        </div>
      </div>

      {ranked.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.resultsHeader}>
              <div>
                <h2 className={styles.cardTitle}>Ranking de Obras Sociales</h2>
              
              </div>

              <div className={styles.searchWrapper}>
                <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o número..."
                  className={styles.searchInput}
                />
              </div>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thRank}>
                    <div className={styles.thContent}>
                      <svg className={styles.thIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                        />
                      </svg>
                      Ranking
                    </div>
                  </th>
                  <th className={styles.thNumber}>N°</th>
                  <th className={styles.thName}>Obra Social</th>
                  <th className={styles.thAmount}>Importe</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map(({ row, rank, rankLabel }) => {
                  return (
                    <tr key={row.nro}>
                      <td className={styles.tdRank}>
                        <span
                          className={`${styles.rankBadge} ${
                            rank === 1
                              ? styles.rankFirst
                              : rank === 2
                              ? styles.rankSecond
                              : rank === 3
                              ? styles.rankThird
                              : ""
                          }`}
                        >
                          {rankLabel}
                        </span>
                      </td>

                      <td className={styles.tdNumber}>{row.nro}</td>
                      <td className={styles.tdName}>{row.nombre}</td>
                      <td className={styles.tdAmount}>{money.format(row.honorariosA)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}