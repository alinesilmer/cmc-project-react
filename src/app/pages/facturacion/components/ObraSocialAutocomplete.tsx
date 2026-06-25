import React, { useCallback, useEffect, useRef, useState } from "react";
import AppSearchSelect, { type AppSearchSelectOption } from "../../../components/atoms/AppSearchSelect/AppSearchSelect";
import { fetchObrasSociales } from "../api";
import type { ObraSocialOption } from "../types";

// Cache en memoria para obras sociales (casi inmutable por sesión)
const osCache = new Map<string, { data: ObraSocialOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000;

interface Props {
  value: number | null;
  onChange: (nroObraSocial: number | null, os: ObraSocialOption | null) => void;
  disabled?: boolean;
}

const ObraSocialAutocomplete: React.FC<Props> = ({ value, onChange, disabled }) => {
  const [options, setOptions] = useState<ObraSocialOption[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) return;
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
        const os = options.find((o) => o.nro_obra_social === Number(id)) ?? null;
        onChange(id ? Number(id) : null, os);
      }}
      onQueryChange={search}
      loading={loading}
      disabled={disabled}
    />
  );
};

export default ObraSocialAutocomplete;
