// Fechas "de calendario" (sin hora): `YYYY-MM-DD`.

/** `YYYY-MM-DD` — un string de fecha de calendario. */
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `Date` en la **medianoche local** del día indicado. */
export function parseFechaLocal(iso: string): Date | null {
  const m = SOLO_FECHA.exec(iso.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** Fecha de calendario en `DD/MM/AAAA`. */
export function formatFecha(iso?: string | null): string {
  if (!iso) return "—";
  const m = SOLO_FECHA.exec(iso.trim());
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  // Con hora: es un instante, la conversión a local es correcta.
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString("es-AR");
}

/** Fecha de calendario en formato largo: `30 de mayo de 2025`. */
export function formatFechaLarga(iso?: string | null): string {
  if (!iso) return "—";
  const d = parseFechaLocal(iso);
  return d ? d.toLocaleDateString("es-AR", { dateStyle: "long" }) : iso;
}

/** Hoy en `YYYY-MM-DD`, según el **calendario local**. */
export function hoyISO(): string {
  return fechaAISO(new Date());
}

/** Un `Date` a `YYYY-MM-DD` tomando sus componentes locales, sin pasar por UTC. */
export function fechaAISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Zona horaria de Corrientes Capital (en la base tz, Corrientes pertenece a esta zona). */
const ZONA_CORRIENTES = "America/Argentina/Cordoba";

/** «Buenos días», «Buenas tardes» o «Buenas noches» según la hora de Corrientes, no la del dispositivo. */
export function saludoSegunHora(ahora: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("es-AR", { hour: "numeric", hourCycle: "h23", timeZone: ZONA_CORRIENTES }).format(ahora)
  );
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 20) return "Buenas tardes";
  return "Buenas noches";
}
