// Los recibos del socio que inició sesión: la API los acota por el token, no se manda ningún id de médico.

import { getJSON } from "@/app/shared/lib/http";
import type { DetalleJson } from "../pdf/reciboPdf";

export type MiRecibo = {
  id: number;
  nro_recibo: string;
  pago_id: number;
  anio: number;
  mes: number;
  descripcion: string | null;
  total_neto: string | number;
  estado: string;
  emision_timestamp: string | null;
};

export type MiReciboDetalle = MiRecibo & { detalle_json: DetalleJson | null };

export const listarMisRecibos = () => getJSON<MiRecibo[]>("/api/liquidacion/mis-recibos");
export const getMiRecibo = (id: number) => getJSON<MiReciboDetalle>(`/api/liquidacion/mis-recibos/${id}`);
