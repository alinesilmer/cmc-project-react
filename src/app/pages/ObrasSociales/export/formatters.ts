import type { ObraSocialListItem, CondicionIVA } from "../obrasSociales.types";
// Fechas de calendario: `new Date("2025-05-30")` se parsea como UTC y el export
// salía con el día anterior. Ver src/app/lib/fechas.ts.
export { formatFecha } from "../../../lib/fechas";

export const FACTURA_LABELS: Record<CondicionIVA, string> = {
  responsable_inscripto: "Factura A",
  exento: "Factura B",
};

export function formatPlazo(days?: number | null): string {
  if (days == null) return "—";
  return `${days} días`;
}

export function formatMarca(marca?: string | null): string {
  return marca === "S" ? "Sí" : marca === "N" ? "No" : "—";
}

export function formatEmails(item: ObraSocialListItem): string {
  return item.emails.map((e) => e.valor).filter(Boolean).join(", ") || "—";
}

export function formatTelefonos(item: ObraSocialListItem): string {
  return item.telefonos.map((t) => t.valor).filter(Boolean).join(", ") || "—";
}

export function formatFactura(condicion?: string | null): string {
  if (condicion === "responsable_inscripto") return "Factura A";
  if (condicion === "exento") return "Factura B";
  return "—";
}
