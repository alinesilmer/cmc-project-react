import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "../api";
import type { MedicoOption } from "../types";

// Payee = a quién se le paga. GET /medicos ya devuelve `es_organizacion` para cada
// socio (médico o clínica), así que un solo fetch alcanza para mezclar ambos casos.
const isNumeric = (s: string) => /^\d+$/.test(s);
const minLenFor = (q: string) => (isNumeric(q) ? 1 : 2);

interface Props {
  value: string | null;
  onChange: (cod: string | null, payee: MedicoOption | null) => void;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const PayeeAutocomplete: React.FC<Props> = ({ value, onChange, disabled, presetLabel, blurOnSelect }) => {
  const [options, setOptions] = useState<MedicoOption[]>(() =>
    value && presetLabel ? [{ cod: value, nombre: presetLabel }] : [],
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < minLenFor(q)) { setOptions([]); return; }
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
    // Nº socio · nombre · matrícula (la matrícula se omite si no viene).
    label: [m.cod, m.nombre, m.matricula]
      .filter((v) => v != null && v !== "")
      .join(" · "),
    subtitle: m.es_organizacion
      ? "Clínica / organización"
      : m.categoria
        ? `Categoría ${m.categoria}`
        : undefined,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const payee = options.find((m) => String(m.cod) === String(id)) ?? null;
        onChange(id ? String(id) : null, payee);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default PayeeAutocomplete;
