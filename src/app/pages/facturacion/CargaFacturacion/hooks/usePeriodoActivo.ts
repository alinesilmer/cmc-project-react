import { useState, useCallback } from "react";
import { fetchPeriodoActivo } from "../../api";
import type { PeriodoActivoResponse } from "../../types";

export function usePeriodoActivo() {
  const [periodo, setPeriodo] = useState<PeriodoActivoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (codObra: string) => {
    setLoading(true);
    setError(null);
    setPeriodo(null);
    try {
      const data = await fetchPeriodoActivo(codObra);
      setPeriodo(data);
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "No hay período activo para esta obra social.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPeriodo(null);
    setError(null);
  }, []);

  return { periodo, error, loading, load, reset };
}
