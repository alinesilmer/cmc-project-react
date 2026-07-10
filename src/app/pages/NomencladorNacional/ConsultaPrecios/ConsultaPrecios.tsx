import { useState, useMemo, useRef } from "react";
import { Search, Loader2, AlertCircle, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import styles from "../ConsultaShared/consulta.module.scss";
import Combobox from "../ConsultaShared/Combobox";
import ResultRegister from "../ConsultaShared/ResultRegister";
import { listNomenclador, getTablaValores } from "../nomenclador.api";
import { listObrasSociales } from "../../ObrasSociales/obrasSociales.api";
import type { NomencladorOut, TablaValorItem } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useAuth } from "../../../auth/AuthProvider";

export default function ConsultaPrecios() {
  const { user } = useAuth();
  // ID_COLEGIO_ESPE en orden de prioridad (principal primero). La especialidad
  // no se elige acá: la determina el usuario logueado.
  const doctorEspecialidades: number[] = user?.especialidades ?? [];

  // OS autocomplete
  const [selectedOSItem, setSelectedOSItem] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");

  // Práctica (nomenclador) autocomplete
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

  function resetResult() {
    setResult(null);
    setError(null);
    setSearched(false);
  }

  // ── Práctica autocomplete (async, debounced) ──────────────────────────────

  function handleNomSearch(q: string) {
    setNomSearch(q);
    setNomResults([]);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) return;

    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        // TODO (speciality restriction): when doctorEspecialidades is available, pass it to
        // filter codes only belonging to the doctor's specialities, e.g.:
        //   listNomenclador({ q: q.trim(), activo: true, size: 15, especialidad_id: doctorEspecialidades[0] })
        const res = await listNomenclador({ q: q.trim(), activo: true, size: 15 });
        setNomResults(res);
      } catch {
        setNomResults([]);
      } finally {
        setNomLoading(false);
      }
    }, 300);
  }

  // ── Search ─────────────────────────────────────────────────────────────────

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
        especialidades: doctorEspecialidades.length ? doctorEspecialidades : undefined,
        size: 5,
      });

      const exactTabla = tablaData.find(
        (t) => t.codigo.toUpperCase() === selectedNom.codigo.toUpperCase(),
      );
      if (!exactTabla) {
        setError("Este código no tiene precio cargado para la obra social seleccionada.");
        return;
      }

      setResult(exactTabla);
    } catch {
      setError("Error al consultar. Verificá la obra social y el código.");
    } finally {
      setLoading(false);
    }
  }

  const canSearch = Boolean(osNro && selectedNom);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pagehead}>
          <h1 className={styles.pageTitle}>Consulta de precios</h1>
          <p className={styles.pageSub}>
            Valor vigente de una práctica según el convenio pactado con una obra
            social.
          </p>
        </div>

        <div className={styles.instrument}>
          {/* ── Query column ── */}
          <div className={styles.colQuery}>
            <div className={styles.colTitle} />

            <Combobox<ObraSocialListItem>
              idx={1}
              label="Obra social"
              placeholder="Buscar por nombre o número…"
              query={osSearch}
              onQueryChange={(q) => { setOsSearch(q); resetResult(); }}
              items={filteredOS}
              getKey={(os) => os.nro_obra_social}
              getCode={(os) => String(os.nro_obra_social)}
              getText={(os) => os.nombre}
              selected={selectedOSItem}
              onSelect={(os) => { setSelectedOSItem(os); setOsSearch(""); resetResult(); }}
              onClear={() => { setSelectedOSItem(null); setOsSearch(""); resetResult(); }}
            />

            <Combobox<NomencladorOut>
              idx={2}
              label="Práctica"
              hint="por código o por nombre"
              placeholder="Buscar por código o descripción…"
              query={nomSearch}
              onQueryChange={handleNomSearch}
              items={nomResults}
              getKey={(n) => n.id}
              getCode={(n) => n.codigo}
              getText={(n) => n.descripcion}
              selected={selectedNom}
              onSelect={(n) => { setSelectedNom(n); setNomSearch(""); setNomResults([]); resetResult(); }}
              onClear={() => { setSelectedNom(null); setNomSearch(""); setNomResults([]); resetResult(); }}
              loading={nomLoading}
              menuHint="Escribí al menos 2 caracteres…"
            />

            <button
              type="button"
              className={styles.cta}
              onClick={handleSearch}
              disabled={!canSearch || loading}
            >
              {loading ? <Loader2 size={17} className={styles.spin} /> : <Search size={17} />}
              Consultar precio
            </button>
          </div>

          {/* ── Result column ── */}
          <div className={styles.colResult}>
            {loading ? (
              <div className={styles.loading}>
                <span className={styles.pulse} />
                Consultando precios…
              </div>
            ) : result ? (
              <ResultRegister result={result} showVigencia={false} />
            ) : searched && error ? (
              <div className={styles.errorbox}>
                <AlertCircle size={18} />
                {error}
              </div>
            ) : (
              <div className={styles.prompt}>
                <div className={styles.promptLines} aria-hidden="true">
                  <i /><i /><i /><i /><i /><i />
                </div>
                <div className={styles.promptInner}>
                 
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={styles.disclaimer}>
          <AlertTriangle size={16} />
          Los precios están sujetos a modificaciones por parte de las obras sociales.
        </div>
      </div>
    </div>
  );
}
