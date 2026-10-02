import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createAd, listAds, removeAd, updateAd, type PubAd } from "../../../lib/ads.client";

const KEY = ["admin", "avisos-medicos"] as const;

type Cambios = Partial<{ medico_id: number; activo: boolean }>;

/**
 * Los avisos y sus operaciones. Cada cambio refresca también el directorio
 * público (/medicos-asociados), que lee los mismos avisos.
 */
export function useAvisosAdmin() {
  const queryClient = useQueryClient();
  const { data: avisos = [], isPending } = useQuery({ queryKey: KEY, queryFn: () => listAds() });

  const refrescar = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: KEY }),
      queryClient.invalidateQueries({ queryKey: ["web", "avisos-medicos"] }),
    ]);

  return {
    avisos,
    cargando: isPending,
    crear: async (medicoId: number, activo: boolean, imagen: File) => {
      await createAd({ medico_id: medicoId, activo }, imagen);
      await refrescar();
    },
    actualizar: async (aviso: PubAd, cambios: Cambios, imagen?: File | null) => {
      await updateAd(aviso.id, cambios, imagen);
      await refrescar();
    },
    borrar: async (aviso: PubAd) => {
      await removeAd(aviso.id);
      await refrescar();
    },
  };
}
