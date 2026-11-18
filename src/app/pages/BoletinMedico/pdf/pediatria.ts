import type { jsPDF } from "jspdf";
import { formatoPesos } from "@/app/shared/lib/formatos";
import { fitText } from "@/app/shared/lib/documentos/pdfColegio";
import type { ItemBoletin } from "../boletinMedico.api";
import { NOTA_COPAGO } from "../boletinPediatria";
import { AZUL, GRIS, MARGEN, type Lienzo, type Rgb, type SeccionPdf } from "./base";

// Las tarjetas de la pantalla: una por obra social, con su cabecera azul y los códigos debajo.
const CREMA: Rgb = [246, 239, 217];
const AMARILLO: Rgb = [250, 240, 200];
const BORDE: Rgb = [226, 232, 240];
const ZEBRA: Rgb = [248, 250, 252];
const TEXTO: Rgb = [71, 85, 105];
// El mismo amarillo oscuro de la leyenda del copago en pantalla.
const AMARILLO_OSCURO: Rgb = [180, 128, 31];

const COLUMNAS = 2;
const SEPARACION = 6;
const ALTO_CABECERA = 9;
const RELLENO = 4;
const ANCHO_CODIGO = 12;
const INTERLINEA = 3.7;
const PADDING_FILA = 1.8;
const PIE_PAGINA = 16;
const INTERLINEA_NOTA = 3.2;

interface FilaMedida {
  codigo: string;
  lineas: string[];
  /** La leyenda del copago, en letra chica bajo el nombre; vacía si no aplica. */
  nota: string[];
  monto: string;
  alto: number;
}

interface TarjetaMedida {
  item: ItemBoletin;
  filas: FilaMedida[];
  alto: number;
}

/** El nombre de cada práctica puede ocupar más de un renglón: se mide antes de dibujar para que la tarjeta no se parta. */
function medir(doc: jsPDF, item: ItemBoletin, ancho: number): TarjetaMedida {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  const montos = item.pediatria.map((v) => formatoPesos.format(v.valor));
  const anchoMonto = Math.max(...montos.map((m) => doc.getTextWidth(m)));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const anchoNombre = ancho - RELLENO * 2 - ANCHO_CODIGO - anchoMonto - 3;

  const filas = item.pediatria.map<FilaMedida>((v, n) => {
    const lineas = doc.splitTextToSize(v.nombre, anchoNombre) as string[];
    doc.setFontSize(7);
    const nota = v.conCopago ? (doc.splitTextToSize(NOTA_COPAGO, anchoNombre) as string[]) : [];
    doc.setFontSize(8.5);
    return {
      codigo: v.codigo,
      lineas,
      nota,
      monto: montos[n],
      alto: lineas.length * INTERLINEA + nota.length * INTERLINEA_NOTA + PADDING_FILA * 2,
    };
  });

  return { item, filas, alto: ALTO_CABECERA + filas.reduce((s, f) => s + f.alto, 0) + 1 };
}

function dibujarTarjeta(doc: jsPDF, t: TarjetaMedida, x: number, y: number, ancho: number, alto: number) {
  // Fondo y borde de toda la tarjeta; la cabecera se pinta encima con las esquinas de arriba redondeadas.
  doc.setDrawColor(...BORDE);
  doc.setLineWidth(0.3);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, ancho, alto, 2.5, 2.5, "FD");

  doc.setFillColor(...AZUL);
  doc.roundedRect(x, y, ancho, ALTO_CABECERA, 2.5, 2.5, "F");
  doc.rect(x, y + ALTO_CABECERA / 2, ancho, ALTO_CABECERA / 2, "F");

  // El número, en una píldora amarilla a la derecha.
  const nro = String(t.item.nro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const anchoPildora = doc.getTextWidth(nro) + 5;
  doc.setFillColor(...AMARILLO);
  doc.roundedRect(x + ancho - RELLENO - anchoPildora, y + 2, anchoPildora, 5, 2.5, 2.5, "F");
  doc.setTextColor(...AZUL);
  doc.text(nro, x + ancho - RELLENO - anchoPildora / 2, y + 5.5, { align: "center" });

  doc.setFontSize(9.5);
  doc.setTextColor(...CREMA);
  doc.text(fitText(doc, t.item.nombre, ancho - RELLENO * 2 - anchoPildora - 3), x + RELLENO, y + 5.9);

  let yFila = y + ALTO_CABECERA;
  t.filas.forEach((f, n) => {
    if (n % 2 === 1) {
      doc.setFillColor(...ZEBRA);
      doc.rect(x + 0.15, yFila, ancho - 0.3, f.alto, "F");
    }
    const base = yFila + PADDING_FILA + 2.6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRIS);
    doc.text(f.codigo, x + RELLENO, base);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...TEXTO);
    f.lineas.forEach((linea, l) => doc.text(linea, x + RELLENO + ANCHO_CODIGO, base + l * INTERLINEA));

    if (f.nota.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...AMARILLO_OSCURO);
      const yNota = base + (f.lineas.length - 1) * INTERLINEA + INTERLINEA_NOTA;
      f.nota.forEach((linea, l) => doc.text(linea, x + RELLENO + ANCHO_CODIGO, yNota + l * INTERLINEA_NOTA));
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...AZUL);
    doc.text(f.monto, x + ancho - RELLENO, base, { align: "right" });

    yFila += f.alto;
  });
}

export const pediatria: SeccionPdf = {
  archivo: "pediatria",
  titulo: "Valores de pediatría",
  cantidad: (items) => items.filter((i) => i.pediatria.length > 0).length,
  dibujar: ({ doc, y }: Lienzo, items) => {
    const ancho = (doc.internal.pageSize.getWidth() - MARGEN * 2 - SEPARACION * (COLUMNAS - 1)) / COLUMNAS;
    const limite = doc.internal.pageSize.getHeight() - PIE_PAGINA;
    const tarjetas = items.filter((i) => i.pediatria.length > 0).map((i) => medir(doc, i, ancho));

    let yBanda = y;
    for (let i = 0; i < tarjetas.length; i += COLUMNAS) {
      const banda = tarjetas.slice(i, i + COLUMNAS);
      // Las tarjetas de una misma fila igualan su alto, como en la grilla de pantalla.
      const alto = Math.max(...banda.map((t) => t.alto));

      if (yBanda + alto > limite) {
        doc.addPage();
        yBanda = MARGEN;
      }
      banda.forEach((t, c) => dibujarTarjeta(doc, t, MARGEN + c * (ancho + SEPARACION), yBanda, ancho, alto));
      yBanda += alto + SEPARACION;
    }
  },
};
