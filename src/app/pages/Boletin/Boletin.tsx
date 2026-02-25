"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
import styles from "./Boletin.module.scss";
import Button from "../../../website/components/UI/Button/Button";
import logo from "../../assets/logoCMC.png";

type ApiBoletinRow = {
  id: number;
  codigos: string;
  nro_obrasocial: number;
  obra_social: string | null;
  honorarios_a: number;
  honorarios_b: number;
  honorarios_c: number;
  gastos: number;
  ayudante_a: number;
  ayudante_b: number;
  ayudante_c: number;
  c_p_h_s: string;
  fecha_cambio: string | null;
};

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

const API_BASE_RAW =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_URL ??
  (import.meta as any).env?.VITE_BACKEND_URL ??
  "";

const API_BASE = String(API_BASE_RAW || "").replace(/\/+$/, "");
const API_ROOT = API_BASE
  ? API_BASE.endsWith("/api")
    ? API_BASE
    : `${API_BASE}/api`
  : "/api";

const ENDPOINTS = {
  valoresBoletin: `${API_ROOT}/valores/boletin`,
};

const CMC_NAME = "Colegio Médico de Corrientes";
const CMC_PHONE = String(
  (import.meta as any).env?.VITE_CMC_PHONE ?? "(0379) 425 2323"
);
const CMC_EMAIL = String(
  (import.meta as any).env?.VITE_CMC_EMAIL ?? "auditoria@colegiomedicocorrientes.com"
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

function normalizeRow(r: any): ApiBoletinRow {
  return {
    id: Number(r?.id ?? 0),
    codigos: String(r?.codigos ?? ""),
    nro_obrasocial: Number(r?.nro_obrasocial ?? 0),
    obra_social: (r?.obra_social ?? null) as string | null,
    honorarios_a: safeNum(r?.honorarios_a),
    honorarios_b: safeNum(r?.honorarios_b),
    honorarios_c: safeNum(r?.honorarios_c),
    gastos: safeNum(r?.gastos),
    ayudante_a: safeNum(r?.ayudante_a),
    ayudante_b: safeNum(r?.ayudante_b),
    ayudante_c: safeNum(r?.ayudante_c),
    c_p_h_s: String(r?.c_p_h_s ?? ""),
    fecha_cambio: r?.fecha_cambio ?? null,
  };
}

async function fetchValoresBoletin(codigo: string): Promise<ApiBoletinRow[]> {
  const all: ApiBoletinRow[] = [];
  let page = 1;
  const size = 500;

  while (true) {
    const { data } = await axios.get(ENDPOINTS.valoresBoletin, {
      params: { codigo, page, size },
    });
    const arr = Array.isArray(data) ? data : [];
    all.push(...arr.map(normalizeRow));
    if (arr.length < size) break;
    page++;
  }

  return all;
}

function buildLatestPerOS(rows: ApiBoletinRow[]): RankedOS[] {
  const byOS = new Map<number, ApiBoletinRow>();

  for (const r of rows) {
    if (!r?.nro_obrasocial) continue;
    const existing = byOS.get(r.nro_obrasocial);
    if (!existing || r.id < existing.id) {
      byOS.set(r.nro_obrasocial, r);
    }
  }

  return Array.from(byOS.entries()).map(([nro, row]) => ({
    nro,
    nombre: normalizeText(row.obra_social ?? `OS ${nro}`),
    honorariosA: row.honorarios_a,
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
    const xlsx = await import("xlsx");
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Ranking");
    xlsx.writeFile(wb, "ranking_obras_sociales.xlsx");
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

async function exportRankingToPdf(items: RankedEntry[], codigo: string) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
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
      x.rankLabel,
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
    },
    headStyles: {
      fillColor: [42, 60, 116],
      textColor: [255, 255, 255],
      fontStyle: "bold",
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

  const codigoVacio = codigo.trim() === "";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async (codigoActual: string) => {
    if (codigoActual.trim() === "") return;
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchValoresBoletin(codigoActual.trim());
      const latest = buildLatestPerOS(rows);
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
    void load(codigo);
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
    await load(codigo);
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
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Ranking de Obras Sociales</h1>
          <p className={styles.subtitle}>
            Ranking automático por <b>Importe</b> según el código nomenclador ingresado.
          </p>
        </div>
      </div>

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

          <div className={styles.actions}>
            <Button
              size="medium"
              variant="secondary"
              onClick={handleConsultar}
              disabled={loading || codigoVacio}
            >
              Consultar
            </Button>
            <Button
              size="medium"
              variant="secondary"
              onClick={handleDownloadExcel}
              disabled={ranked.length === 0 || loading || codigoVacio}
            >
              Descargar Excel
            </Button>
            <Button
              size="medium"
              variant="secondary"
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
                <h2 className={styles.cardTitle}>Ranking Generado</h2>
                <p className={styles.resultsCount}>
                  {filtered.length} obra{filtered.length !== 1 ? "s" : ""} social
                  {filtered.length !== 1 ? "es" : ""} encontrada
                  {filtered.length !== 1 ? "s" : ""}
                </p>
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