import {
  useCallback, useDeferredValue, useEffect,
  useMemo, useRef, useState,
} from "react";
import axios from "axios";
import {
  Building2,
  ChevronDown,
  ClipboardCheck,
  Mail,
  Search,
  SlidersHorizontal,
  X,
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
import { useFichas } from "./useFichas";
import ExportFieldsModal from "./ExportFieldsModal";
import RecuentoModal from "./RecuentoModal";
import EnvioModal from "./EnvioModal";
import AfiliadosPorObraSocialTable from "./AfiliadosPorObraSocialTable";
import comun from "./Comun.module.scss";
import styles from "./PorObraSocial.module.scss";;
import Caja, { Cajas } from "@/app/components/ui/Caja/Caja";
import { useAppSnackbar } from "@/app/hooks/useAppSnackbar";
import SearchField from "@/app/components/ui/SearchField/SearchField";
import BotonDescarga from "@/app/components/ui/BotonDescarga/BotonDescarga";
import BotonPlano from "@/app/components/ui/BotonPlano/BotonPlano";

const MAX_IDLE_OS_RESULTS = 80;

/** Padrón de una obra social: quiénes son sus prestadores. */
export default function PorObraSocial() {
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
  const [recuentoOpen, setRecuentoOpen] = useState(false);
  const [envioOpen, setEnvioOpen] = useState(false);

  const navigate = useNavigate();
  const avisar = useAppSnackbar();
  const location = useLocation();

  const closeDropdown = useCallback(() => setOsDropdownOpen(false), []);
  const openDropdown = useCallback(() => { if (!loadingObras) setOsDropdownOpen(true); }, [loadingObras]);
  const toggleDropdown = useCallback(() => { if (!loadingObras) setOsDropdownOpen((p) => !p); }, [loadingObras]);
  const cerrarCampos = useCallback(() => setCamposOpen(false), []);
  const cerrarRecuento = useCallback(() => setRecuentoOpen(false), []);
  const cerrarEnvio = useCallback(() => setEnvioOpen(false), []);

  const goToPrestador = useCallback((id: unknown) => {
    const v = String(id ?? "").trim();
    if (!v) { avisar("Falta ID del prestador.", "error"); return; }
    sessionStorage.setItem("cmc_open_padrones_next", "1");
    navigate(`/panel/doctors/${encodeURIComponent(v)}`, { state: { fromPath: location.pathname } });
  }, [avisar, location.pathname, navigate]);

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
      } catch (e: unknown) {
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

  // Los inactivos de este padrón se descartan una sola vez, acá: de este arreglo salen la tabla, el buscador, los contadores y las exportaciones.
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
  // La exportación sigue recibiendo las filas del padrón tal cual y arma las suyas: lo de pantalla (`fichas`) no pasa por ahí.
  const exportar = useExportar({
    selectedOS,
    rows: filteredPrestadores,
    campos: campos.seleccionados,
    necesitaFicha: campos.necesitaFicha,
  });

  // Para la tabla y el recuento: las mismas filas, con la ficha adosada cuando alguna columna elegida la necesita.
  const fichas = useFichas(filteredPrestadores, campos.necesitaFicha);
  const fichasDelPadron = useFichas(activos, campos.necesitaFicha && recuentoOpen);

  const canExport =
    !!selectedOS && !loadingPrestadores && !exportar.ocupado &&
    filteredPrestadores.length > 0;
  const padronListo = !!selectedOS && !loadingPrestadores && !errorPrestadores && activos.length > 0;

  const selectOS = useCallback((os: ObraSocial) => {
    setSelectedOS(os); setOsQuery(""); setOsDropdownOpen(false);
  }, []);

  const clearOS = useCallback(() => {
    setSelectedOS(null); setPrestadores([]); setErrorPrestadores(null);
    setTableQuery(""); setOsQuery(""); setOsDropdownOpen(false);
  }, []);

  return (
    <>
      <Cajas>
        <Caja titulo="Configuración">
        <div className={styles.osPicker} ref={dropdownRef}>
          <BotonPlano type="button" className={styles.osButton} onClick={toggleDropdown} aria-expanded={osDropdownOpen} disabled={loadingObras}>
            <Building2 size={18} className={styles.osIcono} aria-hidden="true" />
            <span className={styles.osButtonValue}>
              {selectedOS?.NOMBRE ?? (loadingObras ? "Cargando…" : "Seleccioná una obra social")}
            </span>
            <ChevronDown className={`${comun.chevron} ${osDropdownOpen ? styles.chevronOpen : ""}`} />
          </BotonPlano>

          {osDropdownOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownSearch}>
                <Search className={styles.searchIconSmall} />
                <input className={styles.dropdownInput} value={osQuery} onChange={(e) => setOsQuery(e.target.value)} onFocus={openDropdown} placeholder="Buscar por nombre o código…" aria-label="Buscar obra social" autoFocus />
                {(osQuery.trim() || selectedOS) && (
                  <BotonPlano className={styles.clearBtn} type="button" onClick={clearOS} title="Limpiar selección"><X size={16} /></BotonPlano>
                )}
              </div>
              {hiddenOsCount > 0 && (
                <div className={styles.dropdownMeta}>Mostrando {filteredOS.length} de {obras.length}. Escribí para filtrar.</div>
              )}
              <div className={styles.dropdownList}>
                {loadingObras ? (
                  <div className={styles.emptyMessage}>Cargando obras sociales…</div>
                ) : errorObras ? (
                  <div className={comun.errorMessage}>{errorObras}</div>
                ) : filteredOS.length === 0 ? (
                  <div className={styles.emptyMessage}>Sin resultados para &ldquo;{osQuery}&rdquo;</div>
                ) : (
                  filteredOS.map((os) => {
                    const code = buildOsCode(os);
                    const active = selectedOS?.NRO_OBRA_SOCIAL === os.NRO_OBRA_SOCIAL;
                    return (
                      <BotonPlano key={os.NRO_OBRA_SOCIAL} type="button" className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ""}`} onClick={() => selectOS(os)}>
                        <span className={styles.dropdownItemName}>{os.NOMBRE}</span>
                        <span className={styles.dropdownItemCode}>{code}</span>
                      </BotonPlano>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

          {/* Las columnas elegidas valen para la tabla y para lo que se exporta: lo que se ve es lo que sale en el archivo. */}
          <div className={styles.cajaFila}>
            <BotonPlano type="button" className={comun.ajusteBtn} onClick={() => setCamposOpen(true)}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            Datos a mostrar
            <b>{campos.seleccionados.length}</b>
            {campos.sensibles > 0 && (
              <span className={styles.camposWarn}>
                {campos.sensibles} personal{campos.sensibles === 1 ? "" : "es"}
              </span>
            )}
          </BotonPlano>
            <BotonPlano type="button" className={comun.ajusteBtn} onClick={() => setRecuentoOpen(true)} disabled={!padronListo}>
            <ClipboardCheck size={15} aria-hidden="true" />
            Recuento de errores
          </BotonPlano>
          </div>
        </Caja>

        <Caja titulo="Descargas">
        <div className={styles.actions}>
          <BotonDescarga
            formato="pdf"
            onClick={exportar.descargarPdf}
            disabled={!canExport}
            cargando={exportar.exportingPdf === "pdf"}
          />
          <BotonDescarga
            formato="pdf"
            onClick={exportar.descargarPdfPorEspecialidad}
            disabled={!canExport}
            cargando={exportar.exportingPdf === "pdf_by_especialidad"}
          >
            PDF por especialidad
          </BotonDescarga>
          <BotonDescarga
            formato="excel"
            onClick={exportar.descargarExcel}
            disabled={!canExport}
            cargando={exportar.exportingExcel}
          />
        </div>
          <div className={styles.cajaFila}>
            <BotonPlano type="button" className={comun.ajusteBtn} onClick={() => setEnvioOpen(true)} disabled={!padronListo}>
            <Mail size={15} aria-hidden="true" />
            Envío de lista de prestadores
          </BotonPlano>
          </div>
        </Caja>
      </Cajas>

      {exportar.error && (
        <div className={comun.errorMessage} role="alert">
          {exportar.error}
          <BotonPlano
            type="button"
            className={styles.errorClose}
            onClick={exportar.limpiarError}
            aria-label="Cerrar aviso"
          >
            <X size={15} />
          </BotonPlano>
        </div>
      )}

      {selectedOS && (
        <div className={styles.herramientas}>
          <SearchField
            value={tableQuery}
            onChange={(e) => setTableQuery(e.target.value)}
            onClear={() => setTableQuery("")}
            placeholder="Buscar por nombre, N° socio, matrícula, teléfono o especialidad…"
            disabled={loadingPrestadores}
            ariaLabel="Buscar prestador"
          />



        </div>
      )}

      {/* El padrón crudo trae altas y bajas mezcladas; si no se dijera, el total de la pantalla no coincidiría con el de la obra social. */}
      {selectedOS && !loadingPrestadores && ocultosInactivos > 0 && (
        <p className={styles.inactivosHint}>
          {ocultosInactivos === 1
            ? "1 prestador inactivo en este padrón no se muestra ni se exporta."
            : `${ocultosInactivos} prestadores inactivos en este padrón no se muestran ni se exportan.`}
        </p>
      )}

      {selectedOS && fichas.error && <p className={styles.inactivosHint}>{fichas.error}</p>}

      {!selectedOS ? (
        <div className={comun.emptyState}>
          <Building2 size={40} className={comun.emptyIcon} />
          <h3 className={comun.emptyTitle}>Seleccioná una obra social</h3>
        </div>
      ) : loadingPrestadores ? (
        <div className={comun.loadingState}>
          <div className={comun.progressBar}><div className={comun.progressFill} /></div>
          <p className={comun.loadingText}>Cargando prestadores…</p>
        </div>
      ) : errorPrestadores ? (
        <div className={comun.errorMessage}>{errorPrestadores}</div>
      ) : (
        <AfiliadosPorObraSocialTable
          rows={fichas.filas}
          campos={campos.seleccionados}
          tableQuery={tableQuery}
          totalCount={activos.length}
          fichasPendientes={fichas.cargando}
          onNavigate={goToPrestador}
        />
      )}

      <ExportFieldsModal
        open={camposOpen}
        onClose={cerrarCampos}
        keys={campos.keys}
        sensibles={campos.sensibles}
        necesitaFicha={campos.necesitaFicha}
        onToggle={campos.alternar}
        onToggleGroup={campos.alternarGrupo}
      />

      <RecuentoModal
        open={recuentoOpen}
        onClose={cerrarRecuento}
        obraSocial={selectedOS?.NOMBRE ?? ""}
        filas={fichasDelPadron.filas}
        campos={campos.seleccionados}
        fichasPendientes={fichasDelPadron.cargando}
        onVer={goToPrestador}
      />

      <EnvioModal
        open={envioOpen}
        onClose={cerrarEnvio}
        obraSocial={selectedOS?.NOMBRE ?? ""}
        cantidad={filteredPrestadores.length}
      />
    </>
  );
}
