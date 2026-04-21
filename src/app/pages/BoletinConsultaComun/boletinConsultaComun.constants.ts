import logo from "../../assets/logoCMC.png";

export const CONSULTA_COMUN_CODE = "420351";
export const PAGE_SIZE = 500;
export const MAX_API_PAGES = 50;

export const CMC_NAME = "Colegio Médico de Corrientes";
export const CMC_PHONE = String(
  (import.meta as any).env?.VITE_CMC_PHONE ?? "(0379) 425 2323"
);
export const CMC_EMAIL = String(
  (import.meta as any).env?.VITE_CMC_EMAIL ??
    "auditoriacolegiomedico23@gmail.com"
);
export const CMC_SUBTITLE = "Sujeto a cambios por actualizaciones permanentes";
export const CMC_LOGO_SRC =
  String((import.meta as any).env?.VITE_CMC_LOGO_URL || "") || logo;

export const OBSERVATIONS_BY_OS: Readonly<Record<number, readonly string[]>> =
  Object.freeze({
    // 75: ["Solo aplica bajo autorización previa."],
    // 292: ["Importe sujeto a última actualización del convenio."],
  });

export const moneyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const shortDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
});

export const longDateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "full",
  timeStyle: "short",
});

const API_BASE_RAW =
  (import.meta as any).env?.VITE_API_BASE_URL ??
  (import.meta as any).env?.VITE_API_URL ??
  (import.meta as any).env?.VITE_BACKEND_URL ??
  "";

function stripTrailingSlash(value: string): string {
  return String(value || "").trim().replace(/\/+$/, "");
}

const API_BASE = stripTrailingSlash(String(API_BASE_RAW || ""));

const API_ROOT = API_BASE
  ? API_BASE.endsWith("/api")
    ? API_BASE
    : `${API_BASE}/api`
  : "/api";

export const BOLETIN_ENDPOINTS = [`${API_ROOT}/valores/boletin`];