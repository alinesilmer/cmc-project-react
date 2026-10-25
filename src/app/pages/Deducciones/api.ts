import { delJSON, getJSON, patchJSON, postJSON } from "@/app/shared/lib/http";
import type {
  DeduccionCreatePayload,
  DeduccionRead,
  DeduccionHistorialItem,
  DeduccionHistorialResponse,
  DeduccionEstado,
  DescuentoOption,
  MedicoOption,
  Pago,
  ResumenPagoAbierto,
} from "./types";

const DEDUCCIONES_URL = "/api/deducciones";
// La raíz lleva barra final: sin ella FastAPI responde 307 hacia una URL absoluta y, con el proxy
// de desarrollo (otro origen), el navegador descarta el Authorization y la API contesta 401 «Falta token».
const DEDUCCIONES_RAIZ = `${DEDUCCIONES_URL}/`;

type HistorialParams = {
  page?: number;
  size?: number;
  medico_id?: number;
  descuento_id?: number;
  /** Uno o varios estados separados por coma: «pendiente,vencida». */
  estado?: DeduccionEstado | string;
  /** Sólo deducciones de médicos que participan en el pago abierto. */
  solo_en_pago?: boolean;
  origen?: "manual" | "automatico" | "";
  mes_desde?: number;
  anio_desde?: number;
  mes_hasta?: number;
  anio_hasta?: number;
};

export const fetchDeduccion = (id: number) =>
  getJSON<DeduccionHistorialItem>(`${DEDUCCIONES_URL}/${id}`);

export const fetchDeduccionesHistorial = (params: HistorialParams) =>
  getJSON<DeduccionHistorialResponse>(DEDUCCIONES_RAIZ, params);

export const fetchDeduccionesHistorialExport = (params: Omit<HistorialParams, "page" | "size">) =>
  getJSON<DeduccionHistorialItem[]>(`${DEDUCCIONES_URL}/export`, params);

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
  postJSON<DeduccionRead[]>(DEDUCCIONES_RAIZ, payload);

export const pagarEnCaja = (id: number) =>
  postJSON<DeduccionHistorialItem>(`${DEDUCCIONES_URL}/${id}/pagar`, {});

export const fetchDescuentos = async (): Promise<DescuentoOption[]> => {
  const raw = await getJSON<any[]>("/api/conceptos");
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
  // El servidor ya los trae de la A a la Z y, al buscar, con lo que coincide completo primero (ver /api/medicos/selector).
  const params: Record<string, unknown> = { limit: 50 };
  const q = query.trim();
  if (q) params.q = q;

  const raw = await getJSON<any[]>("/api/medicos/selector", params);
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

/** Lo que el pago abierto va a descontar: cantidad, total y detalle por concepto (misma cuenta que la tira del pago). */
export const fetchResumenPagoAbierto = async (pagoId: number): Promise<ResumenPagoAbierto> => {
  const vp = await getJSON<any>(`/api/pagos/${pagoId}/vista_previa`);
  const items = (vp?.deducciones?.items ?? []) as Array<{ descuento_nombre: string; cantidad_socios: number; total_monto: number | string }>;
  return {
    cantidad: items.reduce((acc, i) => acc + Number(i.cantidad_socios ?? 0), 0),
    total: Number(vp?.deducciones?.totales?.total_monto ?? 0),
    conceptos: items
      .map((i) => ({ nombre: i.descuento_nombre || "Sin concepto", cantidad: Number(i.cantidad_socios ?? 0), monto: Number(i.total_monto ?? 0) }))
      .sort((a, b) => b.monto - a.monto),
  };
};
