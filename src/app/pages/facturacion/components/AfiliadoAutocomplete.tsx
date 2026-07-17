import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchAfiliados } from "../api";
import type { AfiliadoRead } from "../types";

interface Props {
  value: string | null;
  onChange: (dni: string | null, afiliado: AfiliadoRead | null) => void;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const AfiliadoAutocomplete: React.FC<Props> = ({ value, onChange, disabled, presetLabel, blurOnSelect }) => {
  const [options, setOptions] = useState<AfiliadoRead[]>(() =>
    value && presetLabel ? [{ id: 0, dni: value, nombre: presetLabel }] : [],
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 1) { setOptions([]); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchAfiliados(q);
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((a) => ({
    id: a.dni,
    label: `${a.dni} · ${a.nombre}`,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const afiliado = options.find((a) => a.dni === String(id)) ?? null;
        onChange(id ? String(id) : null, afiliado);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default AfiliadoAutocomplete;
