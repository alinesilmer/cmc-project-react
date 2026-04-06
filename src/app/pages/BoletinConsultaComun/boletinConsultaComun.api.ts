import axios from "axios";

import {
  BOLETIN_ENDPOINTS,
  CONSULTA_COMUN_CODE,
  MAX_API_PAGES,
  OBSERVATIONS_BY_OS,
  PAGE_SIZE,
} from "./boletinConsultaComun.constants";
import {
  normalizeText,
  safeNum,
  parseFecha,
} from "./boletinConsultaComun.helpers";
import type {
  ApiBoletinRow,
  ConsultaComunItem,
} from "./boletinConsultaComun.types";

export function normalizeRow(input: unknown): ApiBoletinRow {
  const row = (input ?? {}) as Record<string, unknown>;

  return {
    id: Number(row.id ?? row.ID ?? row.pk ?? 0),
    codigos: String(
      row.codigos ??
        row.codigo ??
        row.cod_nom ??
        row.cod_nomenclador ??
        CONSULTA_COMUN_CODE
    ),
    nro_obrasocial: Number(
      row.nro_obrasocial ??
        row.nro_obra_social ??
        row.nroOS ??
        row.obra_social_numero ??
        0
    ),
    obra_social:
      row.obra_social != null
        ? String(row.obra_social)
        : row.nombre_obra_social != null
        ? String(row.nombre_obra_social)
        : row.obraSocial != null
        ? String(row.obraSocial)
        : row.nombre != null
        ? String(row.nombre)
        : null,
    honorarios_a: safeNum(
      row.honorarios_a ?? row.honorariosA ?? row.valor ?? row.importe ?? 0
    ),
    honorarios_b: safeNum(row.honorarios_b ?? row.honorariosB ?? 0),
    honorarios_c: safeNum(row.honorarios_c ?? row.honorariosC ?? 0),
    gastos: safeNum(row.gastos ?? 0),
    ayudante_a: safeNum(row.ayudante_a ?? row.ayudanteA ?? 0),
    ayudante_b: safeNum(row.ayudante_b ?? row.ayudanteB ?? 0),
    ayudante_c: safeNum(row.ayudante_c ?? row.ayudanteC ?? 0),
    c_p_h_s: String(row.c_p_h_s ?? row.tipo ?? ""),
    fecha_cambio:
      row.fecha_cambio != null
        ? String(row.fecha_cambio)
        : row.fechaCambio != null
        ? String(row.fechaCambio)
        : row.updated_at != null
        ? String(row.updated_at)
        : row.updatedAt != null
        ? String(row.updatedAt)
        : row.fecha != null
        ? String(row.fecha)
        : null,
  };
}

export function extractRowsFromPayload(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.results)) return obj.results;
  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.rows)) return obj.rows;

  if (obj.data && typeof obj.data === "object") {
    const dataObj = obj.data as Record<string, unknown>;
    if (Array.isArray(dataObj.results)) return dataObj.results;
    if (Array.isArray(dataObj.items)) return dataObj.items;
    if (Array.isArray(dataObj.rows)) return dataObj.rows;
  }

  return null;
}

export function extractCodes(value: unknown): string[] {
  return String(value ?? "").match(/\d{4,6}/g) ?? [];
}

export function filterRowsByCodigo(
  rows: ApiBoletinRow[],
  codigo: string
): ApiBoletinRow[] {
  const target = String(codigo).trim();
  if (!target) return rows;

  const matched = rows.filter((row) => {
    const codes = [
      ...extractCodes(row.codigos),
      ...extractCodes(row.c_p_h_s),
    ];
    return codes.includes(target);
  });

  return matched.length > 0 ? matched : rows;
}

function isMoreRecentRow(candidate: ApiBoletinRow, current: ApiBoletinRow): boolean {
  const candidateDate = parseFecha(candidate.fecha_cambio);
  const currentDate = parseFecha(current.fecha_cambio);

  // Prefer the row with the newest FECHA_CAMBIO
  if (candidateDate != null && currentDate != null) {
    if (candidateDate !== currentDate) {
      return candidateDate > currentDate;
    }
  } else if (candidateDate != null && currentDate == null) {
    return true;
  } else if (candidateDate == null && currentDate != null) {
    return false;
  }

  // Fallback: if same date or no date, prefer the الأكبر/newer id
  return candidate.id > current.id;
}

export function buildLatestPerOS(rows: ApiBoletinRow[]): ConsultaComunItem[] {
  const latestByOS = new Map<number, ApiBoletinRow>();

  for (const row of rows) {
    if (!row.nro_obrasocial) continue;

    const current = latestByOS.get(row.nro_obrasocial);

    if (!current || isMoreRecentRow(row, current)) {
      latestByOS.set(row.nro_obrasocial, row);
    }
  }

  return Array.from(latestByOS.entries())
    .map(([nro, row]) => ({
      nro,
      nombre: normalizeText(row.obra_social ?? `OS ${nro}`),
      valor: row.honorarios_a,
      fechaCambio: row.fecha_cambio,
      observaciones: [...(OBSERVATIONS_BY_OS[nro] ?? [])].map((x) =>
        normalizeText(x, 400)
      ),
    }))
    .sort((a, b) => {
      const byName = a.nombre.localeCompare(b.nombre, "es", {
        sensitivity: "base",
      });
      if (byName !== 0) return byName;
      return a.nro - b.nro;
    });
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_CANCELED") {
      return "La consulta fue cancelada.";
    }

    if (error.code === "ECONNABORTED") {
      return "La consulta tardó demasiado tiempo. Intente nuevamente.";
    }

    const status = error.response?.status;
    if (status === 400) return "Solicitud inválida al backend.";
    if (status === 401 || status === 403) {
      return "No tiene permisos para consultar este recurso.";
    }
    if (status === 404) return "No se encontró el endpoint solicitado.";
    if (status && status >= 500) {
      return "El backend devolvió un error interno.";
    }

    return error.message || "No se pudo obtener la información desde el backend.";
  }

  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}

export async function fetchBoletinPage(
  endpoint: string,
  page: number,
  signal?: AbortSignal
): Promise<ApiBoletinRow[]> {
  const response = await axios.get(endpoint, {
    signal,
    timeout: 20000,
    withCredentials: false,
    headers: {
      Accept: "application/json",
    },
    params: {
      codigo: CONSULTA_COMUN_CODE,
      page,
      size: PAGE_SIZE,
    },
  });

  const rows = extractRowsFromPayload(response.data);

  if (!rows) {
    throw new Error("La respuesta del backend no tiene un formato válido.");
  }

  return rows.map(normalizeRow);
}

export async function requestBoletinPage(
  page: number,
  signal?: AbortSignal
): Promise<ApiBoletinRow[]> {
  let lastError: unknown = null;

  for (const endpoint of BOLETIN_ENDPOINTS) {
    try {
      return await fetchBoletinPage(endpoint, page, signal);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No se pudo consultar el endpoint de valores.");
}

export async function fetchConsultaComun(
  signal?: AbortSignal
): Promise<ConsultaComunItem[]> {
  const rows: ApiBoletinRow[] = [];
  let previousSignature = "";

  for (let page = 1; page <= MAX_API_PAGES; page += 1) {
    const pageRows = await requestBoletinPage(page, signal);

    if (pageRows.length === 0) {
      break;
    }

    const signature = `${pageRows.length}-${pageRows[0]?.id ?? "x"}-${
      pageRows[pageRows.length - 1]?.id ?? "y"
    }`;

    if (signature === previousSignature) {
      break;
    }

    previousSignature = signature;
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) {
      break;
    }
  }

  const filteredRows = filterRowsByCodigo(rows, CONSULTA_COMUN_CODE);
  return buildLatestPerOS(filteredRows);
}