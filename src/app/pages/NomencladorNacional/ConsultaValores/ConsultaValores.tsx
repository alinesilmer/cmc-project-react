import { useState, useMemo, useRef } from "react";
import {
  Search,
  DollarSign,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  X as XIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import styles from "./ConsultaValores.module.scss";
import {
  listNomenclador,
  getTablaValores,
  getNomencladorEspecialidades,
} from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import type {
  NomencladorOut,
  TablaValorItem,
  NomencladorEspecialidadOut,
} from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import type { Especialidad } from "../../Especialidades/especialidades.types";

const fmt = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 2,
});

function findComp(componentes: TablaValorItem["componentes"], concepto: string) {
  return componentes.find(
    (c) => c.concepto.toLowerCase() === concepto.toLowerCase() && !c.opcional,
  );
}

export default function ConsultaValores() {
  // OS autocomplete
  const [selectedOSItem, setSelectedOSItem] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  // Especialidad autocomplete
  const [selectedEspItem, setSelectedEspItem] = useState<Especialidad | null>(null);
  const [espSearch, setEspSearch] = useState("");
  const [espOpen, setEspOpen] = useState(false);

  // Nomenclador autocomplete
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const [selectedNom, setSelectedNom] = useState<NomencladorOut | null>(null);
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Query result
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<TablaValorItem | null>(null);
  const [nomEsps, setNomEsps] = useState<NomencladorEspecialidadOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });

  // Derived values
  const osNro = selectedOSItem?.nro_obra_social ?? null;
  const espId = selectedEspItem?.id ?? null;

  // Filtered lists (client-side)
  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const q = osSearch.toLowerCase();
    return osList
      .filter(
        (os) =>
          os.nombre.toLowerCase().includes(q) ||
          String(os.nro_obra_social).includes(q),
      )
      .slice(0, 50);
  }, [osList, osSearch]);

  const filteredEsp = useMemo(() => {
    if (!espSearch.trim()) return especialidades;
    const q = espSearch.toLowerCase();
    return especialidades.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [especialidades, espSearch]);

  // ── OS autocomplete handlers ───────────────────────────────────────────────

  function selectOS(os: ObraSocialListItem) {
    setSelectedOSItem(os);
    setOsSearch("");
    setOsOpen(false);
    setResult(null);
    setError(null);
    setSearched(false);
  }

  function clearOS() {
    setSelectedOSItem(null);
    setOsSearch("");
    setOsOpen(false);
    setResult(null);
    setError(null);
    setSearched(false);
  }

  // ── Especialidad autocomplete handlers ────────────────────────────────────

  function selectEsp(e: Especialidad) {
    setSelectedEspItem(e);
    setEspSearch("");
    setEspOpen(false);
    setNomEsps(null);
  }

  function clearEsp() {
    setSelectedEspItem(null);
    setEspSearch("");
    setEspOpen(false);
    setNomEsps(null);
  }

  // ── Nomenclador autocomplete ───────────────────────────────────────────────

  function handleNomSearch(q: string) {
    setNomSearch(q);
    setNomResults([]);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) return;

    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        const res = await listNomenclador({ q: q.trim(), activo: true, size: 15 });
        setNomResults(res);
      } catch {
        setNomResults([]);
      } finally {
        setNomLoading(false);
      }
    }, 300);
  }

  function selectNom(n: NomencladorOut) {
    setSelectedNom(n);
    setNomSearch("");
    setNomResults([]);
    // Clear previous result when a new code is chosen
    setResult(null);
    setNomEsps(null);
    setError(null);
    setSearched(false);
  }

  function clearNom() {
    setSelectedNom(null);
    setNomSearch("");
    setNomResults([]);
    setResult(null);
    setNomEsps(null);
    setError(null);
    setSearched(false);
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!osNro || !selectedNom) return;

    setLoading(true);
    setSearched(true);
    setResult(null);
    setNomEsps(null);
    setError(null);

    try {
      const [tablaData, espsData] = await Promise.all([
        getTablaValores({ obra_social_nro: osNro, codigo: selectedNom.codigo, size: 5 }),
        espId ? getNomencladorEspecialidades(selectedNom.id) : Promise.resolve(null),
      ]);

      const exactTabla = tablaData.find(
        (t) => t.codigo.toUpperCase() === selectedNom.codigo.toUpperCase(),
      );
      if (!exactTabla) {
        setError("Este código no tiene precio cargado para la obra social seleccionada.");
        return;
      }

      setResult(exactTabla);
      setNomEsps(espsData);
    } catch {
      setError("Error al consultar. Verificá la obra social y el código.");
    } finally {
      setLoading(false);
    }
  }

  // ── Specialty validity ─────────────────────────────────────────────────────

  const especialidadValida = useMemo<boolean | null>(() => {
    if (!espId || !selectedNom) return null;
    if (selectedNom.sin_restriccion_especialidad) return true;
    if (!nomEsps) return null;
    return nomEsps.some((e) => e.especialidad_id_colegio === espId && e.activo);
  }, [espId, selectedNom, nomEsps]);

  const honorarios = result ? findComp(result.componentes, "Honorarios") : undefined;
  const gastos = result ? findComp(result.componentes, "Gastos") : undefined;
  const ayudante = result ? findComp(result.componentes, "Ayudante") : undefined;

  const canSearch = Boolean(osNro && selectedNom);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <DollarSign size={20} />
        </span>
        <div>
          <h1 className={styles.title}>Consulta de Valores</h1>
          <p className={styles.subtitle}>
            Consulta de precios por obra social y especialidad
          </p>
        </div>
      </div>

      {/* ── Search form ── */}
      <div className={styles.formCard}>
        <div className={styles.formGrid}>
          {/* OS */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Obra social</label>
            {selectedOSItem ? (
              <div className={styles.selectedCode}>
                <span className={styles.selectedCodeNum}>{selectedOSItem.nro_obra_social}</span>
                <span className={styles.selectedCodeDesc}>{selectedOSItem.nombre}</span>
                <button className={styles.clearCodeBtn} onClick={clearOS} type="button" title="Cambiar">
                  <XIcon size={13} />
                </button>
              </div>
            ) : (
              <div className={styles.autocompleteWrap}>
                <div className={styles.autocompleteInputWrap}>
                  <Search size={13} className={styles.autocompleteIcon} />
                  <input
                    className={styles.autocompleteInput}
                    placeholder="Buscar por nombre o número…"
                    value={osSearch}
                    onChange={(e) => { setOsSearch(e.target.value); setOsOpen(true); }}
                    onFocus={() => setOsOpen(true)}
                    onBlur={() => setTimeout(() => setOsOpen(false), 150)}
                  />
                </div>
                {osOpen && filteredOS.length > 0 && (
                  <ul className={styles.autocompleteDropdown}>
                    {filteredOS.map((os) => (
                      <li
                        key={os.nro_obra_social}
                        className={styles.autocompleteItem}
                        onMouseDown={(e) => { e.preventDefault(); selectOS(os); }}
                      >
                        <span className={styles.dropdownCode}>{os.nro_obra_social}</span>
                        <span className={styles.dropdownDesc}>{os.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Specialty */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>
              Especialidad <span className={styles.optional}>(opcional)</span>
            </label>
            {selectedEspItem ? (
              <div className={styles.selectedCode}>
                <span className={styles.selectedCodeDesc}>{selectedEspItem.nombre}</span>
                <button className={styles.clearCodeBtn} onClick={clearEsp} type="button" title="Cambiar">
                  <XIcon size={13} />
                </button>
              </div>
            ) : (
              <div className={styles.autocompleteWrap}>
                <div className={styles.autocompleteInputWrap}>
                  <Search size={13} className={styles.autocompleteIcon} />
                  <input
                    className={styles.autocompleteInput}
                    placeholder="Buscar especialidad…"
                    value={espSearch}
                    onChange={(e) => { setEspSearch(e.target.value); setEspOpen(true); }}
                    onFocus={() => setEspOpen(true)}
                    onBlur={() => setTimeout(() => setEspOpen(false), 150)}
                  />
                </div>
                {espOpen && filteredEsp.length > 0 && (
                  <ul className={styles.autocompleteDropdown}>
                    {filteredEsp.map((e) => (
                      <li
                        key={e.id}
                        className={styles.autocompleteItem}
                        onMouseDown={(ev) => { ev.preventDefault(); selectEsp(e); }}
                      >
                        <span className={styles.dropdownDesc}>{e.nombre}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Código CMC — autocomplete from Catálogo CMC */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Código CMC</label>

            {selectedNom ? (
              <div className={styles.selectedCode}>
                <span className={styles.selectedCodeNum}>{selectedNom.codigo}</span>
                <span className={styles.selectedCodeDesc}>{selectedNom.descripcion}</span>
                <button
                  className={styles.clearCodeBtn}
                  onClick={clearNom}
                  title="Cambiar código"
                  type="button"
                >
                  <XIcon size={13} />
                </button>
              </div>
            ) : (
              <div className={styles.autocompleteWrap}>
                <div className={styles.autocompleteInputWrap}>
                  <Search size={13} className={styles.autocompleteIcon} />
                  <input
                    className={styles.autocompleteInput}
                    placeholder="Buscar por código o descripción…"
                    value={nomSearch}
                    onChange={(e) => handleNomSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && nomResults.length > 0) selectNom(nomResults[0]);
                    }}
                  />
                  {nomLoading && (
                    <Loader2 size={13} className={`${styles.autocompleteSpinner} ${styles.spin}`} />
                  )}
                </div>

                {nomResults.length > 0 && (
                  <ul className={styles.autocompleteDropdown}>
                    {nomResults.map((n) => (
                      <li
                        key={n.id}
                        className={styles.autocompleteItem}
                        onMouseDown={(e) => { e.preventDefault(); selectNom(n); }}
                      >
                        <span className={styles.dropdownCode}>{n.codigo}</span>
                        <span className={styles.dropdownDesc}>{n.descripcion}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <div className={styles.formGroup} style={{ marginTop: 12 }}>
            <button
              className={styles.btnSearch}
              onClick={handleSearch}
              disabled={!canSearch || loading}
            >
              {loading ? (
                <Loader2 size={15} className={styles.spin} />
              ) : (
                <Search size={15} />
              )}
              Consultar
            </button>
          </div>
        </div>
      </div>

      {/* ── Output ── */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            className={styles.loadingState}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 size={22} className={styles.spin} />
            <span>Consultando…</span>
          </motion.div>
        )}

        {!loading && searched && error && (
          <motion.div
            key="error"
            className={styles.errorState}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}

        {!loading && result && (
          <motion.div
            key="result"
            className={styles.resultCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className={styles.resultHeader}>
              <p className={styles.resultDesc}>{result.descripcion}</p>
              <p className={styles.resultSub}>
                {selectedOSItem?.nombre} · Vigente desde {result.vigencia_desde}
                {result.vigencia_hasta && ` hasta ${result.vigencia_hasta}`}
              </p>
              {espId !== null && (
                <div
                  className={`${styles.especialidadBadge} ${
                    especialidadValida === null
                      ? styles.badgeNeutral
                      : especialidadValida
                      ? styles.badgeOk
                      : styles.badgeNo
                  }`}
                >
                  {especialidadValida === null ? (
                    <Loader2 size={13} className={styles.spin} />
                  ) : especialidadValida ? (
                    <>
                      <CheckCircle2 size={13} />
                      {selectedEspItem?.nombre}: habilitada
                    </>
                  ) : (
                    <>
                      <XCircle size={13} />
                      {selectedEspItem?.nombre}: no habilitada
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={styles.priceBreakdown}>
              {honorarios && (
                <div className={styles.priceCell}>
                  <span className={styles.priceCellLabel}>Honorarios</span>
                  <span className={styles.priceCellValue}>
                    {fmt.format(parseFloat(honorarios.subtotal))}
                  </span>
                </div>
              )}
              {gastos && (
                <div className={styles.priceCell}>
                  <span className={styles.priceCellLabel}>Gastos</span>
                  <span className={styles.priceCellValue}>
                    {fmt.format(parseFloat(gastos.subtotal))}
                  </span>
                </div>
              )}
              {ayudante && (
                <div className={styles.priceCell}>
                  <span className={styles.priceCellLabel}>Ayudante</span>
                  <span className={styles.priceCellValue}>
                    {fmt.format(parseFloat(ayudante.subtotal))}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
