import type { ObraSocialListItem } from "../obrasSociales.types";
// Fechas de calendario: `new Date("2025-05-30")` se parsea como UTC y el export salía con el día anterior.
export { formatFecha } from "@/app/shared/lib/fechas";

export function formatPlazo(days?: number | null): string {
  if (days == null) return "—";
  return `${days} días`;
}

export function formatActivo(activo?: boolean | null): string {
  return activo === true ? "Sí" : activo === false ? "No" : "—";
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
