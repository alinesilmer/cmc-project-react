// Fechas "de calendario" (sin hora): `YYYY-MM-DD`.
//
// ## El bug que resuelve este archivo
//
// `new Date("2025-05-30")` NO es el 30 de mayo a la medianoche local. El parser
// de ECMAScript trata un string de solo-fecha como **UTC**, así que devuelve el
// 30 a las 00:00 UTC — que en Argentina (UTC-3) es el **29 a las 21:00**. Al
// mostrarlo con `toLocaleDateString()` sale el día anterior:
//
//     new Date("2025-05-30").toLocaleDateString("es-AR")  // → "29/5/2025"  ✗
//
// El mismo error al revés aparece al guardar: `new Date().toISOString()` pasa la
// hora local a UTC, así que después de las 21:00 en Argentina el "hoy" que se
// manda al backend ya es el día siguiente.
//
//     // un 30 de mayo a las 22:00 en Corrientes
//     new Date().toISOString().slice(0, 10)               // → "2025-05-31"  ✗
//
// Ninguno de los dos casos falla ruidosamente: devuelven una fecha válida, pero
// equivocada por un día, y solo en algunas horas del día. Por eso está todo acá
// y no resuelto ad-hoc en cada pantalla.
//
// ## La regla
//
// Una fecha de calendario —alta de convenio, vigencia, fecha de nacimiento— no
// tiene zona horaria: el 30 de mayo es el 30 de mayo en todo el mundo. Se
// manipula como texto o con constructores locales, nunca convirtiéndola a UTC.
//
// Para **timestamps** (`created_at`, `emision_timestamp`, cualquier cosa con
// hora) esto no aplica: ahí `new Date(iso)` es correcto, porque el valor sí
// representa un instante y la conversión a hora local es lo que se busca.

/** `YYYY-MM-DD` — un string de fecha de calendario. */
const SOLO_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `Date` en la **medianoche local** del día indicado.
 *
 * Es el reemplazo de `new Date(iso)` para fechas de calendario. Un string con
 * hora (`2025-05-30T14:00:00Z`) se delega al parser nativo: ahí sí es un
 * instante y no hay nada que corregir.
 */
export function parseFechaLocal(iso: string): Date | null {
  const m = SOLO_FECHA.exec(iso.trim());
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Fecha de calendario en `DD/MM/AAAA`.
 *
 * No usa `toLocaleDateString()` sobre un `Date`: para el formato corto no hace
 * falta construir uno, y no construirlo es justamente lo que elimina el riesgo
 * de corrimiento. Si el valor no se entiende se devuelve tal cual vino, que es
 * más útil que un "Invalid Date".
 */
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

/**
 * Hoy en `YYYY-MM-DD`, según el **calendario local**.
 *
 * Reemplaza a `new Date().toISOString().slice(0, 10)`, que devuelve el día
 * siguiente cuando en Argentina ya pasaron las 21:00.
 */
export function hoyISO(): string {
  return fechaAISO(new Date());
}

/** Un `Date` a `YYYY-MM-DD` tomando sus componentes locales, sin pasar por UTC. */
export function fechaAISO(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}
