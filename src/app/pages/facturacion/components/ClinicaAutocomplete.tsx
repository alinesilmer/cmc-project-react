import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "@/app/components/ui/AppSearchSelect/AppSearchSelect";
import { fetchClinicas } from "../api";
import type { ClinicaOption } from "../types";
import { filtrarYOrdenar } from "./localSearch";

// El backend busca por nombre, o por documento/CUIT/nº socio si el término es numérico.
const isNumeric = (s: string) => /^\d+$/.test(s);
const minLenFor = (q: string) => (isNumeric(q) ? 1 : 2);

interface Props {
  value: number | null;
  onChange: (cod: number | null, clinica: ClinicaOption | null) => void;
  disabled?: boolean;
  /** Precarga la opción mostrada antes de que el usuario busque (usado al editar). */
  presetLabel?: string;
  blurOnSelect?: boolean;
  /** Lista ya traída entera (ver CargaFacturacion.tsx, derivada de `medicosPrecargados` filtrando `es_organizacion`): si viene. */
  clinicasPrecargadas?: ClinicaOption[];
}

const ClinicaAutocomplete: React.FC<Props> = ({
  value, onChange, disabled, presetLabel, blurOnSelect, clinicasPrecargadas,
}) => {
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

  // Con la lista precargada entera, "buscar" es filtrar en memoria.
  const buscarLocal = useCallback((q: string) => {
    if (!clinicasPrecargadas) { setOptions([]); return; }
    if (q.length === 0) { setOptions(clinicasPrecargadas); return; }
    if (q.length < minLenFor(q)) { setOptions([]); return; }
    // Orden de prioridad de coincidencia: Nombre > código interno.
    const filtradas = filtrarYOrdenar(clinicasPrecargadas, q, (c) => [c.nombre, c.cod]);
    setOptions(filtradas);
  }, [clinicasPrecargadas]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((c) => ({
    id: c.cod,
    // Sin nº de socio/código: una clínica no se identifica por matrícula ni nº de socio (eso es de médicos individuales), solo por su nombre.
    label: c.nombre,
    subtitle: c.localidad ?? undefined,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const cod = id != null ? Number(id) : null;
        const clinica = (clinicasPrecargadas ?? options).find((c) => c.cod === cod) ?? null;
        onChange(cod, clinica);
      }}
      onQueryChange={clinicasPrecargadas ? buscarLocal : search}
      loading={clinicasPrecargadas ? false : loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default ClinicaAutocomplete;
