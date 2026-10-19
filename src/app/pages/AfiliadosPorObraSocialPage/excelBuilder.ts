import type ExcelJS from "exceljs";
import type { ObraSocial, ExportRow, ExportField } from "./types";
import { safeStr, buildOsCode, pickEspecialidadesList } from "./helpers";
import { fmtFechaVisible } from "@/app/shared/lib/fechas";
import {
  CMC_NAME, CMC_PHONE, CMC_EMAIL, CMC_LOGO_SRC,
  fetchAsDataUrl,
} from "@/app/shared/lib/documentos/institucion";
import {
  C, E, FILETE, FONDO_BANDA, FONDO_BLANCO,
  colLetter, relleno, tramos, tryAddLogoImage,
} from "@/app/shared/lib/documentos/excelColegio";
import { pickCellValue } from "@/app/pages/AfiliadosPorObraSocialPage/utiles";

const A_IZQUIERDA: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
const AL_CENTRO: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center" };

/** El peso del catálogo es adimensional; acá se traduce a caracteres de Excel. */
function anchoDe(campo: ExportField): number {
  return Math.round(Math.min(56, Math.max(10, campo.weight * 1.5 + 6)));
}

/** Cuántas especialidades distintas hay en el listado. */
function contarEspecialidades(rows: ExportRow[]): number {
  const vistas = new Set<string>();
  for (const r of rows) for (const e of pickEspecialidadesList(r)) vistas.add(safeStr(e).trim().toLowerCase());
  vistas.delete("");
  return vistas.size;
}

// Filas fijas de la hoja, de arriba abajo.
const F = { titulo: 1, sub: 2, aire1: 3, rotulos: 4, cifras: 5, aire2: 6, banda: 7, cabecera: 8 };

/** Hoja con un encabezado tipo tablero —título, tarjetas de resumen y una banda con el nombre del listado— y debajo la tabla. */
export async function buildExcel(
  rows: ExportRow[],
  selectedOS: ObraSocial,
  cols: ExportField[]
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;

  const logoDataUrl = await fetchAsDataUrl(CMC_LOGO_SRC);
  const code = buildOsCode(selectedOS);
  const dateStr = fmtFechaVisible(new Date());
  const NCOLS = cols.length;
  const ultima = colLetter(NCOLS);
  const todaLaFila = (fila: number) => `A${fila}:${ultima}${fila}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet("Prestadores", {
    views: [{ state: "frozen", ySplit: F.cabecera, showGridLines: false }],
    pageSetup: {
      fitToPage: true, fitToWidth: 1, fitToHeight: 0, orientation: "landscape",
      // Al imprimir, la cabecera de la tabla se repite en cada hoja.
      printTitlesRow: `${F.cabecera}:${F.cabecera}`,
    },
    headerFooter: {
      oddFooter: `&L&8${CMC_NAME}  ·  ${CMC_PHONE}  ·  ${CMC_EMAIL}&R&8Página &P de &N`,
    },
  });

  ws.columns = cols.map(c => ({ key: c.key, width: anchoDe(c) }));

  // ── Título ───────────────────────────────────────────────────────────────
  ws.getRow(F.titulo).height = 46;
  ws.mergeCells(todaLaFila(F.titulo));
  const titulo = ws.getCell(`A${F.titulo}`);
  titulo.value = "Padrón de prestadores";
  titulo.font = E.titulo;
  titulo.fill = relleno(C.azul);
  titulo.alignment = { vertical: "middle", horizontal: "left", indent: 9 };

  ws.getRow(F.sub).height = 20;
  ws.mergeCells(todaLaFila(F.sub));
  const sub = ws.getCell(`A${F.sub}`);
  sub.value = `${CMC_NAME}  ·  ${selectedOS.NOMBRE} (${code})`.toUpperCase();
  sub.font = E.sub;
  sub.fill = relleno(C.azul);
  sub.alignment = { vertical: "top", horizontal: "left", indent: 9 };

  ws.getRow(F.aire1).height = 8;

  // ── Tarjetas de resumen ──────────────────────────────────────────────────
  const tarjetas: [string, string | number][] = [
    ["PRESTADORES", rows.length],
    ["ESPECIALIDADES", contarEspecialidades(rows)],
    ["VIGENCIA", dateStr],
    ["OBRA SOCIAL", selectedOS.NOMBRE],
  ];
  ws.getRow(F.rotulos).height = 16;
  ws.getRow(F.cifras).height = 30;
  tramos(NCOLS, tarjetas.length).forEach(([desde, hasta], i) => {
    const [rotulo, cifra] = tarjetas[i];
    for (const [fila, valor, fuente] of [
      [F.rotulos, rotulo, E.rotulo],
      [F.cifras, cifra, E.cifra],
    ] as const) {
      if (hasta > desde) ws.mergeCells(fila, desde, fila, hasta);
      const celda = ws.getCell(fila, desde);
      celda.value = valor;
      celda.font = fuente;
      celda.fill = FONDO_BANDA;
      celda.alignment = { vertical: "middle", horizontal: "left", indent: 1, shrinkToFit: true };
      // El filete azul a la izquierda separa una tarjeta de la otra.
      celda.border = { left: { style: "medium", color: { argb: C.azul } } };
    }
  });

  ws.getRow(F.aire2).height = 8;

  // ── Banda con el nombre del listado ──────────────────────────────────────
  ws.getRow(F.banda).height = 20;
  ws.mergeCells(todaLaFila(F.banda));
  const banda = ws.getCell(`A${F.banda}`);
  banda.value = "LISTADO DE PRESTADORES";
  banda.font = E.banda;
  banda.fill = relleno(C.amarillo);
  banda.alignment = AL_CENTRO;

  // ── Cabecera de la tabla ─────────────────────────────────────────────────
  const hRow = ws.getRow(F.cabecera);
  hRow.height = 22;
  const fondoCabecera = relleno(C.azul);
  cols.forEach((col, i) => {
    const cell = hRow.getCell(i + 1);
    cell.value = col.label;
    cell.font = E.cabecera;
    cell.fill = fondoCabecera;
    cell.alignment = AL_CENTRO;
  });

  // ── Filas ────────────────────────────────────────────────────────────────
  // La alineación la define el catálogo: el texto largo va a la izquierda y se ajusta.
  const alineaciones = cols.map((c) => (c.align === "left" ? A_IZQUIERDA : AL_CENTRO));
  rows.forEach((p, idx) => {
    const row = ws.addRow(cols.map(c => pickCellValue(p, c)));
    row.height = 18;
    const fondo = idx % 2 ? FONDO_BANDA : FONDO_BLANCO;
    for (let c = 1; c <= NCOLS; c++) {
      const cell = row.getCell(c);
      cell.fill = fondo;
      cell.border = FILETE;
      cell.font = E.dato;
      cell.alignment = alineaciones[c - 1];
    }
  });

  // ── Auto-filter ──────────────────────────────────────────────────────────
  const lastDataRow = F.cabecera + rows.length;
  ws.autoFilter = {
    from: { row: F.cabecera, column: 1 },
    to:   { row: lastDataRow, column: NCOLS },
  };

  // ── Pie ──────────────────────────────────────────────────────────────────
  const footerRowIdx = lastDataRow + 1;
  ws.mergeCells(todaLaFila(footerRowIdx));
  const footerRow = ws.getRow(footerRowIdx);
  footerRow.height = 16;
  const footerCell = footerRow.getCell(1);
  footerCell.value = `Documento oficial del ${CMC_NAME} — ${dateStr}`;
  footerCell.font = E.pie;
  footerCell.alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  // ── Logo, sobre el título ────────────────────────────────────────────────
  const imageId = tryAddLogoImage(wb, logoDataUrl);
  if (imageId !== null) {
    ws.addImage(imageId, {
      tl: { col: 0.25, row: 0.2 },
      ext: { width: 44, height: 66 },
      editAs: "oneCell",
    });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
