import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchCodigosHabilitados } from "../api";
import type { NomencladorOption } from "../types";
import { CODIGOS_BLOQUEADOS } from "../constants";

// Cacheado por médico — los códigos habilitados de un socio no son los mismos que los de otro.
const cache = new Map<string, { data: NomencladorOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

interface Props {
  value: string | null;
  onChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  /** Médico ya elegido en el formulario — los códigos habilitados dependen de él. */
  codMedico: string | null;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const NomencladorAutocomplete: React.FC<Props> = ({ value, onChange, codMedico, disabled, presetLabel, blurOnSelect }) => {
  const [options, setOptions] = useState<NomencladorOption[]>(() =>
    value && presetLabel ? [{ codigo: value, descripcion: presetLabel }] : [],
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (!codMedico) { setOptions([]); return; }
    const cacheKey = `${codMedico}::${q}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchCodigosHabilitados(codMedico, q || undefined);
      cache.set(cacheKey, { data: rows, ts: Date.now() });
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, [codMedico]);

  // Al cambiar (o perder) el médico, los códigos habilitados anteriores ya no valen —
  // se precarga la lista completa habilitada para el médico nuevo (sin filtro `q`).
  useEffect(() => {
    setOptions([]);
    if (codMedico) search("");
  }, [codMedico]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options
    .filter((n) => !CODIGOS_BLOQUEADOS.includes(n.codigo))
    .map((n) => ({
      id: n.codigo,
      label: `${n.codigo} · ${n.descripcion}`,
      subtitle: n.categoria ?? undefined,
    }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const nom = options.find((n) => n.codigo === String(id)) ?? null;
        onChange(id ? String(id) : null, nom);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled || !codMedico}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default NomencladorAutocomplete;
