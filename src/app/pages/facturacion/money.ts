import type { Money } from "./types";

export const parseMoney = (v: Money | number | null | undefined): number =>
  v == null ? 0 : typeof v === "number" ? v : Number(v);

export const formatMoney = (v: Money | number | null | undefined): string =>
  parseMoney(v).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
