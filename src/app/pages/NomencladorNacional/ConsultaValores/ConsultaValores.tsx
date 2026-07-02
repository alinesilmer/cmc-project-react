import { useMemo, useRef, useState } from "react";
import { Search, Loader2, AlertCircle, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import styles from "../ConsultaShared/consulta.module.scss";
import Combobox from "../ConsultaShared/Combobox";
import ResultRegister from "../ConsultaShared/ResultRegister";
import { listNomenclador, getTablaValores } from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import { getEspecialidades } from "../../Especialidades/especialidades.api";
import type { NomencladorOut, TablaValorItem } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import type { Especialidad } from "../../Especialidades/especialidades.types";

const NOM_MIN_CHARS = 2;

export default function ConsultaValores() {
  // Obra social (client-side filtered from a cached list)
  const [selectedOS, setSelectedOS] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");

  // Especialidad (optional, client-side filtered)
  const [selectedEsp, setSelectedEsp] = useState<Especialidad | null>(null);
  const [espSearch, setEspSearch] = useState("");

  // Código CMC (debounced server search)
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

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });

  const osNro = selectedOS?.nro_obra_social ?? null;

  const filteredOS = useMemo(() => {
    if (!osSearch.trim()) return osList.slice(0, 50);
    const q = osSearch.toLowerCase();
    return osList
      .filter((os) => os.nombre.toLowerCase().includes(q) || String(os.nro_obra_social).includes(q))
      .slice(0, 50);
  }, [osList, osSearch]);

  const filteredEsp = useMemo(() => {
    if (!espSearch.trim()) return especialidades;
    const q = espSearch.toLowerCase();
    return especialidades.filter((e) => e.nombre.toLowerCase().includes(q));
  }, [especialidades, espSearch]);

  // Any input change invalidates the previous result.
  function resetOutput() {
    setResult(null);
    setError(null);
    setSearched(false);
  }

  function selectOS(os: ObraSocialListItem) {
    setSelectedOS(os);
    setOsSearch("");
    resetOutput();
  }
  function clearOS() {
    setSelectedOS(null);
    setOsSearch("");
    resetOutput();
  }

  function selectEsp(e: Especialidad) {
    setSelectedEsp(e);
    setEspSearch("");
    resetOutput();
  }
  function clearEsp() {
    setSelectedEsp(null);
    setEspSearch("");
    resetOutput();
  }

  function handleNomSearch(q: string) {
    setNomSearch(q);
    setNomResults([]);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < NOM_MIN_CHARS) {
      setNomLoading(false);
      return;
    }
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
    resetOutput();
  }
  function clearNom() {
    setSelectedNom(null);
    setNomSearch("");
    setNomResults([]);
    resetOutput();
  }

  async function handleSearch() {
    if (!osNro || !selectedNom) return;
    setLoading(true);
    setSearched(true);
    setResult(null);
    setError(null);
    try {
      const tablaData = await getTablaValores({
        obra_social_nro: osNro,
        codigo: selectedNom.codigo,
        size: 5,
      });
      const exact = tablaData.find(
        (t) => t.codigo.toUpperCase() === selectedNom.codigo.toUpperCase(),
      );
      if (!exact) {
        setError("Este código no tiene precio cargado para la obra social seleccionada.");
        return;
      }
      setResult(exact);
    } catch {
      setError("Error al consultar. Verificá la obra social y el código.");
    } finally {
      setLoading(false);
    }
  }

  const canSearch = Boolean(osNro && selectedNom);
  const nomMenuHint =
    nomSearch.trim().length > 0 && nomSearch.trim().length < NOM_MIN_CHARS
      ? "Seguí escribiendo…"
      : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pagehead}>
          <h1 className={styles.pageTitle}>Consulta de valores</h1>
          <p className={styles.pageSub}>
            Valor de una práctica según la obra social y la especialidad.
          </p>
        </div>

        <div className={styles.instrument}>
          {/* Query */}
          <section className={styles.colQuery} aria-label="Consultar valor">
            <div className={styles.colTitle}></div>

            <Combobox<ObraSocialListItem>
              idx={1}
              label="Obra social"
              placeholder="Buscar por nombre o número…"
              query={osSearch}
              onQueryChange={setOsSearch}
              items={filteredOS}
              getKey={(os) => os.nro_obra_social}
              getCode={(os) => String(os.nro_obra_social)}
              getText={(os) => os.nombre}
              selected={selectedOS}
              onSelect={selectOS}
              onClear={clearOS}
            />

            <Combobox<Especialidad>
              idx={2}
              label="Especialidad"
              hint="opcional"
              placeholder="Buscar especialidad…"
              query={espSearch}
              onQueryChange={setEspSearch}
              items={filteredEsp}
              getKey={(e) => e.id}
              getText={(e) => e.nombre}
              selected={selectedEsp}
              onSelect={selectEsp}
              onClear={clearEsp}
            />

            <Combobox<NomencladorOut>
              idx={3}
              label="Práctica"
              hint="por código o por nombre"
              placeholder="Buscar por código o nombre…"
              query={nomSearch}
              onQueryChange={handleNomSearch}
              items={nomResults}
              getKey={(n) => n.id}
              getCode={(n) => n.codigo}
              getText={(n) => n.descripcion}
              selected={selectedNom}
              onSelect={selectNom}
              onClear={clearNom}
              loading={nomLoading}
              menuHint={nomMenuHint}
            />

            <button
              type="button"
              className={styles.cta}
              onClick={handleSearch}
              disabled={!canSearch || loading}
              title={!canSearch ? "Elegí obra social y práctica" : undefined}
            >
              {loading ? <Loader2 size={18} className={styles.spin} /> : <Search size={18} />}
              Consultar valor
            </button>
          </section>

          {/* Result */}
          <section className={styles.colResult} aria-live="polite">
            {loading ? (
              <div className={styles.loading}>
                <span className={styles.pulse} />
                <span>Emitiendo valor…</span>
              </div>
            ) : searched && error ? (
              <div className={styles.errorbox}>
                <AlertCircle size={18} />
                {error}
              </div>
            ) : result ? (
              <ResultRegister result={result} />
            ) : (
              <div className={styles.prompt}>
                <div className={styles.promptLines} aria-hidden="true">
                  <i /><i /><i /><i />
                </div>
                <div className={styles.promptInner}></div>
              </div>
            )}
          </section>
        </div>

        <p className={styles.disclaimer}>
          <Info size={15} />
          Los valores son orientativos y pueden actualizarse según cada obra social.
        </p>
      </div>
    </div>
  );
}
