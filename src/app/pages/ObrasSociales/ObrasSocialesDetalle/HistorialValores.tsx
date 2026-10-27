import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SearchX,
  CalendarDays,
  Paperclip,
  Trash2,
  Upload,
  ListTree,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import s from "./ObrasSocialesDetalle.module.scss";
import HistorialPorCodigo from "./HistorialPorCodigo";
import { abrirAdjunto } from "@/app/shared/lib/archivos";
import { downloadExcelSheet } from "@/app/shared/lib/excelExport";
import { useNotify } from "@/app/hooks/useNotify";
import { usePermisos } from "@/app/auth/usePermisos";
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
import Tabla from "@/app/components/ui/Tabla/Tabla";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import { formatFecha } from "@/app/shared/lib/fechas";
import BotonVer from "@/app/components/ui/BotonVer/BotonVer";
import { formatoPesos } from "@/app/shared/lib/formatos";
import Cargando from "@/app/components/ui/Cargando/Cargando";
import Paginador from "@/app/components/ui/Paginador/Paginador";
import { detalleDeError } from "@/app/shared/lib/httpErrors";


// Filas por página en la tabla "valores por fecha".
const PAGE_SIZE = 50;

type HistorialView = "porcentual" | "por_fecha" | "por_codigo";

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
    // La OS casi nunca pone `descripcion` propia (56.804 de 57.902 filas la tienen NULL): mostrar eso dejaba la columna vacía.
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

/** Valores de UNA vigencia exacta de la obra social, paginando en tandas de a `CONCURRENCIA` en paralelo. */
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
  { key: "codigo",      label: "Código",      numeric: false },
  { key: "descripcion", label: "Descripción", numeric: false },
  { key: "honorarios",  label: "Honorarios",  numeric: true  },
  { key: "ayudante",    label: "Ayudante",    numeric: true  },
  { key: "gastos",      label: "Gastos",      numeric: true  },
  { key: "total",       label: "Total",       numeric: true  },
] as const;

type ColKey = (typeof COLS)[number]["key"];

async function exportToExcel(rows: HistRow[], osName: string, date: string) {
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
  const safeName = osName.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
  await downloadExcelSheet(`Historial-${safeName}-${date}.xlsx`, "Valores", data);
}

function SortIcon({ col, sortField, sortDir }: { col: ColKey; sortField: ColKey | null; sortDir: "asc" | "desc" }) {
  if (sortField !== col) return <ChevronsUpDown size={13} className={s.sortIconNeutral} />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className={s.sortIconActive} />
    : <ChevronDown size={13} className={s.sortIconActive} />;
}

type Props = { obraNro: number; obraNombre: string };

/** Historial de valores de una obra social (nomenclador negociado). */
export default function HistorialValores({ obraNro, obraNombre }: Props) {
  const [historialView, setHistorialView] = useState<HistorialView>("porcentual");
  const [dateFilter, setDateFilter] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [sortField, setSortField] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  // Agregado por vigencia — cuenta y variación promedio — sin bajar la grilla.
  const { data: resumen = [], isLoading: isLoadingResumen } = useQuery({
    queryKey: ["os-resumen-vigencia", obraNro],
    queryFn: () => getResumenPorVigencia(obraNro),
    enabled: !!obraNro,
    staleTime: 5 * 60 * 1000,
  });

  // Grilla completa, pero sólo de la vigencia elegida — se pide recién cuando hace falta, no al entrar a la pantalla.
  const { data: dateRows = [], isLoading: isLoadingDateRows } = useQuery({
    queryKey: ["os-valores-vigencia", obraNro, dateFilter],
    queryFn: () => fetchValoresDeVigencia(obraNro, dateFilter),
    enabled: !!obraNro && !!dateFilter,
    staleTime: 5 * 60 * 1000,
  });

  // ── Documentos de respaldo ─────────────────────────────────────────────────
  // La otra mitad del registro de cada actualización: la nota, el Excel o el CSV con el que llegaron esos precios.
  const { error: avisarError, success: avisarOk } = useNotify();
  // Sin esto, quien sólo puede leer (rol médico) veía "Adjuntar" y el tacho de basura y se enteraba de que no podía recién al…
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
    } catch (e) {
      avisarError(detalleDeError(e, "No se pudo subir el documento."));
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
    } catch (e) {
      avisarError(detalleDeError(e, "No se pudo eliminar el documento."));
    } finally {
      setBorrandoDoc(null);
    }
  };

  // ── Porcentual groups ──────────────────────────────────────────────────────
  // El agregado (cuenta + variación promedio) ya viene calculado del servidor contra `nm_historial_precio_codigo` — acá sólo se adapta la forma para el render.
  const porcentualGroups = useMemo(
    () => resumen.map((r) => ({ date: r.vigencia_desde, count: r.cantidad, avgPct: r.avg_pct })),
    [resumen]
  );

  // ── Por fecha table ────────────────────────────────────────────────────────
  // Se suman las vigencias que sólo tienen documento: la nota de la obra social suele llegar antes de que alguien cargue los precios.
  const availableDates = useMemo(() => {
    const dates = new Set(resumen.map((r) => r.vigencia_desde));
    for (const doc of documentos) dates.add(doc.vigencia_desde);
    return [...dates].sort().reverse();
  }, [resumen, documentos]);

  const displayRows = useMemo(() => {
    let result = dateRows;
    if (codeFilter.trim()) {
      const term = codeFilter.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.codigo.toLowerCase().includes(term) ||
          (r.descripcion ?? "").toLowerCase().includes(term),
      );
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
      <div className={s.historialToggleRow} role="group" aria-label="Vista">
        <button
          className={`${s.historialToggleBtn} ${historialView === "porcentual" ? s.historialToggleBtnActive : ""}`}
          onClick={() => setHistorialView("porcentual")}
        >
          <TrendingUp size={18} aria-hidden="true" />
          Actualizaciones
        </button>
        <button
          className={`${s.historialToggleBtn} ${historialView === "por_fecha" ? s.historialToggleBtnActive : ""}`}
          onClick={() => setHistorialView("por_fecha")}
        >
          <History size={18} aria-hidden="true" />
          Valores
        </button>
        <button
          className={`${s.historialToggleBtn} ${historialView === "por_codigo" ? s.historialToggleBtnActive : ""}`}
          onClick={() => setHistorialView("por_codigo")}
        >
          <ListTree size={15} />
          Por código
        </button>
      </div>

      {historialView === "por_codigo" && <HistorialPorCodigo obraNro={obraNro} />}

      {/* ── Porcentual view ── */}
      {historialView === "porcentual" && isLoadingResumen && (
        <div className={s.hLoadingState}>
          <Cargando size={22} />
          <span>Cargando…</span>
        </div>
      )}
      {historialView === "porcentual" && !isLoadingResumen && (
        <>
          {porcentualGroups.length === 0 ? (
            <div className={s.hEmptyState}>
              <SearchX size={28} />
              <span>Sin actualizaciones</span>
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
                            : "Sin fecha"}
                        </span>
                        <span className={s.porcentualCount}>
                          {group.count} código{group.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className={s.porcentualRight}>
                      {/* Cuántos respaldos tiene esta actualización. */}
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
                        <BotonVer onClick={() => switchToDate(group.date!)} etiqueta="Ver valores" />
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
              <CalendarDays size={18} aria-hidden="true" />
              Vigencia
            </label>
            <select
              className={s.porFechaSelect}
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setCodeFilter(""); setSortField(null); }}
            >
              <option value="">Elegí una fecha</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>{formatFecha(d)}</option>
              ))}
            </select>
          </div>

          {!dateFilter && (
            <div className={s.hEmptyState}>
              <CalendarDays size={28} />
              <span>Elegí una vigencia</span>
            </div>
          )}

          {/* Respaldo de la actualización: la nota, el Excel o el CSV que mandó la obra social. */}
          {dateFilter && (
            <div className={s.docsPanel}>
              <div className={s.docsHeader}>
                <h3 className={s.docsTitle}>
                  <Paperclip size={18} aria-hidden="true" />
                  Respaldo
                </h3>
                {puedeEditarDocs && (
                  <div className={s.docsUploadGroup}>
                    <input
                      type="text"
                      className={s.docDescInput}
                      placeholder="Nota"
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
                      {subiendo ? <Cargando size={16} /> : <Upload size={16} />}
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
                  Sin documentos · PDF, Excel o CSV
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
                          <span className={s.docSubidoPor}>{doc.subido_por_nombre}</span>
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
                          <Trash2 size={16} aria-hidden="true" />
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
              <Cargando size={22} />
              <span>Cargando…</span>
            </div>
          )}

          {dateFilter && !isLoadingDateRows && dateRows.length === 0 && (
            <div className={s.hEmptyState}>
              <SearchX size={28} />
              <span>Sin valores en esta vigencia</span>
            </div>
          )}

          {dateFilter && !isLoadingDateRows && dateRows.length > 0 && (
            <>
              {/* Toolbar */}
              <div className={s.hToolbar}>
                <div className={s.hToolbarLeft}>
                  <SearchField
                    placeholder="Buscar código…"
                    value={codeFilter}
                    onChange={(e) => setCodeFilter(e.target.value)}
                    onClear={() => setCodeFilter("")}
                  />
                  <span className={s.countBadge}>
                    {codeFilter.trim()
                      ? `${displayRows.length} de ${dateRows.length}`
                      : `${dateRows.length} código${dateRows.length !== 1 ? "s" : ""}`}
                  </span>
                </div>
                <BotonDescarga
                  formato="excel"
                  onClick={() => void handleExport()}
                  disabled={displayRows.length === 0}
                  cargando={exporting}
                />
              </div>

              {displayRows.length === 0 && codeFilter.trim() ? (
                <div className={s.hEmptyState}>
                  <SearchX size={28} />
                  <span>Nada coincide con la búsqueda</span>
                </div>
              ) : (
                <>
                  <div className={s.tableContainer}>
                    <Tabla className={s.hTable}>
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
                            <td
                              className={`${s.tdDesc} ${row.descripcion ? "" : s.tdDescEmpty}`}
                              title={row.descripcion ?? undefined}
                            >
                              {row.descripcion || "—"}
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
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{formatoPesos.format(row.honorarios)}</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{formatoPesos.format(row.ayudante)}</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{formatoPesos.format(row.gastos)}</td>
                                <td className={`${s.tdRight} ${s.tdMoney}`}>{formatoPesos.format(row.total)}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </Tabla>
                  </div>

                  {totalPages > 1 && (
                    <Paginador pagina={page} totalPaginas={totalPages} onCambiar={setPage} />
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
