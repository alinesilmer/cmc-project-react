import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { delJSON, getJSON, postJSON, putJSON } from "../../lib/http";
import type { ObservacionesMap } from "./boletinConsultaComun.types";

// ─── API response shapes ──────────────────────────────────────────

type ApiObservacion = {
  nro_obrasocial: number;
  texto: string;
  updated_at: string;
};

type ApiObservacionesResponse = {
  items: ApiObservacion[];
};

type ApiPlantilla = {
  id: number;
  texto: string;
};

type ApiPlantillasResponse = {
  items: ApiPlantilla[];
};

// ─── Query keys ───────────────────────────────────────────────────

const OBS_KEY = ["boletin-observaciones"] as const;
const PLANTILLAS_KEY = ["boletin-observaciones", "plantillas"] as const;

// ─── Hook ────────────────────────────────────────────────────────

export type { ObservacionesMap };

/** Reusable template with its backend id (needed for DELETE). */
export type Plantilla = ApiPlantilla;

export function useObservaciones() {
  const queryClient = useQueryClient();

  // ── Fetch observations ─────────────────────────────────────────
  const {
    data: obsData,
    isLoading: isLoadingObs,
  } = useQuery({
    queryKey: OBS_KEY,
    queryFn: () => getJSON<ApiObservacionesResponse>("/api/boletin/observaciones"),
    staleTime: 5 * 60 * 1000,
    select: (res): ObservacionesMap =>
      Object.fromEntries(res.items.map((o) => [o.nro_obrasocial, o.texto])),
  });

  const observaciones: ObservacionesMap = obsData ?? {};

  // ── Fetch templates ────────────────────────────────────────────
  const {
    data: plantillasData,
    isLoading: isLoadingPlantillas,
  } = useQuery({
    queryKey: PLANTILLAS_KEY,
    queryFn: () => getJSON<ApiPlantillasResponse>("/api/boletin/observaciones/plantillas"),
    staleTime: 10 * 60 * 1000,
    select: (res): Plantilla[] => res.items,
  });

  const templates: Plantilla[] = plantillasData ?? [];

  // ── Save observation (upsert or delete) ────────────────────────
  const saveMutation = useMutation({
    mutationFn: async ({ nro, texto }: { nro: number; texto: string }) => {
      if (texto) {
        await putJSON(`/api/boletin/observaciones/${nro}`, { texto });
      } else {
        await delJSON(`/api/boletin/observaciones/${nro}`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: OBS_KEY });
    },
  });

  const saveObservacion = useCallback(
    async (nro: number, texto: string): Promise<void> => {
      await saveMutation.mutateAsync({ nro, texto: texto.trim().slice(0, 1000) });
    },
    [saveMutation]
  );

  const savingNro: number | null =
    saveMutation.isPending ? (saveMutation.variables?.nro ?? null) : null;

  // ── Add template ───────────────────────────────────────────────
  const addTemplateMutation = useMutation({
    mutationFn: (texto: string) =>
      postJSON<ApiPlantilla>("/api/boletin/observaciones/plantillas", { texto }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLANTILLAS_KEY });
    },
  });

  const addTemplate = useCallback(
    async (texto: string): Promise<void> => {
      const trimmed = texto.trim().slice(0, 1000);
      if (!trimmed) return;
      await addTemplateMutation.mutateAsync(trimmed);
    },
    [addTemplateMutation]
  );

  // ── Remove template ────────────────────────────────────────────
  const removeTemplateMutation = useMutation({
    mutationFn: (id: number) =>
      delJSON(`/api/boletin/observaciones/plantillas/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PLANTILLAS_KEY });
    },
  });

  const removeTemplate = useCallback(
    async (id: number): Promise<void> => {
      await removeTemplateMutation.mutateAsync(id);
    },
    [removeTemplateMutation]
  );

  return {
    observaciones,
    isLoadingObs,
    saveObservacion,
    savingNro,
    templates,
    isLoadingPlantillas,
    addTemplate,
    removeTemplate,
    isSavingTemplate: addTemplateMutation.isPending,
  };
}
