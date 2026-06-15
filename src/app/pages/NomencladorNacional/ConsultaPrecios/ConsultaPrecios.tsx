import { useState, useMemo, useRef } from "react";
import {
  Search,
  DollarSign,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X as XIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

// Reuse identical styles from the admin Consulta de Valores page
import styles from "../ConsultaValores/ConsultaValores.module.scss";
import {
  listNomenclador,
  getTablaValores,
  getNomencladorEspecialidades,
} from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type { NomencladorOut, TablaValorItem } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useAuth } from "../../../auth/AuthProvider";

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

export default function ConsultaPrecios() {
  const { user } = useAuth();
  const doctorEspId: number | null = user?.especialidad_id ?? null;

  // Specialty validity state (populated after each search)
  const [especialidadValida, setEspecialidadValida] = useState<boolean | null>(null);

  // OS autocomplete
  const [selectedOSItem, setSelectedOSItem] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");
  const [osOpen, setOsOpen] = useState(false);

  // Código CMC autocomplete
  const [nomSearch, setNomSearch] = useState("");
  const [nomResults, setNomResults] = useState<NomencladorOut[]>([]);
  const [nomLoading, setNomLoading] = useState(false);
  const [selectedNom, setSelectedNom] = useState<NomencladorOut | null>(null);
  const nomDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Query result
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<TablaValorItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: osList = [] } = useQuery({
    queryKey: ["obras-sociales"],
    queryFn: () => listObrasSociales(),
    staleTime: 10 * 60 * 1000,
  });

  const osNro = selectedOSItem?.nro_obra_social ?? null;

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

  // ── Nomenclador autocomplete ───────────────────────────────────────────────

  function handleNomSearch(q: string) {
    setNomSearch(q);
    setNomResults([]);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) return;

    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        // TODO (speciality restriction): when doctorEspId is available, pass it to filter
        // codes only belonging to the doctor's speciality, e.g.:
        //   listNomenclador({ q: q.trim(), activo: true, size: 15, especialidad_id: doctorEspId })
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
    setResult(null);
    setError(null);
    setSearched(false);
  }

  function clearNom() {
    setSelectedNom(null);
    setNomSearch("");
    setNomResults([]);
    setResult(null);
    setError(null);
    setSearched(false);
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!osNro || !selectedNom) return;

    setLoading(true);
    setSearched(true);
    setResult(null);
    setError(null);
    setEspecialidadValida(null);

    try {
      const [tablaData, espsData] = await Promise.all([
        getTablaValores({ obra_social_nro: osNro, codigo: selectedNom.codigo, size: 5 }),
        doctorEspId != null
          ? getNomencladorEspecialidades(selectedNom.id)
          : Promise.resolve(null),
      ]);

      const exactTabla = tablaData.find(
        (t) => t.codigo.toUpperCase() === selectedNom.codigo.toUpperCase(),
      );
      if (!exactTabla) {
        setError("Este código no tiene precio cargado para la obra social seleccionada.");
        return;
      }

      setResult(exactTabla);

      if (doctorEspId != null && espsData != null) {
        if (selectedNom.sin_restriccion_especialidad) {
          setEspecialidadValida(true);
        } else {
          setEspecialidadValida(espsData.some((e) => e.especialidad_id_colegio === doctorEspId && e.activo));
        }
      }
    } catch {
      setError("Error al consultar. Verificá la obra social y el código.");
    } finally {
      setLoading(false);
    }
  }

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
          <h1 className={styles.title}>Consulta de Precios</h1>
          <p className={styles.subtitle}>Precio de un código para una obra social</p>
        </div>
      </div>

      {/* ── Search form ── */}
      <div className={styles.formCard}>
        <div className={styles.formGrid}>

          {/* Obra social */}
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

          {/* Código CMC */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Código CMC</label>
            {selectedNom ? (
              <div className={styles.selectedCode}>
                <span className={styles.selectedCodeNum}>{selectedNom.codigo}</span>
                <span className={styles.selectedCodeDesc}>{selectedNom.descripcion}</span>
                <button className={styles.clearCodeBtn} onClick={clearNom} type="button" title="Cambiar código">
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
              {loading ? <Loader2 size={15} className={styles.spin} /> : <Search size={15} />}
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
              {doctorEspId != null && especialidadValida !== null && (
                <div
                  className={`${styles.especialidadBadge} ${
                    especialidadValida ? styles.badgeOk : styles.badgeNo
                  }`}
                >
                  {especialidadValida ? (
                    <><CheckCircle2 size={13} /> Tu especialidad está habilitada para este código</>
                  ) : (
                    <><XCircle size={13} /> Tu especialidad no está habilitada para este código</>
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

            <div className={styles.disclaimer}>
              <AlertTriangle size={15} className={styles.disclaimerIcon} />
              Los precios están sujetos a modificaciones por parte de las obras sociales.
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
