import { useState, useMemo, useRef } from "react";
import { Search, Loader2, AlertCircle } from "lucide-react";
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

export default function ConsultaValores() {
  // OS autocomplete
  const [selectedOSItem, setSelectedOSItem] = useState<ObraSocialListItem | null>(null);
  const [osSearch, setOsSearch] = useState("");

  // Especialidad autocomplete
  const [selectedEspItem, setSelectedEspItem] = useState<Especialidad | null>(null);
  const [espSearch, setEspSearch] = useState("");

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

  const { data: especialidades = [] } = useQuery({
    queryKey: ["especialidades"],
    queryFn: getEspecialidades,
    staleTime: 30 * 60 * 1000,
  });

  const osNro = selectedOSItem?.nro_obra_social ?? null;
  // ID_COLEGIO_ESPE — es lo que espera el backend en `especialidades` y lo que devuelve en `especialidad_id_colegio`
  const espId = selectedEspItem?.id_colegio_espe ?? null;

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
        especialidades: espId ? [espId] : undefined,
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

  // ── Specialty validity ─────────────────────────────────────────────────────

  const especialidadValida = useMemo<boolean | null>(() => {
    if (!espId || !selectedNom || !result) return null;
    if (selectedNom.sin_restriccion_especialidad) return true;
    return result.origen === "NE" && result.especialidad_id_colegio === espId;
  }, [espId, selectedNom, result]);

  const canSearch = Boolean(osNro && selectedNom);

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.pagehead}>
          <h1 className={styles.pageTitle}>Consulta de valores</h1>
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

            <Combobox<Especialidad>
              idx={2}
              label="Especialidad"
              hint="opcional"
              placeholder="Buscar especialidad…"
              query={espSearch}
              onQueryChange={(q) => { setEspSearch(q); resetResult(); }}
              items={filteredEsp}
              getKey={(e) => e.id}
              getText={(e) => e.nombre}
              selected={selectedEspItem}
              onSelect={(e) => { setSelectedEspItem(e); setEspSearch(""); resetResult(); }}
              onClear={() => { setSelectedEspItem(null); setEspSearch(""); resetResult(); }}
            />

            <Combobox<NomencladorOut>
              idx={3}
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
                Consultando valores…
              </div>
            ) : result ? (
              <ResultRegister
                result={result}
                showVigencia
                eligibility={
                  espId && selectedEspItem
                    ? { nombre: selectedEspItem.nombre, valida: especialidadValida }
                    : null
                }
              />
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
      </div>
    </div>
  );
}
