import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteValorEtico, getUltimo, listValoresEticos, uploadValorEtico } from "./valoresEticos.api";

const KEY = ["admin", "valores-eticos"] as const;

/** El PDF vigente, el historial y las operaciones de carga y borrado. */
export function useValoresEticos() {
  const queryClient = useQueryClient();

  const { data, isPending, isError } = useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const [ultimo, historial] = await Promise.all([getUltimo(), listValoresEticos()]);
      return { ultimo, historial };
    },
  });

  const refrescar = () => queryClient.invalidateQueries({ queryKey: KEY });

  return {
    ultimo: data?.ultimo ?? null,
    historial: data?.historial ?? [],
    cargando: isPending,
    errorCarga: isError,
    subir: async (archivo: File, observaciones: string) => {
      await uploadValorEtico(archivo, observaciones);
      await refrescar();
    },
    borrar: async (id: number) => {
      await deleteValorEtico(id);
      await refrescar();
    },
  };
}
