import type { ObraSocialListItem, CondicionIVA } from "../obrasSociales.types";

export const FACTURA_LABELS: Record<CondicionIVA, string> = {
  responsable_inscripto: "Factura A",
  exento: "Factura B",
};

export function formatFecha(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-AR", { dateStyle: "short" });
  } catch {
    return iso;
  }
}

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
