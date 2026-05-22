"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Search, Building2, ChevronUp, ChevronDown,
  ChevronsUpDown, Download, Loader2, SearchX, X as XIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import styles from "./TablaValores.module.scss";
import Button from "../../components/atoms/Button/Button";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import {
  extractRowsFromPayload,
  normalizeRow,
} from "../BoletinConsultaComun/boletinConsultaComun.api";
import type { ApiBoletinRow } from "../BoletinConsultaComun/boletinConsultaComun.types";
import { moneyFormatter, BOLETIN_ENDPOINTS } from "../BoletinConsultaComun/boletinConsultaComun.constants";

const BOLETIN_URL = BOLETIN_ENDPOINTS[0];

async function fetchRowsForOS(
  nroOS: number,
  signal?: AbortSignal
): Promise<ApiBoletinRow[]> {
  const allRows: ApiBoletinRow[] = [];
  for (let page = 1; page <= 50; page++) {
    const response = await axios.get(BOLETIN_URL, {
      signal,
      timeout: 20000,
      withCredentials: false,
      headers: { Accept: "application/json" },
      params: { nro_obra_social: nroOS, page, size: 500 },
    });
    const rows = (extractRowsFromPayload(response.data) ?? []).map(normalizeRow);
    if (!rows.length) break;
    allRows.push(...rows.filter((r) => r.nro_obrasocial === nroOS));
    if (rows.length < 500) break;
  }
  return allRows;
}

// ─── Column definitions ───────────────────────────────────────────────────────

const COLS = [
  { key: "codigos",      label: "Código",   numeric: false },
  { key: "honorarios_a", label: "Hon. A",   numeric: true  },
  { key: "honorarios_b", label: "Hon. B",   numeric: true  },
  { key: "honorarios_c", label: "Hon. C",   numeric: true  },
  { key: "gastos",       label: "Gastos",   numeric: true  },
  { key: "ayudante_a",   label: "Ayud. A",  numeric: true  },
  { key: "ayudante_b",   label: "Ayud. B",  numeric: true  },
  { key: "ayudante_c",   label: "Ayud. C",  numeric: true  },
  { key: "fecha_cambio", label: "Vigencia", numeric: false },
] as const;

type ColKey = (typeof COLS)[number]["key"];

// ─── Export ───────────────────────────────────────────────────────────────────

async function exportToExcel(rows: ApiBoletinRow[], osName: string, nroOS: number) {
  const [{ utils, write }, { saveAs }] = await Promise.all([
    import("xlsx"),
    import("file-saver"),
  ]);

  const data = rows.map((r) => ({
    "Código":       r.codigos,
    "Honorarios A": r.honorarios_a,
    "Honorarios B": r.honorarios_b,
    "Honorarios C": r.honorarios_c,
    "Gastos":       r.gastos,
    "Ayudante A":   r.ayudante_a,
    "Ayudante B":   r.ayudante_b,
    "Ayudante C":   r.ayudante_c,
    "Vigencia":     r.fecha_cambio ?? "",
  }));

  const ws = utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
    { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
  ];

  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, "Valores");

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const safeName = osName.replace(/[/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
  const filename = `TablaValores-${safeName}-${nroOS}-${date}.xlsx`;

  const buffer = write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  saveAs(new Blob([buffer], { type: "application/octet-stream" }), filename);
}

// ─── Sort icon helper ─────────────────────────────────────────────────────────

function SortIcon({
  col,
  sortField,
  sortDir,
}: {
  col: ColKey;
  sortField: ColKey | null;
  sortDir: "asc" | "desc";
}) {
  if (sortField !== col)
    return <ChevronsUpDown size={13} className={styles.sortIconNeutral} />;
  return sortDir === "asc"
    ? <ChevronUp size={13} className={styles.sortIconActive} />
    : <ChevronDown size={13} className={styles.sortIconActive} />;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TablaValores() {
  const [selectedNroOS, setSelectedNroOS] = useState<number | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [codeFilter, setCodeFilter] = useState("");
  const [sortField, setSortField] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [exporting, setExporting] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────────────
  const { data: osList = [], isLoading: isLoadingOS } = useQuery({
    queryKey: ["obras-sociales-list"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rows = [], isLoading: isLoadingRows } = useQuery({
    queryKey: ["tabla-valores", selectedNroOS],
    queryFn: ({ signal }) => fetchRowsForOS(selectedNroOS!, signal),
    enabled: selectedNroOS != null,
    staleTime: 5 * 60 * 1000,
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 60);
    const term = osSearch.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre.toLowerCase().includes(term) ||
          String(os.nro_obra_social).includes(term)
      )
      .slice(0, 60);
  }, [osList, osSearch]);

  const selectedOSName = useMemo(
    () => osList.find((os) => os.nro_obra_social === selectedNroOS)?.nombre ?? "",
    [osList, selectedNroOS]
  );

  const displayRows = useMemo(() => {
    let result = rows;

    if (codeFilter.trim()) {
      const term = codeFilter.trim().toLowerCase();
      result = result.filter((r) => r.codigos.toLowerCase().includes(term));
    }

    if (sortField) {
      result = [...result].sort((a, b) => {
        const av = a[sortField] ?? "";
        const bv = b[sortField] ?? "";
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv), "es")
          : String(bv).localeCompare(String(av), "es");
      });
    }

    return result;
  }, [rows, codeFilter, sortField, sortDir]);

  const isFiltered = codeFilter.trim().length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSelectOS = useCallback((nro: number) => {
    setSelectedNroOS(nro);
    setCodeFilter("");
    setSortField(null);
    setSortDir("asc");
  }, []);

  const handleSort = useCallback((key: ColKey) => {
    setSortField((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const handleExport = useCallback(async () => {
    if (!displayRows.length) return;
    setExporting(true);
    try {
      await exportToExcel(displayRows, selectedOSName, selectedNroOS!);
    } finally {
      setExporting(false);
    }
  }, [displayRows, selectedOSName, selectedNroOS]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Tabla de Valores</h1>
        <p className={styles.subtitle}>
          Consultá, filtrá y exportá todos los códigos y valores de una obra social.
        </p>
      </div>

      {/* ── OS selector OR compact bar ──────────────────────────────────── */}
      {!selectedNroOS ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepBadge}>1</span>
            <div>
              <h2 className={styles.panelTitle}>Seleccionar Obra Social</h2>
              <p className={styles.panelDescription}>
                Buscá y seleccioná la obra social cuyos códigos querés consultar.
              </p>
            </div>
          </div>

          <div className={styles.searchBar}>
            <Search className={styles.searchIcon} size={17} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por nombre o número..."
              value={osSearch}
              onChange={(e) => setOsSearch(e.target.value)}
            />
          </div>

          {isLoadingOS ? (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinIcon} size={20} />
              <span>Cargando obras sociales...</span>
            </div>
          ) : (
            <div className={styles.osList}>
              {filteredOS.map((os) => (
                <button
                  key={os.id}
                  className={styles.osItem}
                  onClick={() => handleSelectOS(os.nro_obra_social)}
                >
                  <span className={styles.osNro}>{os.nro_obra_social}</span>
                  <span className={styles.osNombre}>{os.nombre}</span>
                </button>
              ))}
              {filteredOS.length === 0 && (
                <p className={styles.emptyHint}>
                  No se encontraron obras sociales con "{osSearch}".
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <div className={styles.osBar}>
          <div className={styles.osBarLeft}>
            <Building2 size={15} className={styles.osBarIcon} />
            <span className={styles.osBarName}>{selectedOSName}</span>
            {!isLoadingRows && rows.length > 0 && (
              <span className={styles.osBarCount}>
                {rows.length} código{rows.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            className={styles.osBarChange}
            onClick={() => { setSelectedNroOS(null); setOsSearch(""); }}
          >
            <XIcon size={13} />
            Cambiar
          </button>
        </div>
      )}

      {/* ── Table panel ─────────────────────────────────────────────────── */}
      {selectedNroOS != null && (
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.stepBadge}>2</span>
            <div>
              <h2 className={styles.panelTitle}>Códigos</h2>
              <p className={styles.panelDescription}>
                Filtrá por código y ordená por cualquier columna haciendo clic en el encabezado.
              </p>
            </div>
          </div>

          {/* Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <div className={styles.filterBar}>
                <Search className={styles.filterIcon} size={15} />
                <input
                  className={styles.filterInput}
                  placeholder="Filtrar por código..."
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                />
                {codeFilter && (
                  <button
                    className={styles.filterClear}
                    onClick={() => setCodeFilter("")}
                    aria-label="Limpiar filtro"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>

              {!isLoadingRows && rows.length > 0 && (
                <span className={styles.countBadge}>
                  {isFiltered
                    ? `${displayRows.length} de ${rows.length}`
                    : `${rows.length} código${rows.length !== 1 ? "s" : ""}`}
                </span>
              )}
            </div>

            <div className={styles.toolbarRight}>
              <Button
                size="sm"
                variant="secondary"
                disabled={displayRows.length === 0 || exporting}
                onClick={() => void handleExport()}
              >
                <span className={styles.buttonInner}>
                  {exporting
                    ? <Loader2 size={14} className={styles.spinIcon} />
                    : <Download size={14} />}
                  {exporting ? "Exportando..." : "Exportar Excel"}
                </span>
              </Button>
            </div>
          </div>

          {/* Loading */}
          {isLoadingRows && (
            <div className={styles.loadingState}>
              <Loader2 className={styles.spinIcon} size={24} />
              <span>Cargando códigos de {selectedOSName}...</span>
            </div>
          )}

          {/* No data from API */}
          {!isLoadingRows && rows.length === 0 && (
            <div className={styles.emptyState}>
              <SearchX size={28} />
              <span>No se encontraron códigos para esta obra social.</span>
            </div>
          )}

          {/* Filter empty */}
          {!isLoadingRows && rows.length > 0 && displayRows.length === 0 && (
            <div className={styles.emptyState}>
              <SearchX size={28} />
              <span>Ningún código coincide con "<strong>{codeFilter}</strong>".</span>
            </div>
          )}

          {/* Table */}
          {!isLoadingRows && displayRows.length > 0 && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {COLS.map((col) => (
                      <th
                        key={col.key}
                        className={col.numeric ? styles.thRight : ""}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className={styles.thInner}>
                          {col.label}
                          <SortIcon col={col.key} sortField={sortField} sortDir={sortDir} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row) => (
                    <tr key={row.id}>
                      <td className={styles.tdCode}>{row.codigos}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.honorarios_a)}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.honorarios_b)}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.honorarios_c)}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.gastos)}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.ayudante_a)}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.ayudante_b)}</td>
                      <td className={`${styles.tdRight} ${styles.tdMoney}`}>{moneyFormatter.format(row.ayudante_c)}</td>
                      <td className={styles.tdDate}>
                        {row.fecha_cambio
                          ? <span>{row.fecha_cambio}</span>
                          : <span className={styles.tdNull}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
