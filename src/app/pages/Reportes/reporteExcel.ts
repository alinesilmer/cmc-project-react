import type ExcelJS from "exceljs";

import {
  C, E, FILETE, FONDO_BANDA, FONDO_BLANCO,
  colLetter, relleno, tramos, tryAddLogoImage,
} from "@/app/shared/lib/documentos/excelColegio";
import {
  CMC_EMAIL, CMC_LOGO_SRC, CMC_NAME, CMC_PHONE, fetchAsDataUrl,
} from "@/app/shared/lib/documentos/institucion";
import { fmtFechaVisible } from "@/app/shared/lib/fechas";
import { encabezadoDe, textoDeCelda, totalFacturado } from "./exportar";
import type { DocumentoReporte } from "./exportar";

// Excel de un reporte, con la misma hoja que el padrón de prestadores: título en una banda azul, tarjetas de resumen.

// Filas fijas de la hoja, de arriba abajo.
const F = { titulo: 1, sub: 2, aire1: 3, rotulos: 4, cifras: 5, aire2: 6, banda: 7, cabecera: 8 };

const FORMATO = { numero: "#,##0", moneda: '"$" #,##0.00' } as const;
const AL_CENTRO: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "center" };
const A_IZQUIERDA: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "left", indent: 1 };
const A_DERECHA: Partial<ExcelJS.Alignment> = { vertical: "middle", horizontal: "right", indent: 1 };

export async function construirExcelReporte<T>(reporte: DocumentoReporte<T>): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const logo = await fetchAsDataUrl(CMC_LOGO_SRC);

  const { titulo, periodo, obraSocial, columnas, filas } = reporte;
  const fecha = fmtFechaVisible(new Date());
  const NCOLS = columnas.length;
  const ultima = colLetter(NCOLS);
  const todaLaFila = (fila: number) => `A${fila}:${ultima}${fila}`;

  const wb = new ExcelJS.Workbook();
  wb.creator = "CMC";
  wb.created = new Date();

  const ws = wb.addWorksheet(titulo.slice(0, 31), {
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

  // Ancho por el largo del encabezado y de una muestra de los datos.
  const muestra = filas.slice(0, 200);
  ws.columns = columnas.map((c) => ({
    width: Math.min(48, Math.max(12, c.header.length + 4, ...muestra.map((f) => textoDeCelda(c, f).length + 3))),
  }));

  // ── Título ────────────────────────────────────────────────────────────────
  ws.getRow(F.titulo).height = 46;
  ws.mergeCells(todaLaFila(F.titulo));
  const celdaTitulo = ws.getCell(`A${F.titulo}`);
  celdaTitulo.value = encabezadoDe(reporte);
  celdaTitulo.font = E.titulo;
  celdaTitulo.fill = relleno(C.azul);
  celdaTitulo.alignment = { vertical: "middle", horizontal: "left", indent: 9 };

  ws.getRow(F.sub).height = 20;
  ws.mergeCells(todaLaFila(F.sub));
  const sub = ws.getCell(`A${F.sub}`);
  sub.value = `${CMC_NAME}  ·  ${periodo}`.toUpperCase();
  sub.font = E.sub;
  sub.fill = relleno(C.azul);
  sub.alignment = { vertical: "top", horizontal: "left", indent: 9 };

  ws.getRow(F.aire1).height = 8;

  // ── Tarjetas de resumen ───────────────────────────────────────────────────
  const facturado = reporte.sinTotal ? null : totalFacturado(columnas, filas);
  const tarjetas: [string, string | number][] = [
    ["REGISTROS", filas.length],
    ...(facturado ? ([["FACTURADO", facturado]] as [string, string][]) : []),
    ["PERÍODO", periodo],
    ["OBRA SOCIAL", obraSocial],
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

  // ── Banda con el nombre del listado ───────────────────────────────────────
  ws.getRow(F.banda).height = 20;
  ws.mergeCells(todaLaFila(F.banda));
  const banda = ws.getCell(`A${F.banda}`);
  banda.value = titulo.toUpperCase();
  banda.font = E.banda;
  banda.fill = relleno(C.amarillo);
  banda.alignment = AL_CENTRO;

  // ── Cabecera de la tabla ──────────────────────────────────────────────────
  const cabecera = ws.getRow(F.cabecera);
  cabecera.height = 22;
  const fondoCabecera = relleno(C.azul);
  columnas.forEach((col, i) => {
    const celda = cabecera.getCell(i + 1);
    celda.value = col.header;
    celda.font = E.cabecera;
    celda.fill = fondoCabecera;
    celda.alignment = AL_CENTRO;
  });

  // ── Filas ─────────────────────────────────────────────────────────────────
  filas.forEach((f, idx) => {
    const fila = ws.addRow(columnas.map((c) => c.value(f) ?? ""));
    fila.height = 18;
    const fondo = idx % 2 ? FONDO_BANDA : FONDO_BLANCO;
    columnas.forEach((col, i) => {
      const celda = fila.getCell(i + 1);
      celda.fill = fondo;
      celda.border = FILETE;
      celda.font = E.dato;
      celda.alignment = col.tipo ? A_DERECHA : A_IZQUIERDA;
      if (col.tipo) celda.numFmt = FORMATO[col.tipo];
    });
  });

  const ultimaFila = F.cabecera + filas.length;
  ws.autoFilter = { from: { row: F.cabecera, column: 1 }, to: { row: ultimaFila, column: NCOLS } };

  // ── Pie ───────────────────────────────────────────────────────────────────
  ws.mergeCells(todaLaFila(ultimaFila + 1));
  const pie = ws.getRow(ultimaFila + 1);
  pie.height = 16;
  pie.getCell(1).value = `Documento oficial del ${CMC_NAME} — ${fecha}`;
  pie.getCell(1).font = E.pie;
  pie.getCell(1).alignment = { horizontal: "right", vertical: "middle", indent: 1 };

  // ── Logo, sobre el título ─────────────────────────────────────────────────
  const imagen = tryAddLogoImage(wb, logo);
  if (imagen !== null) {
    ws.addImage(imagen, { tl: { col: 0.25, row: 0.2 }, ext: { width: 44, height: 66 }, editAs: "oneCell" });
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
