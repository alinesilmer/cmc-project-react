import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchMedicos } from "../api";
import type { MedicoOption } from "../types";

// Los números de socio pueden tener 1 sola cifra (ej. "2") — la tolerancia de
// 2 caracteres solo tiene sentido para texto (nombre), no para búsquedas numéricas.
const isNumeric = (s: string) => /^\d+$/.test(s);
const minLenFor = (q: string) => (isNumeric(q) ? 1 : 2);

interface Props {
  value: string | null;
  onChange: (cod: string | null, medico: MedicoOption | null) => void;
  disabled?: boolean;
  label?: string;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
}

const MedicoAutocomplete: React.FC<Props> = ({ value, onChange, disabled, presetLabel, blurOnSelect }) => {
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
      // Este autocomplete es para médicos individuales (ejecutor, ayudante, equipo
      // quirúrgico): /medicos mezcla médicos y organizaciones, así que se filtran las
      // clínicas — no tiene sentido de negocio elegir una como ejecutor/ayudante.
      setOptions(rows.filter((m) => !m.es_organizacion));
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
    subtitle: m.categoria ? `Categoría ${m.categoria}` : undefined,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const med = options.find((m) => String(m.cod) === String(id)) ?? null;
        onChange(id ? String(id) : null, med);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default MedicoAutocomplete;
