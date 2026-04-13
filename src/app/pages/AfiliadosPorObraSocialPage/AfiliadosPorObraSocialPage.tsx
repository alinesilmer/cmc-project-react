import {
  useCallback, useDeferredValue, useEffect,
  useMemo, useRef, useState,
} from "react";
import axios from "axios";
import { saveAs } from "file-saver";
import {
  Building2, ChevronDown, FileSpreadsheet,
  FileText, Search, X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ObraSocial, ExportingPdfMode, ExportOptions } from "./types";
import {
  normalize, safeStr, buildOsCode,
  pickEspecialidadesAll, pickNroPrestador, pickNombre,
  pickMatriculaProv, pickTelefonoConsulta,
  shouldShowMailForOS, fmtDate,
} from "./helpers";
import { fetchObrasSociales, fetchPrestadoresAllPages, enrichForPdf } from "./api";
import { buildSimplePdf, buildPdfByEspecialidad } from "./pdfBuilder";
import { buildExcel } from "./excelBuilder";
import AfiliadosPorObraSocialTable from "./AfiliadosPorObraSocialTable";
import styles from "./AfiliadosPorObraSocialPage.module.scss";
import Button from "../../components/atoms/Button/Button";

const MAX_IDLE_OS_RESULTS = 80;

const AfiliadosPorObraSocialPage = () => {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [errorObras, setErrorObras] = useState<string | null>(null);

  const [selectedOS, setSelectedOS] = useState<ObraSocial | null>(null);
  const [prestadores, setPrestadores] = useState([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(false);
  const [errorPrestadores, setErrorPrestadores] = useState<string | null>(null);

  const [osQuery, setOsQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const deferredOsQuery = useDeferredValue(osQuery);
  const deferredTableQuery = useDeferredValue(tableQuery);

  const [osDropdownOpen, setOsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [exportingPdf, setExportingPdf] = useState<ExportingPdfMode>(null);
  const pdfAbortRef = useRef<AbortController | null>(null);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeEmail: false, includeCuit: false, includeCP: false,
  });

  const navigate = useNavigate();
  const location = useLocation();

  const closeDropdown = useCallback(() => setOsDropdownOpen(false), []);
  const openDropdown = useCallback(() => { if (!loadingObras) setOsDropdownOpen(true); }, [loadingObras]);
  const toggleDropdown = useCallback(() => { if (!loadingObras) setOsDropdownOpen((p) => !p); }, [loadingObras]);

  const goToPrestador = useCallback((id: unknown) => {
    const v = String(id ?? "").trim();
    if (!v) { window.alert("Falta ID del prestador."); return; }
    sessionStorage.setItem("cmc_open_padrones_next", "1");
    navigate(`/panel/doctors/${encodeURIComponent(v)}`, { state: { fromPath: location.pathname } });
  }, [location.pathname, navigate]);

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingObras(true); setErrorObras(null);
        const rows = await fetchObrasSociales(ctrl.signal);
        if (!ctrl.signal.aborted) setObras(rows);
      } catch { if (!ctrl.signal.aborted) setErrorObras("No se pudieron cargar las obras sociales."); }
      finally { if (!ctrl.signal.aborted) setLoadingObras(false); }
    })();
    return () => ctrl.abort();
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!osDropdownOpen || !dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) closeDropdown();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [closeDropdown, osDropdownOpen]);

  useEffect(() => {
    if (!selectedOS?.NRO_OBRA_SOCIAL) { setPrestadores([]); setErrorPrestadores(null); return; }
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoadingPrestadores(true); setErrorPrestadores(null); setTableQuery("");
        const rows = await fetchPrestadoresAllPages(selectedOS.NRO_OBRA_SOCIAL, ctrl.signal);
        if (!ctrl.signal.aborted) setPrestadores(rows as any);
      } catch (e: any) {
        if (ctrl.signal.aborted) return;
        let extra = "";
        if (axios.isAxiosError(e)) extra = ` (HTTP ${e.response?.status ?? "?"}${e.config?.url ? ` • ${e.config.url}` : ""})`;
        setErrorPrestadores(`No se pudieron cargar los prestadores de esta obra social.${extra}`);
        setPrestadores([]);
      } finally { if (!ctrl.signal.aborted) setLoadingPrestadores(false); }
    })();
    return () => ctrl.abort();
  }, [selectedOS?.NRO_OBRA_SOCIAL]);

  // Auto-enable email column for OS types that typically include mail data
  useEffect(() => {
    if (shouldShowMailForOS(selectedOS)) setExportOptions(p => ({ ...p, includeEmail: true }));
  }, [selectedOS]);

  useEffect(() => () => { pdfAbortRef.current?.abort(); }, []);

  const filteredOS = useMemo(() => {
    const q = normalize(deferredOsQuery);
    if (!q) return obras.slice(0, MAX_IDLE_OS_RESULTS);
    return obras.filter((os) => {
      const name = normalize(os.NOMBRE ?? "");
      const code = normalize(buildOsCode(os));
      return name.includes(q) || code.includes(q);
    });
  }, [deferredOsQuery, obras]);

  const hiddenOsCount = useMemo(() => {
    if (normalize(deferredOsQuery)) return 0;
    return Math.max(0, obras.length - filteredOS.length);
  }, [deferredOsQuery, filteredOS.length, obras.length]);

  const filteredPrestadores = useMemo(() => {
    const q = normalize(deferredTableQuery);
    if (!q) return prestadores;
    return (prestadores as any[]).filter((p) => {
      const nro = normalize(safeStr(pickNroPrestador(p)));
      const nom = normalize(safeStr(pickNombre(p)));
      const mat = normalize(safeStr(pickMatriculaProv(p)));
      const tel = normalize(safeStr(pickTelefonoConsulta(p)));
      const esp = normalize(safeStr(pickEspecialidadesAll(p)));
      return nro.includes(q) || nom.includes(q) || mat.includes(q) || tel.includes(q) || esp.includes(q);
    });
  }, [deferredTableQuery, prestadores]);

  const selectedCode = selectedOS ? buildOsCode(selectedOS) : "";
  const canExport = !!selectedOS && !loadingPrestadores && exportingPdf === null && filteredPrestadores.length > 0;

  const runPdfExport = useCallback(async (
    mode: "pdf" | "pdf_by_especialidad",
    buildFn: (rows: any, os: ObraSocial, opts: ExportOptions, sig: AbortSignal) => Promise<Blob>,
    filename: string,
    errMsg: string
  ) => {
    if (!selectedOS || !canExport) return;
    pdfAbortRef.current?.abort();
    const ctrl = new AbortController();
    pdfAbortRef.current = ctrl;
    setExportingPdf(mode);
    try {
      const enriched = await enrichForPdf(filteredPrestadores as any, exportOptions, ctrl.signal);
      if (ctrl.signal.aborted) return;
      const blob = await buildFn(enriched, selectedOS, exportOptions, ctrl.signal);
      if (ctrl.signal.aborted) return;
      saveAs(blob, filename);
    } catch (e: any) {
      if (ctrl.signal.aborted) return;
      console.error(e); window.alert(errMsg);
    } finally {
      if (pdfAbortRef.current === ctrl) pdfAbortRef.current = null;
      setExportingPdf(null);
    }
  }, [selectedOS, canExport, filteredPrestadores, exportOptions]);

  const handleDownloadPdf = useCallback(() => runPdfExport(
    "pdf", buildSimplePdf,
    `prestadores_${selectedCode}_${fmtDate(new Date())}.pdf`,
    "No se pudo generar el PDF. Probá filtrar más o exportar Excel."
  ), [runPdfExport, selectedCode]);

  const handleDownloadPdfByEsp = useCallback(() => runPdfExport(
    "pdf_by_especialidad", buildPdfByEspecialidad,
    `prestadores_${selectedCode}_por_especialidad_${fmtDate(new Date())}.pdf`,
    "No se pudo generar el PDF por especialidad."
  ), [runPdfExport, selectedCode]);

  const handleDownloadExcel = useCallback(async () => {
    if (!selectedOS || filteredPrestadores.length === 0) { window.alert("No hay datos para exportar."); return; }
    try {
      const ctrl = new AbortController();
      const enriched = await enrichForPdf(filteredPrestadores as any, exportOptions, ctrl.signal);
      const blob = await buildExcel(enriched, selectedOS, exportOptions);
      saveAs(blob, `prestadores_${selectedCode}_${fmtDate(new Date())}.xlsx`);
    } catch (e) { console.error(e); window.alert("Error al generar Excel."); }
  }, [selectedOS, filteredPrestadores, selectedCode, exportOptions]);

  const selectOS = useCallback((os: ObraSocial) => {
    setSelectedOS(os); setOsQuery(""); setOsDropdownOpen(false);
  }, []);

  const clearOS = useCallback(() => {
    pdfAbortRef.current?.abort();
    setSelectedOS(null); setPrestadores([]); setErrorPrestadores(null);
    setTableQuery(""); setOsQuery(""); setOsDropdownOpen(false); setExportingPdf(null);
  }, []);

  const setOpt = useCallback((key: keyof ExportOptions) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setExportOptions(p => ({ ...p, [key]: e.target.checked })), []);

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <section className={styles.hero}>
          <div className={styles.heroMain}>
            <span className={styles.heroEyebrow}>Padrones</span>
            <h1 className={styles.title}>Prestadores por Obra Social</h1>
            <p className={styles.subtitle}>Consultá el padrón de prestadores para cualquier obra social, filtrá y exportá en PDF o Excel.</p>
          </div>
        </section>

        <section className={styles.card}>
         

          <div className={styles.cardContent}>
            <div className={styles.topRow}>
              <div className={styles.osPicker} ref={dropdownRef}>
                <button type="button" className={styles.osButton} onClick={toggleDropdown} aria-expanded={osDropdownOpen} disabled={loadingObras}>
                  <div className={styles.osButtonContent}>
                    <span className={styles.osButtonValue}>
                      {selectedOS?.NOMBRE ?? (loadingObras ? "Cargando…" : "Seleccioná una obra social")}
                    </span>
                  </div>
                  <ChevronDown className={`${styles.chevron} ${osDropdownOpen ? styles.chevronOpen : ""}`} />
                </button>

                {osDropdownOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownSearch}>
                      <Search className={styles.searchIconSmall} />
                      <input className={styles.dropdownInput} value={osQuery} onChange={(e) => setOsQuery(e.target.value)} onFocus={openDropdown} placeholder="Buscar por nombre o código…" aria-label="Buscar obra social" autoFocus />
                      {(osQuery.trim() || selectedOS) && (
                        <button className={styles.clearBtn} type="button" onClick={clearOS} title="Limpiar selección"><X size={16} /></button>
                      )}
                    </div>
                    {hiddenOsCount > 0 && (
                      <div className={styles.dropdownMeta}>Mostrando {filteredOS.length} de {obras.length}. Escribí para filtrar.</div>
                    )}
                    <div className={styles.dropdownList}>
                      {loadingObras ? (
                        <div className={styles.emptyMessage}>Cargando obras sociales…</div>
                      ) : errorObras ? (
                        <div className={styles.errorMessage}>{errorObras}</div>
                      ) : filteredOS.length === 0 ? (
                        <div className={styles.emptyMessage}>Sin resultados para &ldquo;{osQuery}&rdquo;</div>
                      ) : (
                        filteredOS.map((os) => {
                          const code = buildOsCode(os);
                          const active = selectedOS?.NRO_OBRA_SOCIAL === os.NRO_OBRA_SOCIAL;
                          return (
                            <button key={os.NRO_OBRA_SOCIAL} type="button" className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ""}`} onClick={() => selectOS(os)}>
                              <span className={styles.dropdownItemName}>{os.NOMBRE}</span>
                              <span className={styles.dropdownItemCode}>{code}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actionsPanel}>
                <div className={styles.actions}>
                  <Button size="md" variant="danger" onClick={handleDownloadPdf} disabled={!canExport}>
                    <FileText size={18} /><span>{exportingPdf === "pdf" ? "Generando…" : "Descargar PDF"}</span>
                  </Button>
                  <Button size="md" variant="third" onClick={handleDownloadPdfByEsp} disabled={!canExport}>
                    <FileText size={18} /><span>{exportingPdf === "pdf_by_especialidad" ? "Generando…" : "PDF por especialidad"}</span>
                  </Button>
                  <Button size="md" variant="success" onClick={handleDownloadExcel} disabled={!canExport}>
                    <FileSpreadsheet size={18} /><span>Descargar Excel</span>
                  </Button>
                </div>
                <div className={styles.exportOptions}>
                  <span className={styles.exportOptionsLabel}>Incluir en exportación:</span>
                  <label className={styles.exportToggle}><input type="checkbox" checked={exportOptions.includeEmail} onChange={setOpt("includeEmail")} /> Email</label>
                  <label className={styles.exportToggle}><input type="checkbox" checked={exportOptions.includeCuit} onChange={setOpt("includeCuit")} /> CUIT</label>
                  <label className={styles.exportToggle}><input type="checkbox" checked={exportOptions.includeCP} onChange={setOpt("includeCP")} /> CP</label>
                </div>
              </div>
            </div>

            {selectedOS && (
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} />
                <input className={styles.searchInput} value={tableQuery} onChange={(e) => setTableQuery(e.target.value)} placeholder="Buscar por nombre, N° socio, matrícula, teléfono o especialidad…" disabled={loadingPrestadores} aria-label="Buscar prestador" />
                {tableQuery.trim() && (
                  <button className={styles.clearBtn} type="button" onClick={() => setTableQuery("")} title="Limpiar búsqueda"><X size={18} /></button>
                )}
              </div>
            )}

            {!selectedOS ? (
              <div className={styles.emptyState}>
                <Building2 size={46} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Seleccioná una obra social</h3>
                <p className={styles.emptyMessage}>Buscá y seleccioná una obra social para consultar su padrón de prestadores.</p>
              </div>
            ) : loadingPrestadores ? (
              <div className={styles.loadingState}>
                <div className={styles.progressBar}><div className={styles.progressFill} /></div>
                <p className={styles.loadingText}>Cargando prestadores…</p>
              </div>
            ) : errorPrestadores ? (
              <div className={styles.errorMessage}>{errorPrestadores}</div>
            ) : (
              <AfiliadosPorObraSocialTable
                rows={filteredPrestadores as any}
                tableQuery={tableQuery}
                totalCount={(prestadores as any[]).length}
                onNavigate={goToPrestador}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default AfiliadosPorObraSocialPage;
