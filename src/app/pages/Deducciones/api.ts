import { delJSON, getJSON, patchJSON, postJSON } from "../../lib/http";
import type {
  DeduccionCreatePayload,
  DeduccionRead,
  DeduccionHistorialItem,
  DeduccionHistorialResponse,
  DeduccionEstado,
  DescuentoOption,
  MedicoOption,
  Pago,
  TopDeudorItem,
} from "./types";

const DEDUCCIONES_URL = "/api/deducciones";

type HistorialParams = {
  page?: number;
  size?: number;
  medico_id?: number;
  estado?: DeduccionEstado | "";
  origen?: "manual" | "automatico" | "";
  mes_desde?: number;
  anio_desde?: number;
  mes_hasta?: number;
  anio_hasta?: number;
};

export const fetchDeduccion = (id: number) =>
  getJSON<DeduccionHistorialItem>(`${DEDUCCIONES_URL}/${id}`);

export const fetchDeduccionesHistorial = (params: HistorialParams) =>
  getJSON<DeduccionHistorialResponse>(DEDUCCIONES_URL, params);

export const fetchDeduccionesHistorialExport = (params: Omit<HistorialParams, "page" | "size">) =>
  getJSON<DeduccionHistorialItem[]>(`${DEDUCCIONES_URL}/export`, params);

export const fetchTopDeudores = (limit = 10) =>
  getJSON<TopDeudorItem[]>("/api/deducciones/top-deudores", { limit });

export const updateDeduccionEstado = (id: number, estado: "en_pago" | "pendiente" | "aplicado") =>
  patchJSON<DeduccionHistorialItem>(`${DEDUCCIONES_URL}/${id}`, { estado });

export const updateDeduccionMonto = (id: number, monto: number, paga_por_caja?: boolean) =>
  patchJSON<DeduccionHistorialItem>(
    `${DEDUCCIONES_URL}/${id}`,
    paga_por_caja !== undefined ? { monto, paga_por_caja } : { monto },
  );

export const deleteDeduccion = (id: number) =>
  delJSON<{ id: number; origen: string; estado: string }>(`${DEDUCCIONES_URL}/${id}`);

export const createDeduccion = (payload: DeduccionCreatePayload) =>
  postJSON<DeduccionRead[]>(DEDUCCIONES_URL, payload);

export const pagarEnCaja = (id: number) =>
  postJSON<DeduccionHistorialItem>(`${DEDUCCIONES_URL}/${id}/pagar`, {});

export const fetchDescuentos = async (): Promise<DescuentoOption[]> => {
  const raw = await getJSON<any[]>("/api/descuentos");
  return (raw ?? [])
    .map((d) => {
      const nro_colegio = String(d?.nro_colegio ?? "").trim();
      return {
        id: Number(d?.id ?? d?.desc_id ?? 0),
        nombre: String(d?.nombre ?? d?.concepto ?? d?.name ?? "").trim(),
        nro_colegio: nro_colegio || undefined,
      };
    })
    .filter((d) => d.id > 0 && d.nombre.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
};

export const fetchMedicos = async (query: string): Promise<MedicoOption[]> => {
  const params: Record<string, unknown> = { limit: 50, skip: 0 };
  const q = query.trim();
  if (q.length >= 2) params.q = q;

  const raw = await getJSON<any[]>("/api/medicos/all", params);
  return (raw ?? [])
    .map((m) => ({
      id: Number(m?.id ?? m?.ID ?? 0),
      nro_socio:
        m?.nro_socio !== undefined && m?.nro_socio !== null
          ? Number(m.nro_socio)
          : m?.NRO_SOCIO !== undefined && m?.NRO_SOCIO !== null
          ? Number(m.NRO_SOCIO)
          : null,
      nombre: String(m?.nombre ?? m?.NOMBRE ?? "").trim(),
    }))
    .filter((m) => m.id > 0 && m.nombre.length > 0)
    .slice(0, 50);
};

export const fetchOpenPago = async (): Promise<Pago | null> => {
  const pagos = await getJSON<Pago[]>("/api/pagos/", { estado: "A", skip: 0, limit: 1 });
  return Array.isArray(pagos) && pagos.length > 0 ? pagos[0] : null;
};
