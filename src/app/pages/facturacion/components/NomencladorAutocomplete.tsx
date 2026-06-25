import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchNomenclador } from "../api";
import type { NomencladorOption } from "../types";
import { CODIGOS_BLOQUEADOS } from "../constants";

const nomCache = new Map<string, { data: NomencladorOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

interface Props {
  value: string | null;
  onChange: (codigo: string | null, nom: NomencladorOption | null) => void;
  disabled?: boolean;
}

const NomencladorAutocomplete: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [options, setOptions] = useState<NomencladorOption[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) return;
    const cached = nomCache.get(q);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchNomenclador(q);
      nomCache.set(q, { data: rows, ts: Date.now() });
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options
    .filter((n) => !CODIGOS_BLOQUEADOS.includes(n.codigo))
    .map((n) => ({
      id: n.codigo,
      label: `${n.codigo} · ${n.descripcion}`,
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
      disabled={disabled}
    />
  );
};

export default NomencladorAutocomplete;
