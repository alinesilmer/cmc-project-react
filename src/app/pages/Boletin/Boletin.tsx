"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import styles from "./Boletin.module.scss";
import Button from "../../../website/components/UI/Button/Button";

type ApiBoletinRow = {
  id: number;
  nro_obrasocial: number;
  obra_social: string | null;
  nivel: number;
  fecha_cambio: string;
  consulta: number;
};

type RankedOS = {
  nro: number;
  nombre: string;
  consulta: number;
  fechaCambioISO: string | null;
  nivel: number | null;
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

function parseISODateLocal(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  return new Date(y, mo - 1, d);
}

function isoKey(s: string | null | undefined): number {
  const dt = parseISODateLocal(s);
  if (!dt) return -1;
  return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
}

function safeNum(v: any): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.replace(",", "."));
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
    id: Number(r?.id ?? r?.ID ?? 0),
    nro_obrasocial: Number(r?.nro_obrasocial ?? r?.NRO_OBRASOCIAL ?? 0),
    obra_social: (r?.obra_social ?? r?.OBRA_SOCIAL ?? null) as string | null,
    nivel: Number(r?.nivel ?? r?.NIVEL ?? 0),
    fecha_cambio: String(r?.fecha_cambio ?? r?.FECHA_CAMBIO ?? ""),
    consulta: safeNum(r?.consulta ?? r?.CONSULTA),
  };
}

async function fetchValoresBoletin(): Promise<ApiBoletinRow[]> {
  const { data } = await axios.get(ENDPOINTS.valoresBoletin);
  const arr = Array.isArray(data) ? data : [];
  return arr.map(normalizeRow);
}

// Tomamos 1 fila por OS: la más nueva por fecha_cambio (y desempates por nivel / id)
function buildLatestPerOS(rows: ApiBoletinRow[]): RankedOS[] {
  const byOS = new Map<number, ApiBoletinRow[]>();

  for (const r of rows) {
    if (!r?.nro_obrasocial) continue;
    const arr = byOS.get(r.nro_obrasocial) ?? [];
    arr.push(r);
    byOS.set(r.nro_obrasocial, arr);
  }

  const items: RankedOS[] = [];

  for (const [nro, arr] of byOS.entries()) {
    arr.sort((a, b) => {
      const dk = isoKey(b.fecha_cambio) - isoKey(a.fecha_cambio);
      if (dk !== 0) return dk;
      const nk = (b.nivel ?? 0) - (a.nivel ?? 0);
      if (nk !== 0) return nk;
      return (b.id ?? 0) - (a.id ?? 0);
    });

    const top = arr[0];
    items.push({
      nro,
      nombre: normalizeText(top.obra_social ?? `OS ${nro}`),
      consulta: top.consulta ?? 0,
      fechaCambioISO: top.fecha_cambio || null,
      nivel: Number.isFinite(top.nivel) ? top.nivel : null,
    });
  }

  return items;
}

function axiosErrorMessage(e: any): string {
  const status = e?.response?.status;
  const statusText = e?.response?.statusText;
  if (status) return `Error ${status}${statusText ? ` ${statusText}` : ""}`;
  if (e?.code === "ERR_NETWORK") return "Error de red (CORS o backend inaccesible)";
  return "Error al consultar el backend";
}

// Export: intenta XLSX (si existe), si no -> CSV (Excel lo abre igual)
async function exportRankingToExcel(items: RankedOS[]) {
  const rows = items.map((x, i) => ({
    Ranking: i + 1,
    "N° Obra Social": x.nro,
    "Obra Social": x.nombre,
    "Valor Consulta": x.consulta,
  }));

  try {
    const xlsx = await import("xlsx");
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Ranking");
    xlsx.writeFile(wb, "ranking_obras_sociales.xlsx");
    return;
  } catch {
    // fallback CSV
    const header = ["Ranking", "N° Obra Social", "Obra Social", "Valor Consulta"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.Ranking,
          r["N° Obra Social"],
          `"${String(r["Obra Social"]).replaceAll(`"`, `""`)}"`,
          String(r["Valor Consulta"]).replace(".", ","),
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

export default function Boletin() {
  const mountedRef = useRef(true);

  const [data, setData] = useState<RankedOS[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchValoresBoletin();
      const latest = buildLatestPerOS(rows);
      if (!mountedRef.current) return;
      setData(latest);
      if (latest.length === 0) setError("No se detectaron items desde el backend.");
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
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ranking: más caro -> más barato
  const ordered = useMemo(
    () => [...data].sort((a, b) => b.consulta - a.consulta),
    [data]
  );

  const rankByNro = useMemo(() => {
    const m = new Map<number, number>();
    ordered.forEach((x, i) => m.set(x.nro, i + 1));
    return m;
  }, [ordered]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((x) => {
      const name = x.nombre.toLowerCase();
      const nro = String(x.nro);
      return name.includes(q) || nro.includes(q);
    });
  }, [ordered, query]);

  const handleRefresh = async () => {
    setQuery("");
    await load();
  };

  const handleDownload = async () => {
    if (ordered.length === 0) return;
    await exportRankingToExcel(ordered);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Ranking de Obras Sociales</h1>
          <p className={styles.subtitle}>
            Ranking automático usando <b>número</b>, <b>nombre</b> y <b>valor de consulta</b> de las Obras Sociales.
          </p>
        </div>
      </div>

      {/* Actions Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Descargas</h2>
        </div>

        <div className={styles.cardContent}>
          <div className={styles.actions}>

            <Button size="medium" variant="secondary" onClick={handleDownload} disabled={ordered.length === 0 || loading}>
              Descargar Excel
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

      {/* Results */}
      {ordered.length > 0 && (
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
                  <th className={styles.thAmount}>Valor Consulta</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => {
                  const rank = rankByNro.get(row.nro) ?? 0;
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
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                        </span>
                      </td>

                      <td className={styles.tdNumber}>{row.nro}</td>
                      <td className={styles.tdName}>{row.nombre}</td>
                      <td className={styles.tdAmount}>{money.format(row.consulta)}</td>
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
