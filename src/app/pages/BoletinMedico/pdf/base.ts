// Armado común de los PDF del boletín: cada solapa baja el suyo.

import type { jsPDF } from "jspdf";
import type autoTableFn from "jspdf-autotable";
import type { Styles } from "jspdf-autotable";
import {
  CMC_NAME,
  CMC_SUBTITLE,
  CMC_LOGO_SRC,
} from "@/app/pages/BoletinConsultaComun/boletinConsultaComun.constants";
import {
  fetchAsDataUrl,
  getImageFormat,
} from "@/app/pages/BoletinConsultaComun/boletinConsultaComun.helpers";
import { loadPdfLibs } from "@/app/shared/lib/documentos/pdfColegio";
import type { ItemBoletin } from "../boletinMedico.api";

export type Rgb = [number, number, number];

export const AZUL: Rgb = [23, 63, 112]; // $primary-blue
export const AMARILLO: Rgb = [245, 234, 192]; // $primary-yellow-light
export const GRIS: Rgb = [100, 116, 139];
const FILA_ALT: Rgb = [248, 250, 252];

export const MARGEN = 14;

/** Dónde empieza el contenido, debajo del encabezado. */
const INICIO = MARGEN + 24;

/** Lo que recibe una sección para dibujarse: el documento y por dónde seguir. */
export interface Lienzo {
  doc: jsPDF;
  autoTable: typeof autoTableFn;
  y: number;
}

/** Una solapa del boletín hecha PDF: cuánto lleva y cómo se dibuja. */
export interface SeccionPdf {
  /** Parte del nombre del archivo. */
  archivo: string;
  titulo: string;
  /** Cuánto hay para bajar; 0 = nada. */
  cantidad: (items: ItemBoletin[]) => number;
  dibujar: (lienzo: Lienzo, items: ItemBoletin[]) => void;
}

interface DefinicionTabla {
  archivo: string;
  titulo: string;
  cabecera: string[];
  filas: (items: ItemBoletin[]) => string[][];
  columnas?: Record<number, Partial<Styles>>;
}

/** Una sección que es una tabla: sólo dice las columnas y las filas. */
export function seccionTabla(def: DefinicionTabla): SeccionPdf {
  return {
    archivo: def.archivo,
    titulo: def.titulo,
    cantidad: (items) => def.filas(items).length,
    dibujar: ({ doc, autoTable, y }, items) => {
      autoTable(doc, {
        startY: y,
        theme: "grid",
        margin: { left: MARGEN, right: MARGEN },
        styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: AZUL, textColor: AMARILLO, fontStyle: "bold" },
        alternateRowStyles: { fillColor: FILA_ALT },
        head: [def.cabecera],
        body: def.filas(items),
        columnStyles: def.columnas,
      });
    },
  };
}

const nombreArchivo = (seccion: SeccionPdf, hoy: Date): string => {
  const dd = (n: number) => String(n).padStart(2, "0");
  const fecha = `${hoy.getFullYear()}${dd(hoy.getMonth() + 1)}${dd(hoy.getDate())}`;
  return `Boletin-${seccion.archivo}-${fecha}.pdf`;
};

export async function descargarSeccion(seccion: SeccionPdf, items: ItemBoletin[]): Promise<void> {
  if (seccion.cantidad(items) === 0) return;

  const { JsPDF, autoTable } = await loadPdfLibs();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const hoy = new Date();

  // El logo es opcional a propósito: si la red falla, el PDF igual sale.
  const logo = await fetchAsDataUrl(CMC_LOGO_SRC);
  let x = MARGEN;
  if (logo) {
    try {
      doc.addImage(logo, getImageFormat(logo), MARGEN, MARGEN, 16, 16);
      x = MARGEN + 21;
    } catch {
      // Un logo ilegible no puede impedir la descarga.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...AZUL);
  doc.text(seccion.titulo, x, MARGEN + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(CMC_NAME, x, MARGEN + 12.5);
  doc.text(CMC_SUBTITLE, x, MARGEN + 17);
  doc.text(`Emitido el ${hoy.toLocaleDateString("es-AR")}`, ancho - MARGEN, MARGEN + 7, {
    align: "right",
  });

  seccion.dibujar({ doc, autoTable, y: INICIO }, items);

  // Numeración al pie, al final: recién acá se sabe cuántas páginas salieron.
  const paginas = doc.getNumberOfPages();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(`${p} de ${paginas}`, ancho - MARGEN, alto - 8, { align: "right" });
  }

  doc.save(nombreArchivo(seccion, hoy));
}
