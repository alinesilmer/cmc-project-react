import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  History, TrendingUp, TrendingDown, Minus,
  Search, ChevronUp, ChevronDown, ChevronsUpDown,
  Download, Loader2, SearchX, X as XIcon, CalendarDays,
  Paperclip, Trash2, Upload,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import s from "./ObrasSocialesDetalle.module.scss";
import { abrirAdjunto } from "../../../lib/archivos";
import { useNotify } from "../../../hooks/useNotify";
import { usePermisos } from "../../../auth/usePermisos";
import {
  eliminarValorDocumento,
  getResumenPorVigencia,
  listValorDocumentos,
  listValores,
  subirValorDocumento,
} from "../../NomencladorNacional/nomenclador.api";
import type {
  ValorOut, ValorEstado, Origen, ValorDocumentoOut,
} from "../../NomencladorNacional/nomenclador.types";

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
    // La OS casi nunca pone `descripcion` propia (56.804 de 57.902 filas la
    // tienen NULL): mostrar eso dejaba la columna vacía. `descripcion_efectiva`
    // ya resuelve la herencia contra el catálogo del lado del servidor. Ver
    // auditoría H-04.
    descripcion: v.descripcion_efectiva || v.descripcion,
    origen: v.origen,
    nivel: v.nivel,
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

/**
 * Valores de UNA vigencia exacta de la obra social, paginando en tandas de a
 * `CONCURRENCIA` en paralelo.
 *
 * Antes esto traía la obra social ENTERA — para NOBIS MEDICAL (N° 62), 3.334
 * filas con sus componentes en 17 requests y 4,29 MB — para terminar mostrando
 * sólo la vigencia que el usuario eligió. Ahora el filtro
 * `vigencia_desde` va en la query: sólo se pide lo que la grilla va a mostrar.
 * La otra pregunta —cuándo y cuánto actualizó la obra social, sin entrar a
 * ninguna fecha en particular— la resuelve `getResumenPorVigencia()`, que ya
 * viene agregada del servidor. Ver auditoría H-01.
 */
async function fetchValoresDeVigencia(nroOS: number, vigenciaDesde: string): Promise<HistRow[]> {
  const size = 200;
  const CONCURRENCIA = 5;
  const TOPE_PAGINAS = 100; // una sola vigencia no debería pasar de esto

  const all: HistRow[] = [];
  let pagina = 1;
  let sigue = true;

  while (sigue && pagina <= TOPE_PAGINAS) {
    const tanda = Array.from({ length: CONCURRENCIA }, (_, i) => pagina + i);
    const resultados = await Promise.all(
      tanda.map((p) =>
        listValores({ obra_social_nro: nroOS, vigencia_desde: vigenciaDesde, page: p, size })
      )
    );
    for (const batch of resultados) {
      all.push(...batch.map(toHistRow));
      if (batch.length < size) {
        sigue = false;
        break;
      }
    }
    pagina += CONCURRENCIA;
  }
  return all;
}

/** Lo que la obra social manda cuando actualiza precios. */
const FORMATOS_DOC = ".pdf,.xlsx,.xls,.csv";

function pesoLegible(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  // Agregado por vigencia — cuenta y variación promedio — sin bajar la grilla.
  // Alimenta la vista "Actualizaciones porcentuales". Ver H-01/H-02.
  const { data: resumen = [], isLoading: isLoadingResumen } = useQuery({
    queryKey: ["os-resumen-vigencia", obraNro],
    queryFn: () => getResumenPorVigencia(obraNro),
    enabled: !!obraNro,
    staleTime: 5 * 60 * 1000,
  });

  // Grilla completa, pero sólo de la vigencia elegida — se pide recién cuando
  // hace falta, no al entrar a la pantalla.
  const { data: dateRows = [], isLoading: isLoadingDateRows } = useQuery({
    queryKey: ["os-valores-vigencia", obraNro, dateFilter],
    queryFn: () => fetchValoresDeVigencia(obraNro, dateFilter),
    enabled: !!obraNro && !!dateFilter,
    staleTime: 5 * 60 * 1000,
  });

  // ── Documentos de respaldo ─────────────────────────────────────────────────
  // La otra mitad del registro de cada actualización: la nota, el Excel o el
  // CSV con el que llegaron esos precios. Se traen todos los de la OS de una
  // sola vez y se agrupan por vigencia acá — son unos pocos, y así la lista de
  // actualizaciones puede mostrar el contador sin una request por fila.
  const { error: avisarError, success: avisarOk } = useNotify();
  // Sin esto, quien sólo puede leer (rol médico) veía "Adjuntar" y el tacho de
  // basura y se enteraba de que no podía recién al hacer clic (403). Ver H-06.
  const { can } = usePermisos();
  const puedeEditarDocs = can("nomenclador:editar");
  const [subiendo, setSubiendo] = useState(false);
  const [docDescripcion, setDocDescripcion] = useState("");
  const [borrandoDoc, setBorrandoDoc] = useState<number | null>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const {
    data: documentos = [],
    refetch: refetchDocumentos,
  } = useQuery({
    queryKey: ["os-valores-documentos", obraNro],
    queryFn: () => listValorDocumentos(obraNro),
    enabled: !!obraNro,
    staleTime: 5 * 60 * 1000,
  });

  const docsPorVigencia = useMemo(() => {
    const mapa = new Map<string, ValorDocumentoOut[]>();
    for (const doc of documentos) {
      if (!mapa.has(doc.vigencia_desde)) mapa.set(doc.vigencia_desde, []);
      mapa.get(doc.vigencia_desde)!.push(doc);
    }
    return mapa;
  }, [documentos]);

  const docsDeLaFecha = dateFilter ? docsPorVigencia.get(dateFilter) ?? [] : [];

  const subirDoc = async (file: File | null) => {
    if (!file || !dateFilter || subiendo) return;
    setSubiendo(true);
    try {
      await subirValorDocumento({
        obra_social_nro: obraNro,
        vigencia_desde: dateFilter,
        archivo: file,
        descripcion: docDescripcion,
      });
      await refetchDocumentos();
      setDocDescripcion("");
      avisarOk("Documento adjuntado.");
    } catch (e: any) {
      avisarError(e?.response?.data?.detail ?? "No se pudo subir el documento.");
    } finally {
      setSubiendo(false);
      // Sin esto, volver a elegir el mismo archivo no dispara el change.
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const borrarDoc = async (doc: ValorDocumentoOut) => {
    if (borrandoDoc !== null) return;
    setBorrandoDoc(doc.id);
    try {
      await eliminarValorDocumento(doc.id);
      await refetchDocumentos();
    } catch (e: any) {
      avisarError(e?.response?.data?.detail ?? "No se pudo eliminar el documento.");
    } finally {
      setBorrandoDoc(null);
    }
  };

  // ── Porcentual groups ──────────────────────────────────────────────────────
  // El agregado (cuenta + variación promedio) ya viene calculado del servidor
  // contra `nm_historial_precio_codigo` — acá sólo se adapta la forma para el
  // render. Ver H-01/H-02.
  const porcentualGroups = useMemo(
    () => resumen.map((r) => ({ date: r.vigencia_desde, count: r.cantidad, avgPct: r.avg_pct })),
    [resumen]
  );

  // ── Por fecha table ────────────────────────────────────────────────────────
  // Se suman las vigencias que sólo tienen documento: la nota de la obra social
  // suele llegar antes de que alguien cargue los precios, y si el selector se
  // armara sólo con los valores, ese adjunto quedaría inalcanzable.
  const availableDates = useMemo(() => {
    const dates = new Set(resumen.map((r) => r.vigencia_desde));
    for (const doc of documentos) dates.add(doc.vigencia_desde);
    return [...dates].sort().reverse();
  }, [resumen, documentos]);

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

      {/* ── Porcentual view ── */}
      {historialView === "porcentual" && isLoadingResumen && (
        <div className={s.hLoadingState}>
          <Loader2 size={22} className={s.spinIcon} />
          <span>Cargando historial de {obraNombre}…</span>
        </div>
      )}
      {historialView === "porcentual" && !isLoadingResumen && (
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
                      {/* Cuántos respaldos tiene esta actualización. Sin
                          adjuntos no se dice nada: la fila ya es larga. */}
                      {group.date && (docsPorVigencia.get(group.date)?.length ?? 0) > 0 && (
                        <span className={s.docBadge} title="Documentos de respaldo">
                          <Paperclip size={13} />
                          {docsPorVigencia.get(group.date)!.length}
                        </span>
                      )}
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
      {historialView === "por_fecha" && (
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

          {/* Respaldo de la actualización: la nota, el Excel o el CSV que
              mandó la obra social. Va arriba de la grilla porque es el origen
              de lo que la grilla muestra. */}
          {dateFilter && (
            <div className={s.docsPanel}>
              <div className={s.docsHeader}>
                <h3 className={s.docsTitle}>
                  <Paperclip size={14} />
                  Documentos de la actualización
                </h3>
                {puedeEditarDocs && (
                  <div className={s.docsUploadGroup}>
                    <input
                      type="text"
                      className={s.docDescInput}
                      placeholder="Nota (opcional)"
                      value={docDescripcion}
                      onChange={(e) => setDocDescripcion(e.target.value)}
                      disabled={subiendo}
                      aria-label="Nota del documento"
                    />
                    <label
                      className={s.docsUploadBtn}
                      htmlFor="valor-doc-file"
                      aria-disabled={subiendo}
                    >
                      {subiendo ? <Loader2 size={13} className={s.spinIcon} /> : <Upload size={13} />}
                      {subiendo ? "Subiendo…" : "Adjuntar"}
                    </label>
                    <input
                      id="valor-doc-file"
                      ref={docInputRef}
                      type="file"
                      className={s.docsInput}
                      accept={FORMATOS_DOC}
                      disabled={subiendo}
                      onChange={(e) => void subirDoc(e.target.files?.[0] ?? null)}
                    />
                  </div>
                )}
              </div>

              {docsDeLaFecha.length === 0 ? (
                <p className={s.docsEmpty}>
                  Sin documentos. Se aceptan PDF, Excel y CSV.
                </p>
              ) : (
                <div className={s.docsList}>
                  {docsDeLaFecha.map((doc) => (
                    <div key={doc.id} className={s.docItem}>
                      <div className={s.docNameCol}>
                        <button
                          type="button"
                          className={s.docName}
                          title={doc.descripcion ?? doc.nombre_original}
                          onClick={() =>
                            abrirAdjunto(doc.url).catch((err) => avisarError(err.message))
                          }
                        >
                          {doc.nombre_original}
                        </button>
                        {doc.subido_por_nombre && (
                          <span className={s.docSubidoPor}>Subido por {doc.subido_por_nombre}</span>
                        )}
                      </div>
                      <span className={s.docMeta}>{pesoLegible(doc.size)}</span>
                      {puedeEditarDocs && (
                        <button
                          type="button"
                          className={s.docDeleteBtn}
                          disabled={borrandoDoc === doc.id}
                          aria-label={`Eliminar ${doc.nombre_original}`}
                          onClick={() => void borrarDoc(doc)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {dateFilter && isLoadingDateRows && (
            <div className={s.hLoadingState}>
              <Loader2 size={22} className={s.spinIcon} />
              <span>Cargando valores de la vigencia {dateFilter}…</span>
            </div>
          )}

          {dateFilter && !isLoadingDateRows && dateRows.length === 0 && (
            <div className={s.hEmptyState}>
              <SearchX size={28} />
              <span>No hay valores registrados para la vigencia {dateFilter}.</span>
            </div>
          )}

          {dateFilter && !isLoadingDateRows && dateRows.length > 0 && (
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
