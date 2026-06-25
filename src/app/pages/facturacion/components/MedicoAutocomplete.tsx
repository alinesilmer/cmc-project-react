import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "../api";
import type { MedicoOption } from "../types";

interface Props {
  value: string | null;
  onChange: (cod: string | null, medico: MedicoOption | null) => void;
  disabled?: boolean;
  label?: string;
}

const MedicoAutocomplete: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [options, setOptions] = useState<MedicoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchMedicos(q);
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((m) => ({
    id: m.cod,
    label: `${m.cod} · ${m.nombre}`,
    subtitle: m.categoria ? `Categoría ${m.categoria}` : undefined,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const med = options.find((m) => m.cod === String(id)) ?? null;
        onChange(id ? String(id) : null, med);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
    />
  );
};

export default MedicoAutocomplete;
