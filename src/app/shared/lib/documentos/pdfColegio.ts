import { CMC_EMAIL, CMC_NAME, CMC_PHONE, getImageFormat } from "./institucion";
import { pagina } from "@/app/shared/lib/utiles";

export async function loadPdfLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const [jspdfMod, autotableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const JsPDF = jspdfMod?.jsPDF ?? jspdfMod?.default ?? jspdfMod;
  const autoTable = autotableMod?.default ?? autotableMod;
  return { JsPDF, autoTable };
}

export type Rgb = [number, number, number];

// Los colores del Colegio, los mismos de la portada.
export const AZUL: Rgb = [23, 63, 112];
export const CREMA: Rgb = [245, 239, 224];
export const AMARILLO: Rgb = [247, 233, 170];
/** Cabecera de la tabla: un azul más profundo que el fondo. */
const AZUL_OSCURO: Rgb = [12, 42, 82];
// Las hojas con tabla son blancas: el azul a página llena queda sólo para la portada y el índice, que son una o dos hojas.
const BLANCO: Rgb = [255, 255, 255];
const BANDA: Rgb = [241, 245, 249];
const TINTA: Rgb = [15, 23, 42];
const GRIS: Rgb = [100, 116, 139];
const FILETE: Rgb = [203, 213, 225];

/** Radio de las esquinas de la tabla, en mm. */
const RADIO = 3;

export const TW = 269;
export const MARGEN = 14;
export const HEADER_H = 30;

/** Con muchas columnas hay que achicar la letra o el texto se parte demasiado. */
export function tableStyles(n: number) {
  const fontSize = n >= 12 ? 6 : n >= 10 ? 6.5 : n >= 8 ? 7 : 7.5;
  return {
    // Sin grilla: filas blancas y gris claro alternadas.
    theme: "plain" as const,
    styles: {
      font: "helvetica",
      fontSize,
      textColor: TINTA,
      fillColor: BLANCO,
      cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 },
      valign: "middle" as const,
      overflow: "linebreak" as const,
    },
    headStyles: {
      fillColor: AZUL_OSCURO,
      textColor: CREMA,
      fontStyle: "bold" as const,
      fontSize,
      cellPadding: { top: 4, bottom: 4, left: 2.5, right: 2.5 },
    },
    alternateRowStyles: { fillColor: BANDA },
  };
}

/** Rótulo chico en mayúscula; `alto` = renglón de arriba, más tenue. */
export function rotulo(
  doc: any, texto: string, x: number, y: number,
  align: "left" | "right", tenue = false, color: Rgb = CREMA,
) {
  doc.setFont("helvetica", tenue ? "normal" : "bold");
  doc.setFontSize(tenue ? 6.5 : 7.5);
  doc.setTextColor(...color);
  doc.text(texto.toUpperCase(), x, y, { align, charSpace: 0.25 });
}

/** Encabezado de cada hoja de listado, sobre blanco: los mismos rótulos y el título en Times de la portada, pero en azul. */
export function pintarFranja(doc: any, logo: string | null, osName: string, titulo: string, detalle: string) {
  const w = doc.internal.pageSize.getWidth();

  let x = MARGEN;
  if (logo) {
    try {
      // El logo es de 2:3; se respeta la proporción.
      doc.addImage(logo, getImageFormat(logo), MARGEN, 6, 12, 18);
      x = MARGEN + 17;
    } catch { /* sin logo el encabezado se ve igual de bien */ }
  }

  rotulo(doc, CMC_NAME, x, 11, "left", false, AZUL);
  rotulo(doc, fitText(doc, osName.toUpperCase(), w / 2), w - MARGEN, 11, "right", false, AZUL);

  doc.setTextColor(...AZUL);
  doc.setFont("times", "normal"); doc.setFontSize(22);
  doc.text(fitText(doc, titulo, w - x - 80), x, 24);
  rotulo(doc, detalle, w - MARGEN, 24, "right", true, GRIS);

  // Un filete separa el encabezado de la tabla, como los renglones del índice.
  doc.setDrawColor(...AZUL); doc.setLineWidth(0.25);
  doc.line(MARGEN, HEADER_H, w - MARGEN, HEADER_H);
}

/** Redondea las esquinas de la tabla. autoTable sólo dibuja rectángulos, así que se tapa cada esquina con una cuña blanca. */
export function redondearTabla(doc: any, y0: number, y1: number) {
  const x0 = MARGEN;
  const x1 = MARGEN + TW;
  const r = RADIO;
  // Distancia de los puntos de control de una curva que imita un cuarto de círculo.
  const k = r * 0.5523;

  doc.setFillColor(...BLANCO);
  // [esquina x, esquina y, sentido horizontal, sentido vertical]
  const esquinas: [number, number, number, number][] = [
    [x0, y0, 1, 1], [x1, y0, -1, 1], [x1, y1, -1, -1], [x0, y1, 1, -1],
  ];
  for (const [x, y, sx, sy] of esquinas) {
    // Desde el borde vertical: va a la esquina, corre por el borde horizontal y vuelve por el arco.
    doc.lines(
      [
        [0, -r * sy],
        [r * sx, 0],
        [-k * sx, 0, -r * sx, (r - k) * sy, -r * sx, r * sy],
      ],
      x, y + r * sy, [1, 1], "F", true,
    );
  }

  doc.setDrawColor(...FILETE); doc.setLineWidth(0.2);
  doc.roundedRect(x0, y0, TW, y1 - y0, r, r, "S");
}

/** Pie de las hojas de listado: contacto a la izquierda, "\02 de \14" a la derecha. */
export function pintarPies(doc: any, desde: number) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const total: number = doc.internal.getNumberOfPages();

  for (let n = desde; n <= total; n++) {
    doc.setPage(n);
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.2);
    doc.line(MARGEN, h - 11, w - MARGEN, h - 11);

    doc.setFont("helvetica", "normal"); doc.setFontSize(6.5); doc.setTextColor(...GRIS);
    doc.text(`${CMC_NAME}  ·  ${CMC_PHONE}  ·  ${CMC_EMAIL}`, MARGEN, h - 6.5);

    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...AZUL);
    doc.text(`${pagina(n)}  de  ${pagina(total)}`, w - MARGEN, h - 6.5, { align: "right" });
  }
}

/** Truncate text so it fits within maxW mm at the current font size. */
export function fitText(doc: any, text: string, maxW: number): string {
  if (doc.getTextWidth(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.getTextWidth(t + "…") > maxW) t = t.slice(0, -1);
  return t + "…";
}

export const margenTabla = { left: MARGEN, right: MARGEN, top: HEADER_H + 5, bottom: 16 };
