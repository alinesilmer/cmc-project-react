import { useState, useEffect, useRef } from "react";
import { fetchPrecio } from "../../api";
import type { PrecioResponse } from "../../types";

const DEBOUNCE_MS = 250;

interface Params {
  codMedico: string | null;
  codObra: string | null;
  codigo: string | null;
  fecha?: string | null;
}

export function useNomencladorPrecio({ codMedico, codObra, codigo, fecha }: Params) {
  const [precio, setPrecio] = useState<PrecioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!codMedico || !codObra || !codigo) {
      setPrecio(null);
      setError(null);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPrecio(codMedico, codObra, codigo, fecha ?? undefined);
        setPrecio(data);
      } catch (e: any) {
        const detail = e?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "No se pudo obtener el precio.");
        setPrecio(null);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [codMedico, codObra, codigo, fecha]);

  const reset = () => { setPrecio(null); setError(null); };

  return { precio, loading, error, reset };
}
