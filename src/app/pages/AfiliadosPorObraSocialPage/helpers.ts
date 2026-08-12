import type { ObraSocial, Prestador } from "./types";

/**
 * INT32 max (2^31 − 1 = 2 147 483 647).
 * Some backends / ORMs store this as a NOT NULL default when the real
 * DB value is NULL (e.g. a SMALLINT/INT phone column with no value).
 * We treat it as "empty".

 */
const INT32_MAX = 2_147_483_647;

export function fmtDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

/**
 * Sanitises a phone field.
 * Rejects INT32_MAX sentinel values that backends use for NULL phone numbers.
 * Always returns a string so the value is safe to render or export.
 */
export function sanitizePhone(v: unknown): string {
  const s = safeStr(v).trim();
  if (!s) return "";
  // 2 147 483 647 = INT32_MAX — treat as missing
  if (s === String(INT32_MAX) || Number(s) === INT32_MAX) return "";
  return s;
}

export function buildOsCode(
  os: Pick<ObraSocial, "CODIGO" | "NRO_OBRA_SOCIAL">
): string {
  return os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
}

export function pickNombre(p: Prestador): string {
  return safeStr(p.apellido_nombre ?? p.ape_nom ?? p.nombre ?? "");
}

export function pickNroPrestador(p: Prestador): string {
  return safeStr(p.nro_socio ?? p.socio ?? "");
}

export function pickMatriculaProv(p: Prestador): string {
  return safeStr(p.matricula_prov ?? "");
}

export function pickTelefonoConsulta(p: Prestador): string {
  return sanitizePhone(p.telefono_consulta);
}

export function pickDomicilioConsulta(p: Prestador): string {
  return safeStr(p.domicilio_consulta ?? "");
}

export function pickMailParticular(p: Prestador): string {
  return safeStr(p.mail_particular ?? "");
}

export function pickCuit(p: Prestador): string {
  return safeStr(p.cuit ?? "");
}

export function pickCodigoPostal(p: Prestador): string {
  return safeStr(p.codigo_postal ?? "");
}

/** Prestador inactivo en el padrón de esa obra social (MARCA = "N").
 *
 *  Es distinto de la baja del Colegio (`listado_medico.EXISTE`): un médico
 *  puede seguir siendo socio y estar de baja en una obra social puntual. Este
 *  es el estado que define si figura en ese padrón. */
export function esInactivoEnPadron(p: { marca?: string | null }): boolean {
  return safeStr(p.marca).trim().toUpperCase() === "N";
}

/** ISO (YYYY-MM-DD) → DD/MM/AAAA, sin construir un Date.
 *
 *  Nada de `new Date(iso)`: sobre una fecha sin hora el navegador asume UTC y
 *  al formatearla en horario argentino resta un día. La base además guarda
 *  `0000-00-00` en los registros sin cargar. */
export function fmtFechaCorta(v: unknown): string {
  const s = safeStr(v).slice(0, 10);
  if (!s || s.startsWith("0000")) return "";
  const [y, m, d] = s.split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

/** Años cumplidos desde una fecha ISO, o `null` si no hay fecha usable. */
export function aniosDesde(v: unknown): number | null {
  const s = safeStr(v).slice(0, 10);
  if (!s || s.startsWith("0000")) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const hoy = new Date();
  let anios = hoy.getFullYear() - y;
  // Descuenta el año en curso si todavía no llegó el aniversario.
  const mesActual = hoy.getMonth() + 1;
  if (mesActual < m || (mesActual === m && hoy.getDate() < d)) anios -= 1;
  return anios >= 0 && anios < 130 ? anios : null;
}

export function coerceToStringArray(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return (v as unknown[]).map((x) => safeStr(x));
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (/[;,|]/.test(s)) return s.split(/[;,|]/g).map((x) => x.trim());
    return [s];
  }
  return [];
}

export function cleanEspecialidades(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of arr) {
    const t = safeStr(raw).trim();
    if (!t || t === "0") continue;
    const key = normalize(t);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function stripMedicoWhenMultiple(list: string[]): string[] {
  if (list.length <= 1) return list;
  const filtered = list.filter((x) => normalize(x) !== "medico");
  return filtered.length ? filtered : list;
}

export function pickEspecialidadesList(p: Prestador): string[] {
  const list = Array.isArray(p.especialidades) ? p.especialidades : [];
  const cleaned = cleanEspecialidades(list);
  if (cleaned.length) return stripMedicoWhenMultiple(cleaned);
  const single = safeStr(p.especialidad).trim();
  const singleClean = single ? cleanEspecialidades([single]) : [];
  return stripMedicoWhenMultiple(singleClean);
}

export function pickEspecialidadesAll(p: Prestador): string {
  return pickEspecialidadesList(p).join(", ");
}

export function pickEspecialidad(p: Prestador): string {
  return pickEspecialidadesList(p).slice(0, 3).join(", ");
}

