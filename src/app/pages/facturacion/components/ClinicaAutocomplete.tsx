import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchClinicas } from "../api";
import type { ClinicaOption } from "../types";

// El backend busca por nombre, o por documento/CUIT/nº socio si el término es numérico.
// La tolerancia de 2 caracteres solo aplica al texto; en numérico alcanza con 1.
const isNumeric = (s: string) => /^\d+$/.test(s);
const minLenFor = (q: string) => (isNumeric(q) ? 1 : 2);

interface Props {
  value: number | null;
  onChange: (cod: number | null, clinica: ClinicaOption | null) => void;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const ClinicaAutocomplete: React.FC<Props> = ({ value, onChange, disabled, presetLabel, blurOnSelect }) => {
  const [options, setOptions] = useState<ClinicaOption[]>(() =>
    value != null && presetLabel ? [{ cod: value, nombre: presetLabel }] : [],
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < minLenFor(q)) { setOptions([]); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchClinicas(q);
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((c) => ({
    id: c.cod,
    label: `${c.cod} · ${c.nombre}`,
    subtitle: c.localidad ?? undefined,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const cod = id != null ? Number(id) : null;
        const clinica = options.find((c) => c.cod === cod) ?? null;
        onChange(cod, clinica);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default ClinicaAutocomplete;
