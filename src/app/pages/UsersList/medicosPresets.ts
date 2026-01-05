// src/app/lib/medicosPresets.ts
import {
  addDays,
  endOfDay,
  includesCI,
  isActiveRow,
  isEmptyLike,
  getValue,
  parseDateAny,
  startOfDay,
  labelFor,
} from "./medicosExport";

export type ExportGroupId =
  | "vencimientos"
  | "contactabilidad"
  | "calidad"
  | "administrativos";
export type ExportPresetId =
  | "malapraxis_vencida"
  | "malapraxis_por_vencer"
  | "anssal_vencido"
  | "anssal_por_vencer"
  | "cobertura_vencida"
  | "cobertura_por_vencer"
  | "contactables"
  | "datos_incompletos"
  | "sin_cuit_o_cbu"
  | "altas_recientes"
  | "por_zona";

export type PresetParams = {
  q?: string;
  status?: "" | "activo" | "inactivo";
  adherente?: "" | "si" | "no";
  provincia?: string;
  localidad?: string;
  dias?: number;
  fechaDesde?: string;
  fechaHasta?: string;
};

export const GROUPS: Array<{ id: ExportGroupId; title: string }> = [
  { id: "vencimientos", title: "Vencimientos / Cumplimiento" },
  { id: "contactabilidad", title: "Contactabilidad" },
  { id: "calidad", title: "Calidad de padrón" },
  { id: "administrativos", title: "Administrativos / Matrícula" },
];

export const PRESETS: Record<
  ExportPresetId,
  { group: ExportGroupId; title: string; columns: string[] }
> = {
  malapraxis_vencida: {
    group: "vencimientos",
    title: "Malapraxis vencida",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "mail_particular",
      "celular_particular",
      "vencimiento_malapraxis",
    ],
  },
  malapraxis_por_vencer: {
    group: "vencimientos",
    title: "Malapraxis por vencer",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "mail_particular",
      "celular_particular",
      "vencimiento_malapraxis",
    ],
  },
  anssal_vencido: {
    group: "vencimientos",
    title: "ANSSAL vencido",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "anssal",
      "vencimiento_anssal",
      "mail_particular",
      "celular_particular",
    ],
  },
  anssal_por_vencer: {
    group: "vencimientos",
    title: "ANSSAL por vencer",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "anssal",
      "vencimiento_anssal",
      "mail_particular",
      "celular_particular",
    ],
  },
  cobertura_vencida: {
    group: "vencimientos",
    title: "Cobertura vencida",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "cobertura",
      "vencimiento_cobertura",
      "mail_particular",
      "celular_particular",
    ],
  },
  cobertura_por_vencer: {
    group: "vencimientos",
    title: "Cobertura por vencer",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "cobertura",
      "vencimiento_cobertura",
      "mail_particular",
      "celular_particular",
    ],
  },
  contactables: {
    group: "contactabilidad",
    title: "Contactables (mail o celular)",
    columns: [
      "apellido",
      "nombre_",
      "nro_socio",
      "mail_particular",
      "celular_particular",
      "provincia",
      "localidad",
    ],
  },
  datos_incompletos: {
    group: "calidad",
    title: "Datos críticos incompletos",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "provincia",
      "localidad",
      "observacion",
    ],
  },
  sin_cuit_o_cbu: {
    group: "calidad",
    title: "Sin CUIT o sin CBU",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "cuit",
      "cbu",
      "condicion_impositiva",
    ],
  },
  altas_recientes: {
    group: "administrativos",
    title: "Altas recientes (por fecha_matricula)",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "fecha_matricula",
      "categoria",
      "provincia",
      "localidad",
    ],
  },
  por_zona: {
    group: "administrativos",
    title: "Por zona (Provincia/Localidad)",
    columns: [
      "apellido",
      "nombre_",
      "documento",
      "matricula_prov",
      "mail_particular",
      "celular_particular",
      "provincia",
      "localidad",
      "domicilio_particular",
      "codigo_postal",
    ],
  },
};

export function presetColumns(presetId: ExportPresetId) {
  return PRESETS[presetId].columns.map((k) => ({
    key: k,
    header: labelFor(k),
  }));
}

export function applyExtraFilters(row: any, says: PresetParams) {
  const q = (says.q ?? "").trim();
  if (q) {
    const ok =
      includesCI(getValue(row, "apellido"), q) ||
      includesCI(getValue(row, "nombre_"), q) ||
      includesCI(getValue(row, "nombre"), q) ||
      includesCI(getValue(row, "mail_particular"), q) ||
      includesCI(getValue(row, "documento"), q) ||
      includesCI(getValue(row, "matricula_prov"), q) ||
      includesCI(getValue(row, "nro_socio"), q);
    if (!ok) return false;
  }

  if (says.status) {
    const st = isActiveRow(row) ? "activo" : "inactivo";
    if (st !== says.status) return false;
  }

  const prov = (says.provincia ?? "").trim();
  if (prov && !includesCI(getValue(row, "provincia"), prov)) return false;

  const loc = (says.localidad ?? "").trim();
  if (loc && !includesCI(getValue(row, "localidad"), loc)) return false;

  return true;
}

export function baseFilterForPreset(
  presetId: ExportPresetId,
  row: any,
  params: PresetParams
) {
  const today = startOfDay(new Date());
  const hasCustomRange =
    Boolean(params.fechaDesde?.trim()) || Boolean(params.fechaHasta?.trim());
  const from = params.fechaDesde?.trim()
    ? startOfDay(new Date(params.fechaDesde))
    : today;
  const to = params.fechaHasta?.trim()
    ? endOfDay(new Date(params.fechaHasta))
    : endOfDay(addDays(today, Math.max(1, Number(params.dias ?? 30))));

  const dateBefore = (key: string, cutoff: Date) => {
    const d = parseDateAny(getValue(row, key));
    return d ? d.getTime() < cutoff.getTime() : false;
  };

  const dateBetween = (key: string, a: Date, b: Date) => {
    const d = parseDateAny(getValue(row, key));
    if (!d) return false;
    return d.getTime() >= a.getTime() && d.getTime() <= b.getTime();
  };

  switch (presetId) {
    case "malapraxis_vencida": {
      const cutoff = params.fechaDesde?.trim() ? from : today;
      return dateBefore("vencimiento_malapraxis", cutoff);
    }
    case "malapraxis_por_vencer":
      return dateBetween(
        "vencimiento_malapraxis",
        hasCustomRange ? from : today,
        to
      );
    case "anssal_vencido": {
      const cutoff = params.fechaDesde?.trim() ? from : today;
      return dateBefore("vencimiento_anssal", cutoff);
    }
    case "anssal_por_vencer":
      return dateBetween(
        "vencimiento_anssal",
        hasCustomRange ? from : today,
        to
      );
    case "cobertura_vencida": {
      const cutoff = params.fechaDesde?.trim() ? from : today;
      return dateBefore("vencimiento_cobertura", cutoff);
    }
    case "cobertura_por_vencer":
      return dateBetween(
        "vencimiento_cobertura",
        hasCustomRange ? from : today,
        to
      );
    case "contactables": {
      const mail = String(getValue(row, "mail_particular") ?? "").trim();
      const cel = String(getValue(row, "celular_particular") ?? "").trim();
      return Boolean(mail) || Boolean(cel);
    }
    case "datos_incompletos":
      return (
        isEmptyLike(getValue(row, "documento")) ||
        isEmptyLike(getValue(row, "apellido")) ||
        isEmptyLike(getValue(row, "nombre_")) ||
        isEmptyLike(getValue(row, "provincia")) ||
        isEmptyLike(getValue(row, "localidad"))
      );
    case "sin_cuit_o_cbu":
      return (
        isEmptyLike(getValue(row, "cuit")) || isEmptyLike(getValue(row, "cbu"))
      );
    case "altas_recientes": {
      const a = params.fechaDesde?.trim() ? from : addDays(today, -30);
      const b = params.fechaHasta?.trim() ? to : endOfDay(today);
      return dateBetween("fecha_matricula", a, b);
    }
    case "por_zona":
      return true;
    default:
      return true;
  }
}

export function sortForPreset(presetId: ExportPresetId, rows: any[]) {
  const dateKeyAsc = (key: string) => (a: any, b: any) => {
    const da = parseDateAny(getValue(a, key));
    const db = parseDateAny(getValue(b, key));
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  };
  const textAsc = (key: string) => (a: any, b: any) =>
    String(getValue(a, key) ?? "")
      .toLowerCase()
      .localeCompare(String(getValue(b, key) ?? "").toLowerCase(), "es");

  switch (presetId) {
    case "malapraxis_vencida":
    case "malapraxis_por_vencer":
      return rows.sort(dateKeyAsc("vencimiento_malapraxis"));
    case "anssal_vencido":
    case "anssal_por_vencer":
      return rows.sort(dateKeyAsc("vencimiento_anssal"));
    case "cobertura_vencida":
    case "cobertura_por_vencer":
      return rows.sort(dateKeyAsc("vencimiento_cobertura"));
    case "altas_recientes":
      return rows.sort(dateKeyAsc("fecha_matricula"));
    default:
      return rows.sort(textAsc("apellido"));
  }
}
