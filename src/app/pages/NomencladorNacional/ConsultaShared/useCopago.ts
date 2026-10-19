import { useQuery } from "@tanstack/react-query";

import { hoyISO } from "@/app/features/nomenclador/galenos";
import { listValores } from "../nomenclador.api";
import type { TablaValorItem } from "../nomenclador.types";

/** El copago del valor que se está mostrando, si la obra social lo cobra. */
export function useCopago(obraSocialNro: number | null, resultado: TablaValorItem | null): number | null {
  const { data = null } = useQuery({
    queryKey: [
      "copago",
      obraSocialNro,
      resultado?.codigo,
      resultado?.origen,
      resultado?.especialidad_id_colegio,
      resultado?.vigencia_desde,
    ],
    enabled: Boolean(obraSocialNro && resultado),
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!obraSocialNro || !resultado) return null;
      const valores = await listValores({
        obra_social_nro: obraSocialNro,
        codigo: resultado.codigo,
        vigente_a: hoyISO(),
        size: 200,
      });
      const misma = (v: (typeof valores)[number]) =>
        v.origen === resultado.origen &&
        (v.especialidad_id_colegio ?? null) === (resultado.especialidad_id_colegio ?? null);
      const valor =
        valores.find((v) => misma(v) && v.vigencia_desde === resultado.vigencia_desde) ??
        valores.find(misma);
      const copago = Number(valor?.coseguro ?? 0);
      return Number.isFinite(copago) && copago > 0 ? copago : null;
    },
  });
  return data;
}
