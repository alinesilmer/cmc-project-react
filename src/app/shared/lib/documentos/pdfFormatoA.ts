// «Formato A» de los PDF de liquidación: A4 vertical, Helvetica, negro y un gris. Sin colores ni rellenos.
// Cabecera con logo y título, tablas con una línea gruesa bajo el encabezado y filetes finos entre filas,
// y pie con «Página X de Y». Lo usan el resumen de pago y el recibo por médico.
import type { jsPDF } from "jspdf";
import type autoTableFn from "jspdf-autotable";
import type { CellDef, CellHookData } from "jspdf-autotable";
import { CMC_NAME } from "./institucion";
import { finDeTabla } from "./pdfColegio";
import { formatoImporte } from "@/app/shared/lib/formatos";

type Rgb = [number, number, number];
const TINTA: Rgb = [17, 17, 17];
const GRIS: Rgb = [93, 100, 112];
const REGLA: Rgb = [201, 204, 210];
const FONDO_BADGE: Rgb = [238, 239, 241];
const GRIS_OSCURO: Rgb = [55, 60, 70];

/** Medidas de la hoja, en mm (A4 vertical; la horizontal las da vuelta). `MB` deja lugar al pie. */
const LADO_CORTO = 210;
const LADO_LARGO = 297;
const ML = 15;
const MR = 15;
const MT = 14;
const MB = 18;
const PT = 0.3528; // mm por punto
const interlineado = (pt: number) => pt * PT * 1.15;

/** Padding de las celdas, en mm. */
const PAD_X = 1.6;
const PAD_Y = 1.1;
const PAD_TOTAL = 1.8;

export const importe = (n: number | string | null | undefined) => formatoImporte.format(Number(n ?? 0));
/** «+1.234,00» o «-1.234,00». */
export const conSigno = (n: number | string) => `${Number(n) < 0 ? "-" : "+"}${importe(Math.abs(Number(n)))}`;
export const fechaCorta = (d: Date | string | null | undefined = new Date()) =>
  (d ? new Date(d) : new Date()).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
/** «Octubre 2026»; «—» si falta el mes o el año. */
export const periodoLargo = (mes: number | null | undefined, anio: number | null | undefined) =>
  mes && anio ? `${MESES[mes - 1]} ${anio}` : "—";

export type Columna = {
  titulo: string;
  /** Ancho en % del ancho útil. Las que no lo traen se reparten lo que queda. */
  ancho?: number;
  /** Importes y números: alineados a la derecha. */
  der?: boolean;
};

/** Una celda: texto, o texto con una segunda línea gris (`sub`), o que ocupa varias columnas. */
export type Celda = string | { t: string; sub?: string; cols?: number };
export type Fila = Celda[] | { celdas: Celda[]; total?: boolean };

type Extra = { principal?: string[]; secundaria?: string[]; fs?: number; fsSub?: number; padX?: number };

export type DatosCabecera = {
  titulo: string;
  subtitulo?: string;
  /** Líneas de la derecha: `t` en gris y, a continuación, `b` en negrita. */
  meta?: { t: string; b?: string }[];
  /** Etiqueta en gris clarito en la línea del título, pegada al borde derecho (por ejemplo, el estado). */
  badge?: string;
  /** Fila debajo del título y arriba de la línea negra: algo a la izquierda y algo pegado al borde derecho. */
  fila?: { izquierda: string; derecha?: string };
  /** Logo del Colegio como data URL (opcional). */
  logo?: string | null;
};

export class PdfFormatoA {
  y = MT;

  readonly doc: jsPDF;
  private readonly autoTable: typeof autoTableFn;
  /** Ancho y alto de la hoja, y ancho útil, en mm. */
  private readonly W: number;
  private readonly H: number;
  private readonly ANCHO: number;

  private constructor(doc: jsPDF, autoTable: typeof autoTableFn, horizontal: boolean) {
    this.doc = doc;
    this.autoTable = autoTable;
    this.W = horizontal ? LADO_LARGO : LADO_CORTO;
    this.H = horizontal ? LADO_CORTO : LADO_LARGO;
    this.ANCHO = this.W - ML - MR;
  }

  /** `horizontal`: hoja A4 apaisada, para tablas con muchas columnas. */
  static async crear(opts: { horizontal?: boolean } = {}): Promise<PdfFormatoA> {
    const [{ jsPDF: JsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const horizontal = !!opts.horizontal;
    return new PdfFormatoA(new JsPDF({ unit: "mm", format: "a4", orientation: horizontal ? "landscape" : "portrait" }), autoTable, horizontal);
  }

  /** Pasa a la hoja siguiente si lo que viene (`alto` mm) no entra en la actual. */
  asegurar(alto: number) {
    if (this.y + alto > this.H - MB) {
      this.doc.addPage();
      this.y = MT;
    }
  }

  // ── Cabecera ──

  cabecera(d: DatosCabecera) {
    const { doc } = this;
    const y0 = MT;
    const altoLogo = 13;
    let xOrg = ML;
    if (d.logo) {
      const anchoLogo = altoLogo * (160 / 240);
      try {
        doc.addImage(d.logo, "PNG", ML, y0, anchoLogo, altoLogo);
        xOrg = ML + anchoLogo + 3;
      } catch {
        /* sin logo: el nombre queda a la izquierda */
      }
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...TINTA);
    doc.text(CMC_NAME, xOrg, y0 + altoLogo / 2 + 1.4);

    // Meta a la derecha
    doc.setFontSize(8);
    const interMeta = 3.7;
    (d.meta ?? []).forEach((m, i) => {
      const yy = y0 + 3 + i * interMeta;
      doc.setFont("helvetica", "bold");
      const wb = m.b ? doc.getTextWidth(m.b) : 0;
      doc.setFont("helvetica", "normal"); doc.setTextColor(...GRIS);
      const wt = doc.getTextWidth(m.t);
      const x = this.W - MR - wt - wb;
      doc.text(m.t, x, yy);
      if (m.b) { doc.setFont("helvetica", "bold"); doc.setTextColor(...TINTA); doc.text(m.b, x + wt, yy); }
    });

    // Título
    let yy = y0 + altoLogo + 10;
    doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...TINTA);
    doc.text(d.titulo, ML, yy);
    if (d.badge) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      const ancho = doc.getTextWidth(d.badge) + 7;
      const alto = 5.8;
      const x = this.W - MR - ancho;
      const y = yy - 2.3 - alto / 2; // centrado en la altura de las mayúsculas del título
      doc.setFillColor(...FONDO_BADGE);
      doc.roundedRect(x, y, ancho, alto, 1.4, 1.4, "F");
      doc.setTextColor(...GRIS_OSCURO);
      doc.text(d.badge, x + ancho / 2, y + alto / 2 + 1.05, { align: "center" });
    }
    if (d.subtitulo) {
      yy += 5.5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...GRIS);
      doc.text(d.subtitulo, ML, yy);
    }

    // Socio / período: dentro de la cabecera, antes de la línea negra
    if (d.fila) {
      yy += 7;
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...TINTA);
      doc.text(d.fila.izquierda, ML, yy);
      if (d.fila.derecha) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
        doc.text(d.fila.derecha, this.W - MR, yy, { align: "right" });
      }
    }

    yy += 3;
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.5);
    doc.line(ML, yy, this.W - MR, yy);
    this.y = yy + 4;
  }

  /** Pasa a una hoja nueva (para documentos de varias hojas independientes, como los comprobantes). */
  hojaNueva() {
    this.doc.addPage();
    this.y = MT;
  }

  /**
   * Datos sueltos en una grilla de 4 columnas: etiqueta gris arriba, valor en negrita abajo.
   * El tercer elemento (opcional) es cuántas columnas ocupa el dato.
   */
  datos(items: [string, string, number?][]) {
    const { doc } = this;
    this.asegurar(14);
    const colW = this.ANCHO / 4;
    let col = 0;
    let fila = 0;
    items.forEach(([etiqueta, valor, span = 1]) => {
      if (col + span > 4) { col = 0; fila += 1; }
      const x = ML + col * colW;
      const yy = this.y + fila * 9;
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRIS);
      doc.text(etiqueta.toUpperCase(), x, yy);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...TINTA);
      doc.text(doc.splitTextToSize(valor, colW * span - 2) as string[], x, yy + 4);
      col += span;
    });
    this.y += (fila + 1) * 9 + 1.5;
  }

  /** Un dato grande, uno debajo del otro: etiqueta gris en mayúsculas y valor en negrita. */
  dato(etiqueta: string, valor: string) {
    const { doc } = this;
    this.asegurar(16);
    this.y += 7;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRIS);
    doc.text(etiqueta.toUpperCase(), ML, this.y);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...TINTA);
    doc.text(valor || "—", ML, this.y + 5.5);
    this.y += 5.5;
  }

  /** Dos importes grandes lado a lado, entre dos líneas y separados por un filete. */
  importesDobles(izq: [string, string], der: [string, string]) {
    const { doc } = this;
    this.asegurar(30);
    this.y += 7;
    const alto = 20;
    const mitad = this.ANCHO / 2;
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.3);
    doc.line(ML, this.y, this.W - MR, this.y);
    doc.line(ML, this.y + alto, this.W - MR, this.y + alto);
    doc.setDrawColor(...REGLA); doc.setLineWidth(0.15);
    doc.line(ML + mitad, this.y, ML + mitad, this.y + alto);
    [izq, der].forEach(([etiqueta, valor], i) => {
      const x = ML + i * mitad + (i ? 5 : 0);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRIS);
      doc.text(etiqueta.toUpperCase(), x, this.y + 6.5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(...TINTA);
      doc.text(valor, x, this.y + 14.5);
    });
    this.y += alto;
  }

  /** Párrafos de texto corrido, a la izquierda. */
  texto(parrafos: string[]) {
    const { doc } = this;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...TINTA);
    const lineas = parrafos.flatMap((p) => doc.splitTextToSize(p, this.ANCHO) as string[]);
    this.asegurar(lineas.length * interlineado(10) * 1.4 + 8);
    this.y += 8;
    lineas.forEach((l, i) => doc.text(l, ML, this.y + i * interlineado(10) * 1.4, { baseline: "top" }));
    this.y += lineas.length * interlineado(10) * 1.4;
  }

  /** Líneas de firma con su leyenda debajo, repartidas a lo ancho. */
  firmas(leyendas: string[]) {
    const { doc } = this;
    this.asegurar(30);
    this.y += 24;
    const ancho = this.ANCHO * 0.38;
    leyendas.forEach((l, i) => {
      const x = leyendas.length === 1 ? ML : i === 0 ? ML : this.W - MR - ancho;
      doc.setDrawColor(...GRIS); doc.setLineWidth(0.2);
      doc.line(x, this.y, x + ancho, this.y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...GRIS);
      doc.text(l, x + ancho / 2, this.y + 5, { align: "center" });
    });
    this.y += 6;
  }

  /** Título de sección en mayúsculas. */
  seccion(titulo: string, sub?: string) {
    this.asegurar(24);
    this.y += 4.5;
    const { doc } = this;
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...TINTA);
    doc.text(titulo.toUpperCase(), ML, this.y);
    if (sub) {
      const w = doc.getTextWidth(titulo.toUpperCase());
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GRIS);
      doc.text(sub, ML + w + 2, this.y);
    }
    this.y += 1.6;
  }

  // ── Tablas ──

  private anchos(cols: Columna[], total = this.ANCHO): number[] {
    const fijos = cols.reduce((s, c) => s + (c.ancho ? (c.ancho * total) / 100 : 0), 0);
    const libres = cols.filter((c) => !c.ancho).length;
    const resto = Math.max(total - fijos, 0) / (libres || 1);
    return cols.map((c) => (c.ancho ? (c.ancho * total) / 100 : resto));
  }

  /**
   * Tabla del formato: encabezado en mayúsculas grises con línea gruesa debajo, filetes finos entre filas
   * y las filas `total` en negrita con línea gruesa arriba. El encabezado se repite en cada hoja.
   */
  tabla(cols: Columna[], filas: Fila[], opts: { compacta?: boolean } = {}) {
    const { doc } = this;
    // Compacta: letra y márgenes internos más chicos, para tablas con muchas columnas de importes.
    const fs = opts.compacta ? 7 : 8;
    const fsSub = opts.compacta ? 6 : 7;
    const fsHead = opts.compacta ? 6.5 : 7;
    const padX = opts.compacta ? 0.9 : PAD_X;
    const anchos = this.anchos(cols);
    const totales = new Set<number>();

    const body: CellDef[][] = filas.map((f, idx) => {
      const celdas = Array.isArray(f) ? f : f.celdas;
      const esTotal = !Array.isArray(f) && !!f.total;
      if (esTotal) totales.add(idx);
      let c = 0;
      return celdas.map((cel) => {
        const o = typeof cel === "string" ? { t: cel } : cel;
        const cols_ = o.cols ?? 1;
        const w = anchos.slice(c, c + cols_).reduce((s, a) => s + a, 0);
        const der = cols[c]?.der && cols_ === 1;
        c += cols_;
        const def: CellDef & Extra = {
          content: o.t,
          colSpan: cols_ > 1 ? cols_ : undefined,
          styles: {
            halign: der ? "right" : "left",
            fontStyle: esTotal ? "bold" : "normal",
            cellPadding: { top: esTotal ? PAD_TOTAL : PAD_Y, bottom: PAD_Y, left: padX, right: padX },
          },
        };
        if (o.sub) {
          // Dos líneas (la segunda, gris y chica): se miden acá y se dibujan después de la tabla.
          doc.setFont("helvetica", "normal"); doc.setFontSize(fs);
          const principal = doc.splitTextToSize(o.t, w - 2 * padX) as string[];
          doc.setFontSize(fsSub);
          const secundaria = doc.splitTextToSize(o.sub, w - 2 * padX) as string[];
          def.content = "";
          def.principal = principal;
          def.secundaria = secundaria;
          def.fs = fs;
          def.fsSub = fsSub;
          def.padX = padX;
          def.styles = {
            ...def.styles,
            minCellHeight:
              PAD_Y * 2 + principal.length * interlineado(fs) + secundaria.length * interlineado(fsSub),
          };
        }
        return def;
      });
    });

    this.autoTable(doc, {
      startY: this.y,
      margin: { left: ML, right: MR, top: MT, bottom: MB },
      tableWidth: this.ANCHO,
      theme: "plain",
      head: [cols.map((c): CellDef => ({ content: c.titulo.toUpperCase(), styles: { halign: c.der ? "right" : "left" } }))],
      body,
      styles: { font: "helvetica", fontSize: fs, textColor: TINTA, lineWidth: 0, valign: "top", overflow: "linebreak" },
      headStyles: {
        fontSize: fsHead,
        fontStyle: "bold",
        textColor: GRIS,
        valign: "bottom",
        cellPadding: { top: PAD_Y + 0.1, bottom: PAD_Y + 0.1, left: padX, right: padX },
      },
      columnStyles: Object.fromEntries(
        cols.map((c, i) => [i, { cellWidth: anchos[i], halign: c.der ? "right" : "left" }]),
      ),
      showHead: "everyPage",
      rowPageBreak: "avoid",
      didDrawCell: (h: CellHookData) => this.dibujarCelda(h, totales),
    });
    this.y = finDeTabla(doc) + 1;
  }

  private dibujarCelda(h: CellHookData, totales: Set<number>) {
    const { doc } = h;
    const { x, y, width, height } = h.cell;
    if (h.section === "head") {
      doc.setDrawColor(...TINTA); doc.setLineWidth(0.3);
      doc.line(x, y + height, x + width, y + height);
      return;
    }
    if (h.section !== "body") return;
    if (totales.has(h.row.index)) {
      doc.setDrawColor(...TINTA); doc.setLineWidth(0.3);
      doc.line(x, y, x + width, y);
    } else {
      doc.setDrawColor(...REGLA); doc.setLineWidth(0.15);
      doc.line(x, y + height, x + width, y + height);
    }
    const extra = h.cell.raw as unknown as Extra;
    if (extra?.principal) {
      const fs = extra.fs ?? 8;
      const px = extra.padX ?? PAD_X;
      doc.setFont("helvetica", "normal"); doc.setFontSize(fs); doc.setTextColor(...TINTA);
      doc.text(extra.principal, x + px, y + PAD_Y, { baseline: "top" });
      doc.setFontSize(extra.fsSub ?? 7); doc.setTextColor(...GRIS);
      doc.text(extra.secundaria ?? [], x + px, y + PAD_Y + extra.principal.length * interlineado(fs), { baseline: "top" });
    }
  }

  /** Cierre de cuentas a la derecha: filas simples y, al final, la fila destacada entre dos líneas (la doble, abajo). */
  totales(filas: [string, string][], final: [string, string]) {
    const { doc } = this;
    const w = this.ANCHO * 0.62;
    this.asegurar(filas.length * 6 + 14);
    this.y += 4.5;
    const ultimo = filas.length;
    this.autoTable(doc, {
      startY: this.y,
      margin: { left: this.W - MR - w, right: MR, top: MT, bottom: MB },
      tableWidth: w,
      theme: "plain",
      showHead: "never",
      body: [...filas, final].map((f, i) => [
        { content: f[0], styles: i === ultimo ? { fontStyle: "bold", fontSize: 10.5 } : {} },
        { content: f[1], styles: { halign: "right", ...(i === ultimo ? { fontStyle: "bold", fontSize: 10.5 } : {}) } },
      ]) as CellDef[][],
      styles: {
        font: "helvetica", fontSize: 8, textColor: TINTA, lineWidth: 0,
        cellPadding: { top: PAD_Y, bottom: PAD_Y, left: PAD_X, right: PAD_X },
      },
      didParseCell: (h: CellHookData) => {
        if (h.section === "body" && h.row.index === ultimo) {
          h.cell.styles.cellPadding = { top: 2, bottom: 2, left: PAD_X, right: PAD_X };
        }
      },
      didDrawCell: (h: CellHookData) => {
        if (h.section !== "body") return;
        const { x, y, width, height } = h.cell;
        if (h.row.index === ultimo) {
          doc.setDrawColor(...TINTA); doc.setLineWidth(0.3);
          doc.line(x, y, x + width, y);
          doc.setLineWidth(0.15);
          doc.line(x, y + height - 0.5, x + width, y + height - 0.5);
          doc.line(x, y + height, x + width, y + height);
        } else {
          doc.setDrawColor(...REGLA); doc.setLineWidth(0.15);
          doc.line(x, y + height, x + width, y + height);
        }
      },
    });
    this.y = finDeTabla(doc) + 1;
  }

  /** «NETO A PAGAR $ …» centrado, entre una línea y una línea doble. */
  destacado(texto: string) {
    const { doc } = this;
    this.asegurar(22);
    this.y += 6;
    const alto = 11;
    doc.setDrawColor(...TINTA); doc.setLineWidth(0.3);
    doc.line(ML, this.y, this.W - MR, this.y);
    doc.setLineWidth(0.15);
    doc.line(ML, this.y + alto - 0.5, this.W - MR, this.y + alto - 0.5);
    doc.line(ML, this.y + alto, this.W - MR, this.y + alto);
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...TINTA);
    doc.text(texto, this.W / 2, this.y + alto / 2 + 2, { align: "center" });
    this.y += alto;
  }

  /** Texto chico, gris y centrado (aclaraciones al pie del documento). Cada elemento es un párrafo. */
  nota(parrafos: string[]) {
    const { doc } = this;
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...GRIS);
    const lineas = parrafos.flatMap((p) => doc.splitTextToSize(p, this.ANCHO) as string[]);
    this.asegurar(lineas.length * interlineado(6.5) + 6);
    this.y += 4;
    doc.text(lineas, this.W / 2, this.y, { align: "center", baseline: "top" });
    this.y += lineas.length * interlineado(6.5);
  }

  /**
   * Pie en todas las hojas («<Colegio> · <texto>» y «Página X de Y») y devuelve el documento.
   * `textoPie` puede ser una función de la hoja; `pagina` cambia la numeración (por ejemplo, cada
   * comprobante es una hoja «1 de 1»).
   */
  cerrar(
    textoPie: string | ((hoja: number) => string),
    opts: { pagina?: (hoja: number, total: number) => string } = {},
  ): jsPDF {
    const { doc } = this;
    const total = doc.getNumberOfPages();
    for (let n = 1; n <= total; n++) {
      doc.setPage(n);
      doc.setDrawColor(...REGLA); doc.setLineWidth(0.15);
      doc.line(ML, this.H - 13, this.W - MR, this.H - 13);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...GRIS);
      const texto = typeof textoPie === "function" ? textoPie(n) : textoPie;
      doc.text(`${CMC_NAME} · ${texto}`, ML, this.H - 9.5);
      doc.text(opts.pagina ? opts.pagina(n, total) : `Página ${n} de ${total}`, this.W - MR, this.H - 9.5, { align: "right" });
    }
    return doc;
  }
}
