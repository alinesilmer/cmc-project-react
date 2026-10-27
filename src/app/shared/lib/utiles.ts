// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

import { formatoPesos } from "./formatos";
import { comoErrorApi } from "./httpErrors";

export const aNumero = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/** "\02": el número de página con la barra de la portada. */
export const pagina = (n: number) => `\\${String(n).padStart(2, "0")}`;

/** Reemplaza cada carácter de control (0–31 y 127) por `por`. */
export function sinControl(texto: string, por: string): string {
  return Array.from(texto, (c) => {
    const n = c.charCodeAt(0);
    return n < 32 || n === 127 ? por : c;
  }).join("");
}

export function axiosErrorMessage(e: unknown): string {
  const { response, code } = comoErrorApi(e);
  const status = response?.status;
  const statusText = response?.statusText;
  if (status) return `Error ${status}${statusText ? ` ${statusText}` : ""}`;
  if (code === "ERR_NETWORK") return "Error de red (CORS o backend inaccesible)";
  return "Error al consultar el backend";
}

/** Sin acentos y en minúscula, para que «prevencion» encuentre «Prevención». */
export const normalizar = (v: string): string =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const getErrorMessage = (e: unknown, fallback: string) => {
  const err = comoErrorApi(e);
  const detail = err.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof detail === "object" && detail !== null && "message" in detail && typeof detail.message === "string" && detail.message.trim()) return detail.message;
  return err.message ?? fallback;
};

export const formatMoney = (value: string | number | null | undefined): string =>
  formatoPesos.format(Number(value ?? 0));

export const monthLabel = (month: number | null, year: number | null): string => {
  if (!month || !year) return "—";
  return `${String(month).padStart(2, "0")}/${year}`;
};
