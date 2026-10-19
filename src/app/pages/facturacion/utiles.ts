// Lo que comparten las pantallas de esta carpeta: una sola copia de cada cosa.

export const viaLabel = (v: string | null | undefined): string =>
  v === "L" ? "Laparoscópica" : v === "T" ? "Tradicional" : "";

export const estadoLabel = (estado: string | null): string => {
  switch (estado) {
    case "A": return "Abierta";
    case "C": return "Cerrada";
    default:  return estado || "—";
  }
};

export const fmtFecha = (iso: string | null): string => {
  if (!iso) return "—";
  // `new Date("2026-11-01")` parsea las date-only como medianoche UTC, y al mostrarlas en hora local (AR = UTC-3) retroceden un día.
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (soloFecha) return `${soloFecha[3]}/${soloFecha[2]}/${soloFecha[1]}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
};
