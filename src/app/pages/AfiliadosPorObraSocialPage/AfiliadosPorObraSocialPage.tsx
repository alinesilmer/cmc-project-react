import {
  useCallback, useDeferredValue, useEffect,
  useMemo, useRef, useState,
} from "react";
import axios from "axios";
import {
  Building2, ChevronDown, FileSpreadsheet,
  FileText, Search, SlidersHorizontal, X,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ObraSocial, Prestador } from "./types";
import {
  normalize, safeStr, buildOsCode, esInactivoEnPadron,
  pickEspecialidadesAll, pickNroPrestador, pickNombre,
  pickMatriculaProv, pickTelefonoConsulta,
} from "./helpers";
import { fetchObrasSociales, fetchPrestadoresAllPages } from "./api";
import { useExportFields } from "./useExportFields";
import { useExportar } from "./useExportar";
import ExportFieldsModal from "./ExportFieldsModal";
import AfiliadosPorObraSocialTable from "./AfiliadosPorObraSocialTable";
import styles from "./AfiliadosPorObraSocialPage.module.scss";
import Button from "../../components/atoms/Button/Button";

const MAX_IDLE_OS_RESULTS = 80;

const AfiliadosPorObraSocialPage = () => {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [errorObras, setErrorObras] = useState<string | null>(null);

  const [selectedOS, setSelectedOS] = useState<ObraSocial | null>(null);
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(false);
  const [errorPrestadores, setErrorPrestadores] = useState<string | null>(null);

  const [osQuery, setOsQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");
  const deferredOsQuery = useDeferredValue(osQuery);
  const deferredTableQuery = useDeferredValue(tableQuery);

  const [osDropdownOpen, setOsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [camposOpen, setCamposOpen] = useState(false);

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
        if (!ctrl.signal.aborted) setPrestadores(rows);
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

  // Los inactivos de este padrón se descartan una sola vez, acá: de este
  // arreglo salen la tabla, el buscador, los contadores y las exportaciones,
  // así que no hay forma de que un inactivo se cuele en el PDF o el Excel.
  const activos = useMemo(
    () => prestadores.filter((p) => !esInactivoEnPadron(p)),
    [prestadores]
  );
  const ocultosInactivos = prestadores.length - activos.length;

  const filteredPrestadores = useMemo(() => {
    const q = normalize(deferredTableQuery);
    if (!q) return activos;
    return activos.filter((p) => {
      const nro = normalize(safeStr(pickNroPrestador(p)));
      const nom = normalize(safeStr(pickNombre(p)));
      const mat = normalize(safeStr(pickMatriculaProv(p)));
      const tel = normalize(safeStr(pickTelefonoConsulta(p)));
      const esp = normalize(safeStr(pickEspecialidadesAll(p)));
      return nro.includes(q) || nom.includes(q) || mat.includes(q) || tel.includes(q) || esp.includes(q);
    });
  }, [activos, deferredTableQuery]);

  const campos = useExportFields();
  const exportar = useExportar({
    selectedOS,
    rows: filteredPrestadores,
    campos: campos.seleccionados,
    necesitaFicha: campos.necesitaFicha,
  });

  const canExport =
    !!selectedOS && !loadingPrestadores && !exportar.ocupado &&
    filteredPrestadores.length > 0;

  const selectOS = useCallback((os: ObraSocial) => {
    setSelectedOS(os); setOsQuery(""); setOsDropdownOpen(false);
  }, []);

  const clearOS = useCallback(() => {
    setSelectedOS(null); setPrestadores([]); setErrorPrestadores(null);
    setTableQuery(""); setOsQuery(""); setOsDropdownOpen(false);
  }, []);

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
                  <Button size="md" variant="danger" onClick={exportar.descargarPdf} disabled={!canExport}>
                    <FileText size={18} /><span>{exportar.exportingPdf === "pdf" ? "Generando…" : "Descargar PDF"}</span>
                  </Button>
                  <Button size="md" variant="third" onClick={exportar.descargarPdfPorEspecialidad} disabled={!canExport}>
                    <FileText size={18} /><span>{exportar.exportingPdf === "pdf_by_especialidad" ? "Generando…" : "PDF por especialidad"}</span>
                  </Button>
                  <Button size="md" variant="success" onClick={exportar.descargarExcel} disabled={!canExport}>
                    <FileSpreadsheet size={18} /><span>{exportar.exportingExcel ? "Generando…" : "Descargar Excel"}</span>
                  </Button>
                </div>

                {/* Un botón con el resumen a la vista: se sabe qué va a salir en
                    el archivo sin abrir nada. */}
                <button
                  type="button"
                  className={styles.camposBtn}
                  onClick={() => setCamposOpen(true)}
                >
                  <SlidersHorizontal size={15} aria-hidden="true" />
                  <span className={styles.camposBtnText}>
                    Datos a incluir
                    <b>{campos.seleccionados.length}</b>
                  </span>
                  {campos.sensibles > 0 && (
                    <span className={styles.camposWarn}>
                      {campos.sensibles} personal{campos.sensibles === 1 ? "" : "es"}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {exportar.error && (
              <div className={styles.errorMessage} role="alert">
                {exportar.error}
                <button
                  type="button"
                  className={styles.errorClose}
                  onClick={exportar.limpiarError}
                  aria-label="Cerrar aviso"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* El padrón crudo trae altas y bajas mezcladas; si no se dijera,
                el total de la pantalla no coincidiría con el de la obra social. */}
            {selectedOS && !loadingPrestadores && ocultosInactivos > 0 && (
              <p className={styles.inactivosHint}>
                {ocultosInactivos === 1
                  ? "1 prestador inactivo en este padrón no se muestra ni se exporta."
                  : `${ocultosInactivos} prestadores inactivos en este padrón no se muestran ni se exportan.`}
              </p>
            )}

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
                rows={filteredPrestadores}
                tableQuery={tableQuery}
                totalCount={activos.length}
                onNavigate={goToPrestador}
              />
            )}
          </div>
        </section>
      </div>

      <ExportFieldsModal
        open={camposOpen}
        onClose={() => setCamposOpen(false)}
        keys={campos.keys}
        sensibles={campos.sensibles}
        necesitaFicha={campos.necesitaFicha}
        onToggle={campos.alternar}
        onToggleGroup={campos.alternarGrupo}
      />
    </div>
  );
};

export default AfiliadosPorObraSocialPage;
