import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchObrasSociales } from "../api";
import type { ObraSocialOption } from "../types";

// Cache en memoria para obras sociales (casi inmutable por sesión)
const osCache = new Map<string, { data: ObraSocialOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

// Los códigos de obra social pueden tener 1 sola cifra (ej. "6") — la tolerancia de
// 2 caracteres solo tiene sentido para texto (nombre), no para búsquedas numéricas.
const isNumeric = (s: string) => /^\d+$/.test(s);
const minLenFor = (q: string) => (isNumeric(q) ? 1 : 2);

interface Props {
  value: number | null;
  onChange: (nroObraSocial: number | null, os: ObraSocialOption | null) => void;
  disabled?: boolean;
  blurOnSelect?: boolean;
  /** Nombre de la OS ya elegida, para mostrarla antes de buscar (usado al replicar). */
  presetLabel?: string;
  /** Lista ya traída entera (ver CargaFacturacion.tsx): si viene, se filtra en
   *  memoria y no se pega más a `/obras-sociales` por cada tecleo. Sin esto, busca
   *  como siempre — el resto de las pantallas que usan este campo no se tocan. */
  obrasSocialesPrecargadas?: ObraSocialOption[];
}

const ObraSocialAutocomplete: React.FC<Props> = ({
  value, onChange, disabled, blurOnSelect, presetLabel, obrasSocialesPrecargadas,
}) => {
  const [options, setOptions] = useState<ObraSocialOption[]>(() =>
    value != null && presetLabel ? [{ id: value, nro_obra_social: value, nombre: presetLabel }] : [],
  );
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < minLenFor(q)) { setOptions([]); return; }
    const cached = osCache.get(q);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      return;
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    try {
      const rows = await fetchObrasSociales(q);
      osCache.set(q, { data: rows, ts: Date.now() });
      setOptions(rows);
    } catch {
      // abort or network error
    } finally {
      setLoading(false);
    }
  }, []);

  // Con la lista precargada entera (~140 filas), "buscar" es filtrar en memoria.
  const buscarLocal = useCallback((q: string) => {
    if (q.length < minLenFor(q) || !obrasSocialesPrecargadas) { setOptions([]); return; }
    const needle = q.toLowerCase();
    const filtradas = obrasSocialesPrecargadas.filter(
      (os) => String(os.nro_obra_social).includes(q) || os.nombre.toLowerCase().includes(needle),
    );
    setOptions(filtradas.slice(0, 20));
  }, [obrasSocialesPrecargadas]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const selectOptions: AppSearchSelectOption[] = options.map((os) => ({
    id: os.nro_obra_social,
    label: `${os.nro_obra_social} · ${os.nombre}`,
  }));

  return (
    <AppSearchSelect
      options={selectOptions}
      value={value}
      onChange={(id) => {
        const os = (obrasSocialesPrecargadas ?? options).find((o) => o.nro_obra_social === Number(id)) ?? null;
        onChange(id ? Number(id) : null, os);
      }}
      onQueryChange={obrasSocialesPrecargadas ? buscarLocal : search}
      loading={obrasSocialesPrecargadas ? false : loading}
      disabled={disabled}
      blurOnSelect={blurOnSelect}
    />
  );
};

export default ObraSocialAutocomplete;
