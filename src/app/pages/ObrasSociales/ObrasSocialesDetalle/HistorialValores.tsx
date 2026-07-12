import { useCallback, useEffect, useMemo, useState } from "react";
import {
  History, TrendingUp, TrendingDown, Minus,
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Download, Loader2, SearchX, X as XIcon, CalendarDays,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import s from "./ObrasSocialesDetalle.module.scss";
import { listValores } from "../../NomencladorNacional/nomenclador.api";
import type { ValorOut, ValorEstado, Origen } from "../../NomencladorNacional/nomenclador.types";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Filas por página en la tabla "valores por fecha".
const PAGE_SIZE = 50;

type HistorialView = "porcentual" | "por_fecha";

/** Fila de historial derivada de un Valor del nomenclador negociado (nm_valores). */
type HistRow = {
  id: number;
  codigo: string;
  descripcion: string | null;
  origen: Origen;
  nivel: number | null;
  /** Agrupa versiones de la MISMA variante para calcular el % vs. la anterior. */
  variantKey: string;
  vigencia_desde: string;
  vigencia_hasta: string | null;
  estado: ValorEstado;
  por_presupuesto: boolean;
  honorarios: number;
  ayudante: number;
  gastos: number;
  total: number;
};

function subtotalOf(v: ValorOut, concepto: string): number {
  const c = v.componentes.find((x) => x.concepto.toLowerCase() === concepto.toLowerCase());
  return c ? parseFloat(c.subtotal) || 0 : 0;
}

function toHistRow(v: ValorOut): HistRow {
  const honorarios = subtotalOf(v, "Honorarios");
  const ayudante = subtotalOf(v, "Ayudante");
  const gastos = subtotalOf(v, "Gastos");
  return {
    id: v.id,
    codigo: v.codigo,
    descripcion: v.descripcion,
    origen: v.origen,
    nivel: v.nivel,
    variantKey: `${v.codigo}|${v.origen}|${v.especialidad_id_colegio ?? ""}|${v.nivel ?? ""}`,
    vigencia_desde: v.vigencia_desde,
    vigencia_hasta: v.vigencia_hasta,
    estado: v.estado,
    por_presupuesto: v.por_presupuesto,
    honorarios,
    ayudante,
    gastos,
    total: honorarios + ayudante + gastos,
  };
}

// Historial completo de la OS: trae todas las vigencias (activas y cerradas) de
// /api/valores_nm/, paginando hasta agotar. Cada Valor es una versión de un código.
async function fetchHistorialOS(nroOS: number): Promise<HistRow[]> {
  const all: HistRow[] = [];
  const size = 200;
  for (let page = 1; page <= 100; page++) {
    const batch = await listValores({ obra_social_nro: nroOS, page, size });
    all.push(...batch.map(toHistRow));
    if (batch.length < size) break;
  }
  return all;
}

const COLS = [
  { key: "codigo",     label: "Código",     numeric: false },
  { key: "honorarios", label: "Honorarios", numeric: true  },
  { key: "ayudante",   label: "Ayudante",   numeric: true  },
  { key: "gastos",     label: "Gastos",     numeric: true  },
  { key: "total",      label: "Total",      numeric: true  },
] as const;

type ColKey = (typeof COLS)[number]["key"];

async function exportToExcel(rows: HistRow[], osName: string, date: string) {
  const [{ utils, write }, { saveAs }] = await Promise.all([
    import("xlsx"),
    import("file-saver"),
  ]);
  const data = rows.map((r) => ({
    "Código":         r.codigo,
    "Descripción":    r.descripcion ?? "",
    "Honorarios":     r.honorarios,
    "Ayudante":       r.ayudante,
    "Gastos":         r.gastos,
    "Total":          r.total,
    "Origen":         r.origen,
    "Nivel":          r.nivel ?? "",
    "Estado":         r.estado,
    "Vigencia desde": r.vigencia_desde,
    "Vigencia hasta": r.vigencia_hasta ?? "",
    "Por presupuesto": r.por_presupuesto ? "Sí" : "",
  }));
  const ws = utils.json_to_sheet(data);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Valores");
  const safeName = osName.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
  const buffer = write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  saveAs(
    new Blob([buffer], { type: "application/octet-stream" }),
    `Historial-${safeName}-${date}.xlsx`
  );
}

function SortIcon({ col, sortField, sortDir }: { col: ColKey; sortField: ColKey | null; sortDir: "asc" | "desc" }) {
  if (sortField !== col) return <ChevronsUpDown size={13} className={s.sortIconNeutral} />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className={s.sortIconActive} />
    : <ChevronDown size={13} className={s.sortIconActive} />;
}

type Props = { obraNro: number; obraNombre: string };

/**
 * Historial de valores de una obra social (nomenclador negociado). Reutilizable:
 * lo usa la ficha de la OS y la consulta directa desde el menú lateral.
 */
export default function HistorialValores({ obraNro, obraNombre }: Props) {
  const [historialView, setHistorialView] = useState<HistorialView>("porcentual");
  const [dateFilter, setDateFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [sortField, setSortField] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const { data: rows = [], isLoading: isLoadingRows } = useQuery({
    queryKey: ["os-historial-valores", obraNro],
    queryFn: () => fetchHistorialOS(obraNro),
    enabled: !!obraNro,
    staleTime: 5 * 60 * 1000,
  });

  // ── Porcentual groups ──────────────────────────────────────────────────────
  const porcentualGroups = useMemo(() => {
    if (!rows.length) return [];

    // Cadena de versiones por variante (código+origen+especialidad+nivel), asc por vigencia.
    const byVariant = new Map<string, HistRow[]>();
    for (const row of rows) {
      if (!byVariant.has(row.variantKey)) byVariant.set(row.variantKey, []);
      byVariant.get(row.variantKey)!.push(row);
    }
    for (const [, chain] of byVariant) {
      chain.sort((a, b) => a.vigencia_desde.localeCompare(b.vigencia_desde));
    }

    // Agrupa por vigencia_desde (la fecha en que un nuevo precio entra en vigencia).
    const byDate = new Map<string, HistRow[]>();
    for (const row of rows) {
      const key = row.vigencia_desde ?? "__none__";
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(row);
    }

    const sorted = [...byDate.entries()].sort(([a], [b]) => {
      if (a === "__none__") return 1;
      if (b === "__none__") return -1;
      return b.localeCompare(a);
    });

    return sorted.map(([dateKey, dateRows]) => {
      const pctChanges: number[] = [];
      for (const row of dateRows) {
        const chain = byVariant.get(row.variantKey) ?? [];
        const thisIdx = chain.findIndex((r) => r.id === row.id);
        if (thisIdx > 0) {
          const prior = chain[thisIdx - 1];
          if (prior.total > 0) {
            pctChanges.push(((row.total - prior.total) / prior.total) * 100);
          }
        }
      }
      const avgPct =
        pctChanges.length > 0
          ? pctChanges.reduce((a, b) => a + b, 0) / pctChanges.length
          : null;

      return { date: dateKey === "__none__" ? null : dateKey, count: dateRows.length, avgPct };
    });
  }, [rows]);

  // ── Por fecha table ────────────────────────────────────────────────────────
  const availableDates = useMemo(() => {
    const dates = new Set(rows.map((r) => r.vigencia_desde).filter(Boolean));
    return [...dates].sort().reverse();
  }, [rows]);

  const dateRows = useMemo(
    () => (dateFilter ? rows.filter((r) => r.vigencia_desde === dateFilter) : []),
    [rows, dateFilter]
  );

  const displayRows = useMemo(() => {
    let result = dateRows;
    if (codeFilter.trim()) {
      const term = codeFilter.trim().toLowerCase();
      result = result.filter((r) => r.codigo.toLowerCase().includes(term));
    }
    if (sortField) {
      result = [...result].sort((a, b) => {
        const av = a[sortField] ?? "";
        const bv = b[sortField] ?? "";
        if (typeof av === "number" && typeof bv === "number")
          return sortDir === "asc" ? av - bv : bv - av;
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv), "es")
          : String(bv).localeCompare(String(av), "es");
      });
    }
    return result;
  }, [dateRows, codeFilter, sortField, sortDir]);

  // ── Pagination ───────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(displayRows.length / PAGE_SIZE));

  // Volver a la página 1 cuando cambia el conjunto (fecha/filtro/orden/OS).
  useEffect(() => {
    setPage(1);
  }, [dateFilter, codeFilter, sortField, sortDir, obraNro]);

  // Si el total de páginas se achica por debajo de la actual, ajustar.
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedRows = useMemo(
    () => displayRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [displayRows, page]
  );

  const handleSort = useCallback((key: ColKey) => {
    setSortField((prev) => {
      if (prev === key) { setSortDir((d) => (d === "asc" ? "desc" : "asc")); return prev; }
      setSortDir("asc");
      return key;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!displayRows.length) return;
    setExporting(true);
    try { await exportToExcel(displayRows, obraNombre, dateFilter); }
    finally { setExporting(false); }
  }, [displayRows, obraNombre, dateFilter]);

  const switchToDate = useCallback((date: string) => {
    setHistorialView("por_fecha");
    setDateFilter(date);
    setCodeFilter("");
    setSortField(null);
  }, []);

  return (
    <div className={s.historialContainer}>

      {/* Sub-view toggle */}
      <div className={s.historialToggleRow}>
        <button
          className={`${s.historialToggleBtn} ${historialView === "porcentual" ? s.historialToggleBtnActive : ""}`}
          onClick={() => setHistorialView("porcentual")}
        >
          <TrendingUp size={15} />
          Actualizaciones porcentuales
        </button>
        <button
          className={`${s.historialToggleBtn} ${historialView === "por_fecha" ? s.historialToggleBtnActive : ""}`}
          onClick={() => setHistorialView("por_fecha")}
        >
          <History size={15} />
          Valores por fecha
        </button>
      </div>

      {/* Loading state */}
      {isLoadingRows && (
        <div className={s.hLoadingState}>
          <Loader2 size={22} className={s.spinIcon} />
          <span>Cargando historial de {obraNombre}…</span>
        </div>
      )}

      {/* ── Porcentual view ── */}
      {!isLoadingRows && historialView === "porcentual" && (
        <>
          {porcentualGroups.length === 0 ? (
            <div className={s.hEmptyState}>
              <SearchX size={28} />
              <span>No se encontraron registros de actualizaciones para esta obra social.</span>
            </div>
          ) : (
            <div className={s.porcentualList}>
              {porcentualGroups.map((group, i) => {
                const isPositive = group.avgPct !== null && group.avgPct > 0;
                const isNegative = group.avgPct !== null && group.avgPct < 0;
                return (
                  <div key={group.date ?? `nodate-${i}`} className={s.porcentualItem}>
                    <div className={s.porcentualLeft}>
                      <div className={s.porcentualDot} />
                      <div className={s.porcentualInfo}>
                        <span className={s.porcentualDate}>
                          {group.date
                            ? new Date(group.date + "T00:00:00").toLocaleDateString("es-AR", { dateStyle: "long" })
                            : "Sin fecha registrada"}
                        </span>
                        <span className={s.porcentualCount}>
                          {group.count} código{group.count !== 1 ? "s" : ""} actualizados
                        </span>
                      </div>
                    </div>

                    <div className={s.porcentualRight}>
                      {group.avgPct !== null ? (
                        <span className={`${s.porcentualPct} ${isPositive ? s.porcentualPctUp : isNegative ? s.porcentualPctDown : ""}`}>
                          {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
                          {group.avgPct > 0 ? "+" : ""}{group.avgPct.toFixed(2)}%
                        </span>
                      ) : (
                        <span className={s.porcentualPctNa}>Primera carga</span>
                      )}

                      {group.date && (
                        <button
                          className={s.porcentualVerBtn}
                          onClick={() => switchToDate(group.date!)}
                        >
                          Ver valores
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Por fecha view ── */}
      {!isLoadingRows && historialView === "por_fecha" && (
        <div className={s.porFechaSection}>
          {/* Date select */}
          <div className={s.porFechaHeader}>
            <label className={s.porFechaLabel}>
              <CalendarDays size={14} />
              Vigencia desde
            </label>
            <select
              className={s.porFechaSelect}
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCodeFilter(""); setSortField(null); }}
            >
              <option value="">— Seleccioná una fecha —</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {!dateFilter && (
            <div className={s.hEmptyState}>
              <CalendarDays size={28} />
              <span>Seleccioná una vigencia para ver los valores.</span>
            </div>
          )}

          {dateFilter && dateRows.length === 0 && (
            <div className={s.hEmptyState}>
              <SearchX size={28} />
              <span>No hay valores registrados para la vigencia {dateFilter}.</span>
            </div>
          )}

          {dateFilter && dateRows.length > 0 && (
            <>
              {/* Toolbar */}
              <div className={s.hToolbar}>
                <div className={s.hToolbarLeft}>
                  <div className={s.filterBar}>
                    <Search size={14} className={s.filterIcon} />
                    <input
                      className={s.filterInput}
                      placeholder="Filtrar por código..."
                      value={codeFilter}
                      onChange={(e) => setCodeFilter(e.target.value)}
                    />
                    {codeFilter && (
                      <button className={s.filterClear} onClick={() => setCodeFilter("")}>
                        <XIcon size={13} />
                      </button>
                    )}
                  </div>
                  <span className={s.countBadge}>
                    {codeFilter.trim()
                      ? `${displayRows.length} de ${dateRows.length}`
                      : `${dateRows.length} código${dateRows.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <button
                  className={s.exportBtn}
                  disabled={displayRows.length === 0 || exporting}
                  onClick={() => void handleExport()}
                >
                  {exporting ? <Loader2 size={14} className={s.spinIcon} /> : <Download size={14} />}
                  {exporting ? "Exportando..." : "Exportar Excel"}
                </button>
              </div>

              {displayRows.length === 0 && codeFilter.trim() ? (
                <div className={s.hEmptyState}>
                  <SearchX size={28} />
                  <span>Ningún código coincide con "{codeFilter}".</span>
                </div>
              ) : (
                <>
                  <div className={s.tableContainer}>
                    <table className={s.hTable}>
                      <thead>
                        <tr>
                          {COLS.map((col) => (
                            <th
                              key={col.key}
                              className={col.numeric ? s.thRight : ""}
                              onClick={() => handleSort(col.key)}
                            >
                              <span className={s.thInner}>
                                {col.label}
                                <SortIcon col={col.key} sortField={sortField} sortDir={sortDir} />
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pagedRows.map((row) => (
                          <tr key={row.id}>
                            <td className={s.tdCode}>
                              {row.codigo}{row.nivel != null ? ` · N${row.nivel}` : ""}
                            </td>
                            {row.por_presupuesto ? (
                              <>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>—</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>—</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>—</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>Por presupuesto</td>
                              </>
                            ) : (
                              <>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{money.format(row.honorarios)}</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{money.format(row.ayudante)}</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{money.format(row.gastos)}</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{money.format(row.total)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className={s.pagination} role="navigation" aria-label="Paginación">
                      <button
                        type="button"
                        className={s.pageBtn}
                        disabled={page === 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        ‹ Anterior
                      </button>
                      <span className={s.pageInfo}>Página {page} de {totalPages}</span>
                      <button
                        type="button"
                        className={s.pageBtn}
                        disabled={page === totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Siguiente ›
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
