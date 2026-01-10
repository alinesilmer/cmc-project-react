import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export type ExportFormat = "xlsx" | "csv";
export type AnyRow = Record<string, any>;

const LABELS: Record<string, string> = {
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
  localidad: "Localidad",
  categoria: "Categoría",
  especialidad: "Especialidad",
  condicion_impositiva: "Condición Impositiva",
};

function norm(v: any) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/\s+/g, " ").trim();
}

function csvEscape(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function toUpperKeyGet(row: AnyRow, key: string) {
  if (key in row) return row[key];
  const up = key.toUpperCase();
  if (up in row) return row[up];
  return undefined;
}

function pickValue(row: AnyRow, key: string, especialidadMap?: Record<string, string>) {
  if (key === "condicion_impositiva") {
    const v =
      row.condicion_impositiva ??
      row.condicionImpositiva ??
      row.CONDICION_IMPOSITIVA ??
      row.CONDICIONIMPOSITIVA ??
      toUpperKeyGet(row, "condicion_impositiva");
    return norm(v);
  }

  if (key === "especialidad") {
    const raw =
      row.especialidad_nombre ??
      row.especialidadNombre ??
      row.especialidad_name ??
      row.ESPECIALIDAD_NOMBRE ??
      row.ESPECIALIDAD_NOMBRE_DESC ??
      row.especialidad?.nombre ??
      row.especialidad?.NOMBRE;

    if (raw !== undefined && raw !== null && norm(raw) !== "") return norm(raw);

    const id =
      row.especialidad_id ??
      row.especialidadId ??
      row.especialidad ??
      row.ESPECIALIDAD_ID ??
      row.ESPECIALIDAD ??
      toUpperKeyGet(row, "especialidad_id");

    const idStr = norm(id);
    if (idStr && especialidadMap && especialidadMap[idStr]) return norm(especialidadMap[idStr]);
    return idStr;
  }

  return norm(toUpperKeyGet(row, key));
}

function uniq(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = String(x);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function colToLetter(n: number) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export async function exportRowsFile(args: {
  format: ExportFormat;
  rows: AnyRow[];
  columns: string[];
  logoFile: File | null;
  filename?: string;
  sheetName?: string;
  title?: string;
  especialidadMap?: Record<string, string>;
}) {
  const {
    format,
    rows,
    columns,
    logoFile,
    filename = format === "xlsx" ? "medicos.xlsx" : "medicos.csv",
    sheetName = "Médicos",
    title = "Listado",
    especialidadMap,
  } = args;

  const cols = uniq((columns && columns.length ? columns : Object.keys(LABELS)).filter(Boolean));

  if (format === "csv") {
    const headers = cols.map((c) => LABELS[c] ?? c);
    const lines: string[] = [];
    lines.push(headers.map((h) => csvEscape(h)).join(","));
    for (const r of rows) {
      lines.push(cols.map((c) => csvEscape(pickValue(r, c, especialidadMap))).join(","));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    saveAs(blob, filename);
    return;
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);

  ws.getRow(1).height = 26;
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 8;

  if (logoFile) {
    const base64 = await fileToBase64(logoFile);
    const ext = (logoFile.type || "").toLowerCase().includes("png") ? "png" : "jpeg";
    const imageId = wb.addImage({ base64, extension: ext });

    // ws.addImage(imageId, {
    //   tl: { col: 0, row: 0 },
    //   br: { col: 2, row: 3 },
    //   editAs: "oneCell",
    // });

    ws.getCell("C1").value = title;
    ws.getCell("C1").font = { bold: true, size: 14 };
    ws.getCell("C2").value = `Generado: ${new Date().toLocaleString()}`;
    ws.getCell("C2").font = { size: 10 };
  } else {
    ws.getCell("A1").value = title;
    ws.getCell("A1").font = { bold: true, size: 14 };
    ws.getCell("A2").value = `Generado: ${new Date().toLocaleString()}`;
    ws.getCell("A2").font = { size: 10 };
  }

  const headerRowIdx = 4;
  const startCol = 1;

  const headers = cols.map((c) => LABELS[c] ?? c);
  const headerRow = ws.getRow(headerRowIdx);
  headerRow.values = [undefined, ...headers];
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle" };
  headerRow.height = 18;

  const dataStartRow = headerRowIdx + 1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const values = cols.map((c) => pickValue(r, c, especialidadMap));
    ws.getRow(dataStartRow + i).values = [undefined, ...values];
  }

  const lastColLetter = colToLetter(cols.length);
  ws.autoFilter = {
    from: `A${headerRowIdx}`,
    to: `${lastColLetter}${headerRowIdx}`,
  };

  ws.views = [{ state: "frozen", ySplit: headerRowIdx }];

  const maxLens = headers.map((h) => h.length);
  for (const r of rows) {
    for (let i = 0; i < cols.length; i++) {
      const v = pickValue(r, cols[i], especialidadMap);
      const len = norm(v).length;
      if (len > maxLens[i]) maxLens[i] = len;
    }
  }

  for (let i = 0; i < cols.length; i++) {
    ws.getColumn(startCol + i).width = Math.min(45, Math.max(12, maxLens[i] + 2));
  }

  const out = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename
  );
}
