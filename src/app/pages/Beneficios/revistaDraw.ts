/**
 * Primitivas de dibujo de la revista de beneficios.
 *
 * Separadas del armado de páginas para que `revistaPdf.ts` se lea como el
 * índice de la revista y no como una lista de coordenadas.
 *
 * Todo va en milímetros y en jsPDF nativo: nada de rasterizar HTML. El texto
 * sale vectorial —se puede seleccionar, buscar e imprimir nítido a cualquier
 * tamaño— que es justamente lo que se pierde con html2canvas.
 */

export type RGB = [number, number, number];

export const A4 = { ancho: 210, alto: 297 } as const;
export const MARGEN = 15;
export const ANCHO_UTIL = A4.ancho - MARGEN * 2;

export const COLOR = {
  azul: [23, 63, 112] as RGB,
  azulProfundo: [13, 39, 71] as RGB,
  turquesa: [30, 147, 176] as RGB,
  doradoClaro: [242, 226, 168] as RGB,
  texto: [34, 46, 60] as RGB,
  textoSuave: [92, 108, 125] as RGB,
  grisBorde: [220, 228, 238] as RGB,
  gris: [243, 246, 250] as RGB,
  blanco: [255, 255, 255] as RGB,
  placeholder: [182, 196, 212] as RGB,
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = any;

export function fill(doc: Doc, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
export function stroke(doc: Doc, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
export function tinta(doc: Doc, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

export function fuente(doc: Doc, pt: number, negrita = false) {
  doc.setFont("helvetica", negrita ? "bold" : "normal");
  doc.setFontSize(pt);
}

/** pt → mm, para calcular alturas de renglón a partir del cuerpo tipográfico. */
export const pt = (v: number) => v * 0.3528;

/**
 * Degradé vertical por bandas.
 *
 * jsPDF no expone degradados, así que se pintan tiras de 1 mm interpolando el
 * color. A esa altura la banda es invisible y el resultado es indistinguible
 * de un degradé real, sin incrustar una imagen de fondo.
 */
export function degradeVertical(
  doc: Doc, x: number, y: number, w: number, h: number, desde: RGB, hasta: RGB
) {
  const pasos = Math.max(1, Math.ceil(h));
  const alto = h / pasos;
  for (let i = 0; i < pasos; i++) {
    const t = i / (pasos - 1 || 1);
    fill(doc, [
      Math.round(desde[0] + (hasta[0] - desde[0]) * t),
      Math.round(desde[1] + (hasta[1] - desde[1]) * t),
      Math.round(desde[2] + (hasta[2] - desde[2]) * t),
    ]);
    // +0.3 de solape: sin eso quedan hilos blancos entre banda y banda.
    doc.rect(x, y + i * alto, w, alto + 0.3, "F");
  }
}

/** Rectángulo de borde punteado, para los espacios de imagen de la guía. */
export function rectPunteado(
  doc: Doc, x: number, y: number, w: number, h: number, radio = 1
) {
  stroke(doc, COLOR.grisBorde);
  doc.setLineWidth(0.4);
  doc.setLineDashPattern([1.4, 1.2], 0);
  doc.roundedRect(x, y, w, h, radio, radio, "S");
  doc.setLineDashPattern([], 0);
}

/** Escribe texto con ajuste de línea y devuelve la Y donde terminó. */
export function parrafo(
  doc: Doc,
  texto: string,
  x: number,
  y: number,
  ancho: number,
  opciones: { pt?: number; negrita?: boolean; color?: RGB; interlineado?: number; align?: "left" | "center" } = {}
): number {
  const cuerpo = opciones.pt ?? 9;
  const alto = pt(cuerpo) * (opciones.interlineado ?? 1.35);
  fuente(doc, cuerpo, opciones.negrita);
  tinta(doc, opciones.color ?? COLOR.texto);
  const lineas: string[] = doc.splitTextToSize(texto, ancho);
  lineas.forEach((linea, i) => {
    const px = opciones.align === "center" ? x + ancho / 2 : x;
    doc.text(linea, px, y + i * alto, {
      baseline: "top",
      align: opciones.align ?? "left",
    });
  });
  return y + lineas.length * alto;
}

/** Alto que ocuparía `parrafo` sin dibujarlo — para decidir saltos de página. */
export function altoParrafo(
  doc: Doc, texto: string, ancho: number, cuerpo = 9, interlineado = 1.35
): number {
  fuente(doc, cuerpo, false);
  const lineas: string[] = doc.splitTextToSize(texto, ancho);
  return lineas.length * pt(cuerpo) * interlineado;
}

/** Recorta un texto a `ancho` agregando puntos suspensivos. */
export function recortar(doc: Doc, texto: string, ancho: number): string {
  if (doc.getTextWidth(texto) <= ancho) return texto;
  let t = texto;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > ancho) t = t.slice(0, -1);
  return `${t}…`;
}

/** Chip redondeado con texto centrado; devuelve el ancho que ocupó. */
export function chip(
  doc: Doc, texto: string, x: number, y: number,
  fondo: RGB, color: RGB, cuerpo = 8
): number {
  fuente(doc, cuerpo, true);
  const alto = pt(cuerpo) + 2.6;
  const ancho = doc.getTextWidth(texto) + 4.4;
  fill(doc, fondo);
  doc.roundedRect(x, y, ancho, alto, 0.9, 0.9, "F");
  tinta(doc, color);
  doc.text(texto, x + ancho / 2, y + alto / 2, {
    baseline: "middle",
    align: "center",
  });
  return ancho;
}
