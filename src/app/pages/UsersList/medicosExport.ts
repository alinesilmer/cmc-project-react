// src/app/pages/UsersList/medicosExport.ts
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import type { FilterSelection, MissingFieldKey } from "../../types/filters";
import { getEspecialidadNameById } from "../../lib/especialidadesCatalog";

export type ExportColumn = { key: string; header: string };
export type ExportExcelArgs = {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  logoFile: File | null;
};

/* =========================
   Normalizers
========================= */
export function normalizeText(v: any): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function isEmptyValue(v: any): boolean {
  if (v === null || typeof v === "undefined") return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function pickFirst(row: any, keys: string[]) {
  for (const k of keys) {
    const v = row?.[k];
    if (!isEmptyValue(v)) return v;
  }
  return "";
}

/* =========================
   ✅ ESPECIALIDADES (DEFINITIVO)
   Backend /api/medicos devuelve IDs:
   nro_especialidad..nro_especialidad6
   => traducimos ID->NOMBRE con el catálogo
========================= */

const ESPEC_ID_KEYS = [
  "nro_especialidad",
  "nro_especialidad2",
  "nro_especialidad3",
  "nro_especialidad4",
  "nro_especialidad5",
  "nro_especialidad6",
  "NRO_ESPECIALIDAD",
  "NRO_ESPECIALIDAD2",
  "NRO_ESPECIALIDAD3",
  "NRO_ESPECIALIDAD4",
  "NRO_ESPECIALIDAD5",
  "NRO_ESPECIALIDAD6",
];

function coerceToStringArray(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => safeStr(x)).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (/[;,|]/.test(s)) return s.split(/[;,|]/g).map((x) => x.trim()).filter(Boolean);
    return [s];
  }
  if (typeof v === "number") return [String(v)];
  return [safeStr(v)].filter(Boolean);
}

function cleanEspecialidades(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const raw of arr) {
    const t = safeStr(raw).trim();
    if (!t) continue;
    if (t === "0") continue;

    const key = normalizeText(t);
    if (!key) continue;

    // ignorar "sin especialidad"
    if (key === "sin especialidad" || key === "sinespecialidad") continue;

    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

function stripMedicoWhenMultiple(list: string[]): string[] {
  if (list.length <= 1) return list;
  const filtered = list.filter((x) => normalizeText(x) !== "medico");
  return filtered.length ? filtered : list;
}

function collectEspecialidadIds(row: any): string[] {
  const ids: string[] = [];

  for (const k of ESPEC_ID_KEYS) {
    const v = row?.[k];
    if (v === null || v === undefined) continue;

    // puede venir number o string
    const s = String(v).trim();
    if (!s || s === "0") continue;

    ids.push(s);
  }

  // dedup manteniendo orden
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

/**
 * ✅ Regla final:
 * - Tomar IDs (nro_especialidad..6)
 * - Traducir a nombres con catálogo
 * - Si el catálogo todavía no está, como fallback mostramos los IDs (no vacío)
 * - Si queda vacío o viene "sin especialidad" => ["médico"]
 * - Si hay varias y una es "médico" => sacar "médico"
 * - Si además el backend alguna vez manda ESPECIALIDADES (nombres) también los incorporamos
 */
export function getEspecialidadesList(row: any): string[] {
  const ids = collectEspecialidadIds(row);

  // 1) ids -> nombres
  const fromIds = ids
    .map((id) => getEspecialidadNameById(id) ?? id) // fallback al id para no quedar vacío
    .flatMap((x) => coerceToStringArray(x));

  // 2) compat: si alguna respuesta trae nombres ya resueltos
  const rawCombined =
    row?.ESPECIALIDADES ??
    row?.especialidades ??
    row?.ESPECIALIDAD ??
    row?.especialidad ??
    row?.ESPECIALIDAD_NOMBRE ??
    row?.especialidad_nombre ??
    null;

  const fromCombined = coerceToStringArray(rawCombined);

  let list = cleanEspecialidades([...fromIds, ...fromCombined]);

  // si no quedó nada => médico
  if (list.length === 0) list = ["médico"];

  // regla "médico" si hay otras
  list = stripMedicoWhenMultiple(list);

  return list;
}

export function formatEspecialidades(row: any): string {
  return getEspecialidadesList(row).join(", ");
}

/* =========================
   Date helpers (exportados)
========================= */
export function parseDateAny(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;

  if (typeof v === "number") {
    const ms = v < 10_000_000_000 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const s = String(v).trim();
  if (!s) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yy = Number(m[3]);
    const d = new Date(yy, mm, dd);
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function inRange(d: Date, from?: Date | null, to?: Date | null): boolean {
  const t = d.getTime();
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}

/* =========================
   Field maps
========================= */
const KEYMAP: Record<string, string[]> = {
  nro_socio: ["nro_socio", "NRO_SOCIO", "SOCIO", "socio"],
  nombre: ["nombre", "NOMBRE", "apellido_nombre", "APELLIDO_NOMBRE", "ape_nom", "APE_NOM"],
  sexo: ["sexo", "SEXO"],
  documento: ["documento", "DOCUMENTO", "dni", "DNI", "nro_doc", "NRO_DOC"],
  mail_particular: ["mail_particular", "MAIL_PARTICULAR", "email", "EMAIL", "mail", "MAIL"],
  tele_particular: ["tele_particular", "TELE_PARTICULAR", "telefono", "TELEFONO"],
  celular_particular: ["celular_particular", "CELULAR_PARTICULAR", "celular", "CELULAR"],
  matricula_prov: ["matricula_prov", "MATRICULA_PROV", "mat_prov", "MAT_PROV"],
  matricula_nac: ["matricula_nac", "MATRICULA_NAC", "mat_nac", "MAT_NAC"],
  domicilio_consulta: ["domicilio_consulta", "DOMICILIO_CONSULTA"],
  telefono_consulta: ["telefono_consulta", "TELEFONO_CONSULTA", "tel_consulta", "TEL_CONSULTA"],
  provincia: ["provincia", "PROVINCIA"],
  categoria: ["categoria", "CATEGORIA"],
  condicion_impositiva: ["condicion_impositiva", "CONDICION_IMPOSITIVA", "condicionImpositiva"],

  malapraxis: ["malapraxis", "MALAPRAXIS", "malapraxis_empresa", "MALAPRAXIS_EMPRESA"],

  vencimiento_malapraxis: [
    "vencimiento_malapraxis",
    "VENCIMIENTO_MALAPRAXIS",
    "malapraxis_vencimiento",
    "MALAPRAXIS_VENCIMIENTO",
    "malapraxis_vto",
    "MALAPRAXIS_VTO",
    "vto_malapraxis",
    "VTO_MALAPRAXIS",
    "fecha_venc_malapraxis",
  ],
  vencimiento_anssal: [
    "vencimiento_anssal",
    "VENCIMIENTO_ANSSAL",
    "anssal_vencimiento",
    "ANSSAL_VENCIMIENTO",
    "anssal_vto",
    "ANSSAL_VTO",
    "vto_anssal",
    "VTO_ANSSAL",
    "fecha_venc_anssal",
  ],
  vencimiento_cobertura: [
    "vencimiento_cobertura",
    "VENCIMIENTO_COBERTURA",
    "cobertura_vencimiento",
    "COBERTURA_VENCIMIENTO",
    "cobertura_vto",
    "COBERTURA_VTO",
    "vto_cobertura",
    "VTO_COBERTURA",
    "fecha_venc_cobertura",
  ],
};

export function getCellValue(row: Record<string, unknown>, key: string): any {
  if (key === "especialidad" || key === "especialidades") return formatEspecialidades(row);

  const keys = KEYMAP[key];
  if (keys) return pickFirst(row, keys);

  return (row as any)?.[key] ?? "";
}

/* =========================
   Missing fields
========================= */
const MISSING_KEYS: Record<MissingFieldKey, string[]> = {
  telefono_consulta: KEYMAP.telefono_consulta,
  domicilio_consulta: KEYMAP.domicilio_consulta,
  mail_particular: KEYMAP.mail_particular,
  tele_particular: KEYMAP.tele_particular,
  celular_particular: KEYMAP.celular_particular,
  matricula_prov: KEYMAP.matricula_prov,
  matricula_nac: KEYMAP.matricula_nac,
  provincia: KEYMAP.provincia,
  categoria: KEYMAP.categoria,
  especialidad: [
    ...ESPEC_ID_KEYS, // ✅ ids reales
    "ESPECIALIDADES",
    "especialidades",
    "ESPECIALIDAD",
    "especialidad",
  ],
  condicion_impositiva: KEYMAP.condicion_impositiva,
  malapraxis: KEYMAP.malapraxis,
};

export function isMissingField(row: Record<string, unknown>, field: MissingFieldKey): boolean {
  if (field === "especialidad") return getEspecialidadesList(row).length === 0;

  const raw = pickFirst(row, MISSING_KEYS[field] ?? []);
  if (field === "mail_particular") {
    const s = String(raw ?? "").trim();
    if (s === "@") return true;
  }
  return isEmptyValue(raw);
}

/* =========================
   Query mapping (backend)
   ✅ NO mandamos "especialidad" porque /api/medicos no lo soporta (422)
========================= */
export function mapUIToQuery(filters: FilterSelection) {
  return {
    sexo: filters.otros.sexo || undefined,
    estado: filters.otros.estado || undefined,
    adherente: filters.otros.adherente || undefined,
    provincia: filters.otros.provincia || undefined,
    categoria: filters.otros.categoria || undefined,
    condicion_impositiva: filters.otros.condicionImpositiva || undefined,
    fecha_ingreso_desde: filters.otros.fechaIngresoDesde || undefined,
    fecha_ingreso_hasta: filters.otros.fechaIngresoHasta || undefined,

    malapraxis_vencida: filters.vencimientos.malapraxisVencida ? "1" : undefined,
    malapraxis_por_vencer: filters.vencimientos.malapraxisPorVencer ? "1" : undefined,
    anssal_vencido: filters.vencimientos.anssalVencido ? "1" : undefined,
    anssal_por_vencer: filters.vencimientos.anssalPorVencer ? "1" : undefined,
    cobertura_vencida: filters.vencimientos.coberturaVencida ? "1" : undefined,
    cobertura_por_vencer: filters.vencimientos.coberturaPorVencer ? "1" : undefined,
    vto_desde: filters.vencimientos.fechaDesde || undefined,
    vto_hasta: filters.vencimientos.fechaHasta || undefined,
    vto_dias: filters.vencimientos.dias > 0 ? String(filters.vencimientos.dias) : undefined,
  };
}

export function buildQS(obj: Record<string, any>) {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === "undefined" || v === null || v === "") continue;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return parts.join("&");
}

/* =========================
   Labels
========================= */
export function labelFor(key: string) {
  const map: Record<string, string> = {
    nro_socio: "N° Socio",
    nombre: "Nombre completo",
    sexo: "Sexo",
    documento: "Documento",
    mail_particular: "Mail",
    tele_particular: "Teléfono",
    celular_particular: "Celular",
    matricula_prov: "Matrícula Provincial",
    matricula_nac: "Matrícula Nacional",
    domicilio_consulta: "Domicilio Consultorio",
    telefono_consulta: "Teléfono Consultorio",
    provincia: "Provincia",
    categoria: "Categoría",
    especialidad: "Especialidades",
    condicion_impositiva: "Condición Impositiva",
    malapraxis: "Mala Praxis (empresa)",
    vencimiento_malapraxis: "Venc. Mala Praxis",
    vencimiento_anssal: "Venc. ANSSAL",
    vencimiento_cobertura: "Venc. Cobertura",
  };
  return map[key] ?? key;
}

/* =========================
   CSV helpers
========================= */
function csvEscape(v: any) {
  const s = String(v ?? "");
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCSV(rows: Record<string, unknown>[], cols: ExportColumn[]) {
  const header = cols.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((r) => cols.map((c) => csvEscape(getCellValue(r, c.key))).join(","));
  return [header, ...lines].join("\n");
}

export function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* =========================
   Excel Export
========================= */
async function fileToBase64(file: File): Promise<{ base64: string; extension: "png" | "jpeg" }> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const ext: "png" | "jpeg" =
    dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg") ? "jpeg" : "png";

  const base64 = dataUrl.split(",")[1] ?? "";
  return { base64, extension: ext };
}

function fmtDateTime(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export async function exportToExcelBW(args: ExportExcelArgs) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet("Médicos", {
    pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = args.columns.map((c) => {
    const w =
      c.key === "nombre"
        ? 44
        : c.key === "especialidad"
        ? 42
        : c.key === "domicilio_consulta"
        ? 44
        : c.key === "mail_particular"
        ? 32
        : c.key === "malapraxis"
        ? 26
        : c.key === "nro_socio"
        ? 14
        : c.key.startsWith("vencimiento_")
        ? 18
        : 20;

    return { key: c.key, width: w };
  });

  const totalCols = Math.max(1, args.columns.length);
  const lastColLetter = ws.getColumn(totalCols).letter;

  const ROW_LOGO = 1;
  const ROW_TITLE = 2;
  const ROW_SUB = 3;
  const ROW_META = 4;
  const ROW_SPACER = 5;
  const ROW_TABLE_HEADER = 6;

  ws.views = [{ state: "frozen", ySplit: ROW_TABLE_HEADER }];

  ws.getRow(ROW_LOGO).height = 42;
  ws.getRow(ROW_TITLE).height = 28;
  ws.getRow(ROW_SUB).height = 18;
  ws.getRow(ROW_META).height = 16;
  ws.getRow(ROW_SPACER).height = 6;

  if (args.logoFile) {
    const { base64, extension } = await fileToBase64(args.logoFile);
    const imgId = wb.addImage({ base64, extension });

    ws.addImage(imgId, {
      tl: { col: 0, row: 0 },
      ext: { width: 140, height: 42 },
    });
  }

  ws.mergeCells(`A${ROW_TITLE}:${lastColLetter}${ROW_TITLE}`);
  ws.getCell(`A${ROW_TITLE}`).value = args.title;
  ws.getCell(`A${ROW_TITLE}`).font = { name: "Calibri", size: 18, bold: true, color: { argb: "FF0B1F3A" } };
  ws.getCell(`A${ROW_TITLE}`).alignment = { vertical: "middle", horizontal: "center" };

  ws.mergeCells(`A${ROW_SUB}:${lastColLetter}${ROW_SUB}`);
  ws.getCell(`A${ROW_SUB}`).value = args.subtitle ?? "";
  ws.getCell(`A${ROW_SUB}`).font = { name: "Calibri", size: 11, color: { argb: "FF111111" } };
  ws.getCell(`A${ROW_SUB}`).alignment = { vertical: "middle", horizontal: "center" };

  if (totalCols >= 4) {
    ws.mergeCells(`A${ROW_META}:C${ROW_META}`);
    ws.getCell(`A${ROW_META}`).value = "Generado";
    ws.getCell(`A${ROW_META}`).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF333333" } };
    ws.getCell(`A${ROW_META}`).alignment = { vertical: "middle", horizontal: "left" };

    ws.mergeCells(`D${ROW_META}:${lastColLetter}${ROW_META}`);
    ws.getCell(`D${ROW_META}`).value = fmtDateTime(new Date());
    ws.getCell(`D${ROW_META}`).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF333333" } };
    ws.getCell(`D${ROW_META}`).alignment = { vertical: "middle", horizontal: "right" };
  } else {
    ws.mergeCells(`A${ROW_META}:${lastColLetter}${ROW_META}`);
    ws.getCell(`A${ROW_META}`).value = `Generado: ${fmtDateTime(new Date())}`;
    ws.getCell(`A${ROW_META}`).font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF333333" } };
    ws.getCell(`A${ROW_META}`).alignment = { vertical: "middle", horizontal: "left" };
  }

  const border = {
    top: { style: "thin" as const, color: { argb: "FF111111" } },
    left: { style: "thin" as const, color: { argb: "FF111111" } },
    bottom: { style: "thin" as const, color: { argb: "FF111111" } },
    right: { style: "thin" as const, color: { argb: "FF111111" } },
  };

  const headerRow = ws.getRow(ROW_TABLE_HEADER);
  headerRow.height = 22;

  for (let i = 1; i <= totalCols; i++) {
    const c = args.columns[i - 1];
    const cell = headerRow.getCell(i);
    cell.value = c.header;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = border;
  }

  for (let i = 0; i < args.rows.length; i++) {
    const r = args.rows[i];

    const obj: Record<string, any> = {};
    for (const col of args.columns) {
      obj[col.key] = getCellValue(r, col.key);
    }

    const excelRow = ws.addRow(obj);
    excelRow.height = 18;

    const zebra = i % 2 === 0 ? "FFFFFFFF" : "FFF7F7F7";

    for (let col = 1; col <= totalCols; col++) {
      const key = args.columns[col - 1]?.key;
      const cell = excelRow.getCell(col);

      cell.font = { name: "Calibri", size: 11, color: { argb: "FF111111" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebra } };
      cell.border = border;

      if (key === "nombre" || key === "especialidad" || key === "domicilio_consulta" || key === "mail_particular" || key === "malapraxis") {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      }
    }
  }

  const endRow = ws.lastRow?.number ?? ROW_TABLE_HEADER;
  ws.autoFilter = {
    from: { row: ROW_TABLE_HEADER, column: 1 },
    to: { row: endRow, column: totalCols },
  };

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    args.filename
  );
}
