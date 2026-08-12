import { getJSON } from "../../lib/http";

// Control de calidad del padrón. Es SOLO LECTURA: el backend señala legajos con
// problemas y nadie corrige nada automáticamente (ver `auditoria.py`).

export type Severidad = "alta" | "media" | "baja" | "info";

export interface ChequeoPadron {
  id: string;
  titulo: string;
  descripcion: string;
  severidad: Severidad;
  casos: number;
}

export interface ResumenAuditoria {
  total: number;
  chequeos: ChequeoPadron[];
}

export interface LegajoObservado {
  id: number;
  nro_socio: number | null;
  nombre: string | null;
  documento: number | null;
  matricula_prov: number | null;
  fecha_nac: string | null;
  email: string | null;
  activo: boolean;
}

const BASE = "/api/medicos/auditoria";

export const getAuditoriaResumen = (): Promise<ResumenAuditoria> =>
  getJSON<ResumenAuditoria>(`${BASE}/resumen`);

export const getAuditoriaDetalle = (
  chequeoId: string,
  limit = 50
): Promise<LegajoObservado[]> =>
  getJSON<LegajoObservado[]>(`${BASE}/${encodeURIComponent(chequeoId)}`, { limit });

// ─── Presentación ─────────────────────────────────────────────────────────────

export const SEVERIDAD_LABEL: Record<Severidad, string> = {
  alta: "Requiere atención",
  media: "Datos incompletos",
  baja: "Formato dudoso",
  info: "Para revisar",
};

/** Orden en el que se muestran los grupos: primero lo que más importa. */
export const ORDEN_SEVERIDAD: Severidad[] = ["alta", "media", "baja", "info"];
