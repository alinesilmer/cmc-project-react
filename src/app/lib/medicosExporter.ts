import type { AnyRow, ExportFormat } from "./exportRowsFile";
import { exportRowsFile } from "./exportRowsFile";
import { getJSON } from "./http";

type EspecialidadApiItem = Record<string, any>;

function norm(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

async function loadEspecialidadMap(): Promise<Record<string, string>> {
  const data = await getJSON<EspecialidadApiItem[]>("/api/especialidades/");
  const map: Record<string, string> = {};
  if (!Array.isArray(data)) return map;

  for (const e of data) {
    const rawVal =
      e?.id ?? e?.ID ?? e?.codigo ?? e?.CODIGO ?? e?.value ?? e?.nombre ?? e?.NOMBRE;
    const rawLabel =
      e?.nombre ??
      e?.NOMBRE ??
      e?.descripcion ??
      e?.DESCRIPCION ??
      e?.detalle ??
      e?.DETALLE ??
      rawVal;

    const id = norm(rawVal);
    const label = norm(rawLabel);
    if (id) map[id] = label || id;
  }

  return map;
}

function safeDateTag() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${mi}`;
}

export async function exportMedicos(args: {
  format: ExportFormat;
  rows: AnyRow[];
  columns: string[];
  logoFile: File | null;
  title?: string;
  sheetName?: string;
}) {
  const { format, rows, columns, logoFile, title = "Listado de Médicos", sheetName = "Médicos" } =
    args;

  const needsEspecialidad = columns.includes("especialidad");
  const especialidadMap = needsEspecialidad ? await loadEspecialidadMap() : undefined;

  const filename =
    format === "xlsx" ? `medicos_${safeDateTag()}.xlsx` : `medicos_${safeDateTag()}.csv`;

  await exportRowsFile({
    format,
    rows,
    columns,
    logoFile,
    filename,
    sheetName,
    title,
    especialidadMap,
  });
}
