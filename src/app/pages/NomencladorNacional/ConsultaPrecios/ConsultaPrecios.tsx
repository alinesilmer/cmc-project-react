import { useState, useMemo, useRef } from "react";
import Combobox from "../ConsultaShared/Combobox";
import PaginaConsulta from "../ConsultaShared/PaginaConsulta";
import TicketConsulta from "../ConsultaShared/TicketConsulta";
import { useCopago } from "../ConsultaShared/useCopago";
import { listNomenclador, getTablaValores } from "../nomenclador.api";
import type { NomencladorOut, TablaValorItem, ViaPractica } from "../nomenclador.types";
import type { ObraSocialListItem } from "../../ObrasSociales/obrasSociales.types";
import { useObrasSociales } from "../../ObrasSociales/useObrasSociales";
import { useAuth } from "@/app/auth/useAuth";

export default function ConsultaPrecios() {
  const { user } = useAuth();
  // ID_COLEGIO_ESPE en orden de prioridad (principal primero).
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

  // Vía de realización. Solo tiene efecto real en códigos de cirugía asociados a un galeno de 7/10 niveles: en el resto.
  const [via, setVia] = useState<ViaPractica>("T");

  // Query result
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<TablaValorItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: osList = [] } = useObrasSociales();

  const osNro = selectedOSItem?.nro_obra_social ?? null;
  const copago = useCopago(osNro, result);

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

  function resetPractica() {
    setSelectedNom(null);
    setNomSearch("");
    setNomResults([]);
  }

  // ── Práctica autocomplete (async, debounced) ──────────────────────────────

  function handleNomSearch(q: string) {
    setNomSearch(q);
    setNomResults([]);
    if (nomDebounce.current) clearTimeout(nomDebounce.current);
    if (q.trim().length < 2) return;

    // Sin obra social no se busca: para el rol médico el backend solo lista lo que puede facturar EN esa OS.
    if (!osNro) return;

    setNomLoading(true);
    nomDebounce.current = setTimeout(async () => {
      try {
        const res = await listNomenclador({
          q: q.trim(), en_descripcion: true, activo: true, size: 15, obra_social_nro: osNro,
        });
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
        via,
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
    <PaginaConsulta titulo="Consulta de precios">
      <TicketConsulta
        campos={
          <>
            <Combobox<ObraSocialListItem>
              variante="ticket"
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
              // Las prácticas buscables dependen de la OS: al cambiarla se limpia la elegida.
              onSelect={(os) => { setSelectedOSItem(os); setOsSearch(""); resetPractica(); resetResult(); }}
              onClear={() => { setSelectedOSItem(null); setOsSearch(""); resetPractica(); resetResult(); }}
            />

            <Combobox<NomencladorOut>
              variante="ticket"
              idx={2}
              label="Práctica"
              hint="por código o por nombre"
              placeholder="Buscar por código o nombre…"
              query={nomSearch}
              onQueryChange={handleNomSearch}
              items={nomResults}
              getKey={(n) => n.id}
              getCode={(n) => n.codigo}
              getText={(n) => n.descripcion || n.categoria || n.codigo}
              selected={selectedNom}
              onSelect={(n) => { setSelectedNom(n); setNomSearch(""); setNomResults([]); resetResult(); }}
              onClear={() => { setSelectedNom(null); setNomSearch(""); setNomResults([]); resetResult(); }}
              loading={nomLoading}
              menuHint={
                !osNro
                  ? "Elegí primero la obra social"
                  : nomSearch.trim().length < 2
                    ? "Escribí al menos 2 caracteres…"
                    : "No hay prácticas que puedas facturar en esta obra social con ese código o nombre"
              }
            />
          </>
        }
        via={via}
        onVia={(v) => { setVia(v); resetResult(); }}
        puedeConsultar={canSearch}
        consultando={loading}
        onConsultar={handleSearch}
        resultado={result}
        error={searched ? error : null}
        copago={copago}
      />
    </PaginaConsulta>
  );
}
