import axios from "axios";

import {
  BOLETIN_ENDPOINTS,
  CONSULTA_COMUN_CODE,
  EXCLUDED_OS,
  MAX_API_PAGES,
  OBSERVATIONS_BY_OS,
  PAGE_SIZE,
} from "./boletinConsultaComun.constants";
import {
  normalizeText,
  parseFecha,
  safeNum,
} from "./boletinConsultaComun.helpers";
import type {
  ApiBoletinRow,
  ConsultaComunItem,
} from "./boletinConsultaComun.types";

function pickFirst<T = unknown>(
  obj: Record<string, unknown>,
  keys: string[],
  fallback?: T
): T | undefined {
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return fallback;
}

export function normalizeRow(input: unknown): ApiBoletinRow {
  const row = (input ?? {}) as Record<string, unknown>;

  const fechaCambioRaw = pickFirst(row, [
    "fecha_cambio",
    "FECHA_CAMBIO",
    "fechaCambio",
    "updated_at",
    "UPDATED_AT",
    "updatedAt",
    "fecha",
    "FECHA",
  ]);

  return {
    id: Number(
      pickFirst(row, ["id", "ID", "pk", "Pk", "PK"], 0)
    ),

    codigos: String(
      pickFirst(row, [
        "codigos",
        "CODIGOS",
        "codigo",
        "CODIGO",
        "cod_nom",
        "COD_NOM",
        "cod_nomenclador",
        "COD_NOMENCLADOR",
      ], CONSULTA_COMUN_CODE)
    ).trim(),

    nro_obrasocial: Number(
      pickFirst(row, [
        "nro_obrasocial",
        "NRO_OBRASOCIAL",
        "nro_obra_social",
        "NRO_OBRA_SOCIAL",
        "nroOS",
        "obra_social_numero",
        "OBRA_SOCIAL_NUMERO",
      ], 0)
    ),

    obra_social:
      pickFirst<string | null>(row, [
        "obra_social",
        "OBRA_SOCIAL",
        "nombre_obra_social",
        "NOMBRE_OBRA_SOCIAL",
        "obraSocial",
        "nombre",
        "NOMBRE",
      ], null) != null
        ? String(
            pickFirst(row, [
              "obra_social",
              "OBRA_SOCIAL",
              "nombre_obra_social",
              "NOMBRE_OBRA_SOCIAL",
              "obraSocial",
              "nombre",
              "NOMBRE",
            ])
          )
        : null,

    honorarios_a: safeNum(
      pickFirst(row, [
        "honorarios_a",
        "HONORARIOS_A",
        "honorariosA",
        "valor",
        "VALOR",
        "importe",
        "IMPORTE",
      ], 0)
    ),

    honorarios_b: safeNum(
      pickFirst(row, [
        "honorarios_b",
        "HONORARIOS_B",
        "honorariosB",
      ], 0)
    ),

    honorarios_c: safeNum(
      pickFirst(row, [
        "honorarios_c",
        "HONORARIOS_C",
        "honorariosC",
      ], 0)
    ),

    gastos: safeNum(
      pickFirst(row, ["gastos", "GASTOS"], 0)
    ),

    ayudante_a: safeNum(
      pickFirst(row, [
        "ayudante_a",
        "AYUDANTE_A",
        "ayudanteA",
      ], 0)
    ),

    ayudante_b: safeNum(
      pickFirst(row, [
        "ayudante_b",
        "AYUDANTE_B",
        "ayudanteB",
      ], 0)
    ),

    ayudante_c: safeNum(
      pickFirst(row, [
        "ayudante_c",
        "AYUDANTE_C",
        "ayudanteC",
      ], 0)
    ),

    c_p_h_s: String(
      pickFirst(row, [
        "c_p_h_s",
        "C_P_H_S",
        "tipo",
        "TIPO",
      ], "")
    ).trim(),

    fecha_cambio:
      fechaCambioRaw != null && String(fechaCambioRaw).trim() !== ""
        ? String(fechaCambioRaw).trim()
        : null,

  };
}

export function extractRowsFromPayload(payload: unknown): unknown[] | null {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.results)) return obj.results;
  if (Array.isArray(obj.RESULTS)) return obj.RESULTS;

  if (Array.isArray(obj.items)) return obj.items;
  if (Array.isArray(obj.ITEMS)) return obj.ITEMS;

  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.DATA)) return obj.DATA;

  if (Array.isArray(obj.rows)) return obj.rows;
  if (Array.isArray(obj.ROWS)) return obj.ROWS;

  if (obj.data && typeof obj.data === "object") {
    const dataObj = obj.data as Record<string, unknown>;
    if (Array.isArray(dataObj.results)) return dataObj.results;
    if (Array.isArray(dataObj.RESULTS)) return dataObj.RESULTS;
    if (Array.isArray(dataObj.items)) return dataObj.items;
    if (Array.isArray(dataObj.ITEMS)) return dataObj.ITEMS;
    if (Array.isArray(dataObj.rows)) return dataObj.rows;
    if (Array.isArray(dataObj.ROWS)) return dataObj.ROWS;
  }

  if (obj.DATA && typeof obj.DATA === "object") {
    const dataObj = obj.DATA as Record<string, unknown>;
    if (Array.isArray(dataObj.results)) return dataObj.results;
    if (Array.isArray(dataObj.RESULTS)) return dataObj.RESULTS;
    if (Array.isArray(dataObj.items)) return dataObj.items;
    if (Array.isArray(dataObj.ITEMS)) return dataObj.ITEMS;
    if (Array.isArray(dataObj.rows)) return dataObj.rows;
    if (Array.isArray(dataObj.ROWS)) return dataObj.ROWS;
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

function compareRowsByRecency(a: ApiBoletinRow, b: ApiBoletinRow): number {
  const aDate = parseFecha(a.fecha_cambio);
  const bDate = parseFecha(b.fecha_cambio);

  if (aDate != null && bDate != null) {
    if (aDate !== bDate) return aDate - bDate;
  } else if (aDate != null && bDate == null) {
    return 1;
  } else if (aDate == null && bDate != null) {
    return -1;
  }

  return a.id - b.id;
}

export function buildLatestPerOS(rows: ApiBoletinRow[]): ConsultaComunItem[] {
  const latestByOS = new Map<number, ApiBoletinRow>();

  for (const row of rows) {
    if (!row.nro_obrasocial || EXCLUDED_OS.has(row.nro_obrasocial)) continue;

    const current = latestByOS.get(row.nro_obrasocial);

    if (!current) {
      latestByOS.set(row.nro_obrasocial, row);
      continue;
    }

    if (compareRowsByRecency(row, current) > 0) {
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
        normalizeText(x, 1000)
      ),
      galeno: {
        quirurgico: 0,
        practica: 0,
        radiologico: 0,
        cirugiaAdultos: 0,
        cirugiaInfantil: 0,
      },
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

    if (pageRows.length === 0) break;

    const signature = `${pageRows.length}-${pageRows[0]?.id ?? "x"}-${
      pageRows[pageRows.length - 1]?.id ?? "y"
    }`;

    if (signature === previousSignature) break;

    previousSignature = signature;
    rows.push(...pageRows);

    if (pageRows.length < PAGE_SIZE) break;
  }

  const filteredRows = filterRowsByCodigo(rows, CONSULTA_COMUN_CODE);
  return buildLatestPerOS(filteredRows);
}