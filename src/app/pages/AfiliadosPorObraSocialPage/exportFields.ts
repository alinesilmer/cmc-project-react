import type { ExportRow, FieldGroup, ExportField } from "./types";
import {
  safeStr, sanitizePhone, fmtFechaCorta, aniosDesde,
  pickNroPrestador, pickNombre, pickMatriculaProv,
  pickTelefonoConsulta, pickEspecialidad, pickEspecialidadesAll,
  pickDomicilioConsulta, pickMailParticular, pickCuit, pickCodigoPostal,
} from "./helpers";

/**
 * Catálogo único de columnas exportables.
 *
 * Todo lo que sabe el PDF, el Excel y el selector de campos sale de acá: la
 * etiqueta, de dónde se lee el dato, cuánto ancho ocupa y si es información
 * personal. Agregar una columna es agregar una entrada; no hay que tocar los
 * generadores.
 *
 * `source` decide el costo de la columna:
 *
 *  · `padron`  — ya viene en la respuesta del padrón. Gratis.
 *  · `medico`  — hay que traer la ficha completa (`GET /api/medicos/all`, un
 *                pedido para todo el padrón). Sólo se pide si el usuario
 *                eligió al menos una de estas columnas.
 *
 * `sensible` no bloquea nada —quien entra acá ya ve estos datos abriendo la
 * ficha del médico— pero el selector los agrupa y advierte aparte, para que
 * mandar el DNI de 500 profesionales a una obra social sea una decisión
 * tomada y no un descuido.
 */

export const GRUPOS: { id: FieldGroup; label: string }[] = [
  { id: "identificacion", label: "Identificación" },
  { id: "profesional", label: "Datos profesionales" },
  { id: "consultorio", label: "Consultorio" },
  { id: "fiscal", label: "Fiscales" },
  { id: "personal", label: "Datos personales" },
];

/** Lee un campo de la ficha completa del médico (sólo si fue traída). */
const x = (clave: string) => (r: ExportRow): string => safeStr(r.extra?.[clave]).trim();

export const CAMPOS: ExportField[] = [
  // ── Identificación ────────────────────────────────────────────────────────
  { key: "nro", label: "N° Socio", short: "N° Socio", group: "identificacion",
    source: "padron", weight: 7, align: "center", get: pickNroPrestador },
  { key: "nom", label: "Prestador", short: "Prestador", group: "identificacion",
    source: "padron", weight: 26, align: "left", get: pickNombre },
  { key: "titulo", label: "Título", short: "Título", group: "identificacion",
    source: "medico", weight: 18, align: "left", get: x("titulo") },

  // ── Profesionales ─────────────────────────────────────────────────────────
  { key: "mat", label: "Matrícula provincial", short: "Mat. Prov", group: "profesional",
    source: "padron", weight: 9, align: "center", get: pickMatriculaProv },
  { key: "matnac", label: "Matrícula nacional", short: "Mat. Nac", group: "profesional",
    source: "padron", weight: 9, align: "center",
    get: (r) => safeStr(r.matricula_nac).trim() },
  { key: "esp", label: "Especialidades", short: "Especialidades", group: "profesional",
    source: "padron", weight: 22, align: "left", get: pickEspecialidad },
  { key: "espall", label: "Especialidades (todas)", short: "Especialidades", group: "profesional",
    source: "padron", weight: 28, align: "left", get: pickEspecialidadesAll },
  { key: "cat", label: "Categoría", short: "Cat.", group: "profesional",
    source: "padron", weight: 6, align: "center",
    get: (r) => safeStr(r.categoria).trim() },
  { key: "ingreso", label: "Fecha de ingreso", short: "Ingreso", group: "profesional",
    source: "medico", weight: 10, align: "center",
    get: (r) => fmtFechaCorta(r.extra?.fecha_ingreso) },
  { key: "antig", label: "Antigüedad (años)", short: "Antig.", group: "profesional",
    source: "medico", weight: 7, align: "center",
    get: (r) => {
      const a = aniosDesde(r.extra?.fecha_ingreso);
      return a === null ? "" : String(a);
    } },
  { key: "matfecha", label: "Fecha de matrícula", short: "Matriculado", group: "profesional",
    source: "medico", weight: 10, align: "center",
    get: (r) => fmtFechaCorta(r.extra?.fecha_matricula) },
  // No hay columna "Estado en el padrón": la pantalla ya excluye a los dados de
  // baja, así que sólo podría decir "Activo" en todas las filas.

  // ── Consultorio ───────────────────────────────────────────────────────────
  { key: "tel", label: "Teléfono consultorio", short: "Teléfono", group: "consultorio",
    source: "padron", weight: 11, align: "center", get: pickTelefonoConsulta },
  { key: "dom", label: "Dirección consultorio", short: "Dirección consultorio", group: "consultorio",
    source: "padron", weight: 34, align: "left", get: pickDomicilioConsulta },
  { key: "localidad", label: "Localidad", short: "Localidad", group: "consultorio",
    source: "medico", weight: 14, align: "left", get: x("localidad") },
  { key: "provincia", label: "Provincia", short: "Provincia", group: "consultorio",
    source: "medico", weight: 12, align: "left", get: x("provincia") },
  { key: "cp", label: "Código postal", short: "CP", group: "consultorio",
    source: "padron", weight: 6, align: "center", get: pickCodigoPostal },
  { key: "mail", label: "Correo electrónico", short: "Correo electrónico", group: "consultorio",
    source: "padron", weight: 22, align: "left", get: pickMailParticular },

  // ── Fiscales ──────────────────────────────────────────────────────────────
  { key: "cuit", label: "CUIT", short: "CUIT", group: "fiscal",
    source: "padron", weight: 12, align: "center", get: pickCuit },
  { key: "cond", label: "Condición impositiva", short: "Cond. imp.", group: "fiscal",
    source: "medico", weight: 15, align: "left", get: x("condicion_impositiva") },
  { key: "mono", label: "Monotributista", short: "Monotrib.", group: "fiscal",
    source: "medico", weight: 8, align: "center", get: x("monotributista") },
  { key: "factura", label: "Factura", short: "Factura", group: "fiscal",
    source: "medico", weight: 7, align: "center", get: x("factura") },

  // ── Personales ────────────────────────────────────────────────────────────
  { key: "doc", label: "Documento", short: "Documento", group: "personal",
    source: "medico", weight: 11, align: "center", sensible: true,
    get: (r) => {
      const n = safeStr(r.extra?.documento).trim();
      if (!n || n === "0") return "";
      const tipo = safeStr(r.extra?.tipo_doc).trim();
      return tipo ? `${tipo} ${n}` : n;
    } },
  { key: "nac", label: "Fecha de nacimiento", short: "Nacimiento", group: "personal",
    source: "medico", weight: 10, align: "center", sensible: true,
    get: (r) => fmtFechaCorta(r.extra?.fecha_nac) },
  { key: "sexo", label: "Sexo", short: "Sexo", group: "personal",
    source: "medico", weight: 5, align: "center", sensible: true, get: x("sexo") },
  { key: "telpart", label: "Teléfono particular", short: "Tel. part.", group: "personal",
    source: "medico", weight: 11, align: "center", sensible: true,
    get: (r) => sanitizePhone(r.extra?.tele_particular) },
  { key: "cel", label: "Celular", short: "Celular", group: "personal",
    source: "medico", weight: 11, align: "center", sensible: true,
    get: (r) => sanitizePhone(r.extra?.celular_particular) },
  { key: "dompart", label: "Domicilio particular", short: "Dom. particular", group: "personal",
    source: "medico", weight: 30, align: "left", sensible: true,
    get: x("domicilio_particular") },
];

export const CAMPOS_POR_KEY = new Map(CAMPOS.map((c) => [c.key, c]));

/** Lo que se exporta si el usuario nunca tocó el selector: el padrón clásico. */
export const CAMPOS_POR_DEFECTO = ["nro", "nom", "mat", "tel", "esp", "dom"];


/** `true` si alguna columna elegida obliga a traer la ficha completa. */
export function requiereFichaMedico(keys: Iterable<string>): boolean {
  for (const k of keys) {
    if (CAMPOS_POR_KEY.get(k)?.source === "medico") return true;
  }
  return false;
}

/** Columnas elegidas, siempre en el orden del catálogo (no en el de clickeo). */
export function camposSeleccionados(keys: Set<string>): ExportField[] {
  return CAMPOS.filter((c) => keys.has(c.key));
}

export function contarSensibles(keys: Set<string>): number {
  return camposSeleccionados(keys).filter((c) => c.sensible).length;
}
