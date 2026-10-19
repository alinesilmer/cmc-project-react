// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

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

export function axiosErrorMessage(e: any): string {
  const status = e?.response?.status;
  const statusText = e?.response?.statusText;
  if (status) return `Error ${status}${statusText ? ` ${statusText}` : ""}`;
  if (e?.code === "ERR_NETWORK") return "Error de red (CORS o backend inaccesible)";
  return "Error al consultar el backend";
}

/** Sin acentos y en minúscula, para que «prevencion» encuentre «Prevención». */
export const normalizar = (v: string): string =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

export const getErrorMessage = (e: any, fallback: string) => {
  const detail = e?.response?.data?.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (typeof detail?.message === "string" && detail.message.trim()) return detail.message;
  return e?.message ?? fallback;
};

export const formatMoney = (value: string | number | null | undefined): string =>
  Number(value ?? 0).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const monthLabel = (month: number | null, year: number | null): string => {
  if (!month || !year) return "—";
  return `${String(month).padStart(2, "0")}/${year}`;
};
