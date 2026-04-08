import { useEffect, useState } from "react";

import { getJSON } from "../../../lib/http";
import type { EspecialidadOption } from "../../../lib/especialidadesCatalog";
import {
  getEspecialidadesCatalog,
  hasEspecialidadesCatalog,
  setEspecialidadesCatalog,
} from "../../../lib/especialidadesCatalog";

function normalizeOptions(data: unknown): EspecialidadOption[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((e: any) => {
      const rawVal =
        e?.id_colegio_espe ?? e?.id ?? e?.ID ?? e?.codigo ?? e?.CODIGO ?? e?.value ?? "";
      const rawLabel =
        e?.nombre ?? e?.NOMBRE ?? e?.descripcion ?? e?.DESCRIPCION ??
        e?.detalle ?? e?.DETALLE ?? e?.label ?? e?.name ?? rawVal;
      const v = String(rawVal ?? "").trim();
      const l = String(rawLabel ?? "").trim();
      return { value: v || l, label: l || v };
    })
    .filter((x) => x.value && x.value !== "0");
}

/**
 * Loads especialidades from the API with a global in-memory cache.
 * Re-opening the modal after the first successful load is instant (no network call).
 */
export function useEspecialidades() {
  const [especialidades, setEspecialidades] = useState<EspecialidadOption[]>(() =>
    hasEspecialidadesCatalog() ? getEspecialidadesCatalog() : []
  );
  const [loading, setLoading] = useState(!hasEspecialidadesCatalog());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasEspecialidadesCatalog()) return; // already loaded — skip network call

    let aborted = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const data = await getJSON<unknown[]>("/api/especialidades/");
        const opts = normalizeOptions(data);
        if (!aborted) {
          setEspecialidades(opts);
          setEspecialidadesCatalog(opts);
        }
      } catch (err: any) {
        if (!aborted) setError(err?.message ?? "No se pudo cargar especialidades");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, []);

  return { especialidades, loading, error };
}
