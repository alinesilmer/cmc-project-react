import type { Beneficio } from "./beneficios.types";
// Capturas del instructivo "¿Dónde encuentro mi credencial?".
import guia1 from "../../assets/crede.png";
import guia2 from "../../assets/crede2.png";
import guia3 from "../../assets/crede3.png";
import {
  A4, ANCHO_UTIL, COLOR, MARGEN,
  altoParrafo, chip, degradeVertical, fill, fuente, parrafo,
  rectPunteado, recortar, stroke, tinta,
} from "./revistaDraw";

/**
 * Revista de Beneficios en PDF, generada con jsPDF.
 *
 * Se dibuja con primitivas en vez de rasterizar HTML (html2canvas): el texto
 * queda vectorial —nítido al imprimir, seleccionable y buscable— y el archivo
 * pesa una fracción. A cambio hay que llevar las coordenadas a mano, que es
 * lo que hace `revistaDraw.ts`.
 *
 * Tres partes: tapa, instructivo de la credencial y catálogo por categoría.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Doc = any;

const PIE_Y = A4.alto - 14;
const TOPE_CONTENIDO = A4.alto - 22; // por debajo de esto, salto de página

const escapar = (s: unknown) => String(s ?? "").replace(/\s+/g, " ").trim();

async function cargarJsPdf() {
  const mod: any = await import("jspdf");
  return mod?.jsPDF ?? mod?.default ?? mod;
}

/** Ancho al que se reducen las capturas antes de incrustarlas. */
const ANCHO_GUIA_PX = 900;

async function comoDataUrl(src: string, maxAncho?: number): Promise<string | null> {
  try {
    if (!src) return null;
    const crudo = src.startsWith("data:image/") ? src : await descargar(src);
    if (!crudo) return null;
    return maxAncho ? await reducir(crudo, maxAncho) : crudo;
  } catch {
    return null;
  }
}

async function descargar(src: string): Promise<string | null> {
  const res = await fetch(src, { cache: "force-cache" });
  if (!res.ok) return null;
  const blob = await res.blob();
  return new Promise<string | null>((ok) => {
    const r = new FileReader();
    r.onloadend = () => ok(typeof r.result === "string" ? r.result : null);
    r.onerror = () => ok(null);
    r.readAsDataURL(blob);
  });
}

/**
 * Reduce una captura y la reencoda a JPEG antes de meterla en el PDF.
 *
 * Las tres capturas de la guía pesan 1,5 MB en origen; incrustadas tal cual
 * convertirían un PDF de 25 KB en uno de varios MB, para imprimirlas a 56 mm
 * de ancho. A 900 px eso son ~400 dpi —más de lo que resuelve cualquier
 * impresora— y en JPEG 90 el conjunto baja a ~150 KB sin diferencia visible.
 *
 * Si no hay DOM (pruebas en Node) devuelve la original: el PDF sale más
 * pesado, no roto.
 */
function reducir(dataUrl: string, maxAncho: number): Promise<string> {
  return new Promise((ok) => {
    if (typeof document === "undefined") { ok(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      if (img.width <= maxAncho) { ok(dataUrl); return; }
      const lienzo = document.createElement("canvas");
      lienzo.width = maxAncho;
      lienzo.height = Math.round((img.height * maxAncho) / img.width);
      const ctx = lienzo.getContext("2d");
      if (!ctx) { ok(dataUrl); return; }
      ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      ok(lienzo.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => ok(dataUrl);
    img.src = dataUrl;
  });
}

function agrupar(items: Beneficio[]): [string, Beneficio[]][] {
  const mapa = new Map<string, Beneficio[]>();
  for (const b of items) {
    mapa.set(b.categoria, [...(mapa.get(b.categoria) ?? []), b]);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "es"))
    .map(([cat, lista]) => [
      cat,
      lista.sort((x, y) => x.titulo.localeCompare(y.titulo, "es")),
    ]);
}

const hexARgb = (hex: string | null): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex ?? ""));
  if (!m) return COLOR.turquesa;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// ── Tapa ─────────────────────────────────────────────────────────────────────

function dibujarTapa(doc: Doc, logo: string | null, edicion: string) {
  degradeVertical(doc, 0, 0, A4.ancho, A4.alto, COLOR.azul, COLOR.azulProfundo);

  // Círculo de agua, apenas más claro que el fondo.
  fill(doc, [28, 70, 122]);
  doc.circle(A4.ancho + 10, 30, 85, "F");

  if (logo) {
    try { doc.addImage(logo, "PNG", (A4.ancho - 52) / 2, 62, 52, 52); } catch { /* sin logo */ }
  }

  fuente(doc, 9, true);
  tinta(doc, COLOR.doradoClaro);
  doc.text("COLEGIO MÉDICO DE CORRIENTES", A4.ancho / 2, 130, {
    align: "center", charSpace: 0.8,
  });

  fuente(doc, 38, true);
  tinta(doc, COLOR.blanco);
  doc.text("Red de", A4.ancho / 2, 152, { align: "center" });
  tinta(doc, COLOR.turquesa);
  doc.text("Beneficios", A4.ancho / 2, 168, { align: "center" });

  parrafo(
    doc,
    "Descuentos, promociones y ventajas exclusivas para los médicos asociados y su grupo familiar.",
    (A4.ancho - 110) / 2, 180, 110,
    { pt: 11, color: [200, 214, 230], align: "center", interlineado: 1.45 }
  );

  fuente(doc, 9, false);
  tinta(doc, [150, 170, 195]);
  doc.text(`EDICIÓN ${edicion.toUpperCase()}`, A4.ancho / 2, A4.alto - 22, {
    align: "center", charSpace: 0.6,
  });
}

// ── Encabezado y pie de las páginas interiores ───────────────────────────────

function dibujarCabecera(doc: Doc, logo: string | null, derecha: string) {
  if (logo) {
    try { doc.addImage(logo, "PNG", MARGEN, 12, 14, 14); } catch { /* sin logo */ }
  }
  const x = MARGEN + (logo ? 18 : 0);
  fuente(doc, 11, true);
  tinta(doc, COLOR.azulProfundo);
  doc.text("Colegio Médico", x, 17, { baseline: "top" });
  fuente(doc, 7.5, true);
  tinta(doc, COLOR.turquesa);
  doc.text("DE CORRIENTES", x, 22.5, { baseline: "top", charSpace: 0.4 });

  // Alineado a la derecha a mano: con `align:"right"` jsPDF mide el texto sin
  // contar el `charSpace`, así que la cadena se dibuja más ancha de lo que
  // calculó y se pasa del margen.
  fuente(doc, 7.5, true);
  tinta(doc, COLOR.textoSuave);
  const etiqueta = derecha.toUpperCase();
  const anchoEtiqueta = doc.getTextWidth(etiqueta) + 0.4 * (etiqueta.length - 1);
  doc.text(etiqueta, A4.ancho - MARGEN - anchoEtiqueta, 21, { charSpace: 0.4 });

  stroke(doc, COLOR.grisBorde);
  doc.setLineWidth(0.3);
  doc.line(MARGEN, 29, A4.ancho - MARGEN, 29);
}

function dibujarPie(doc: Doc, izquierda: string, derecha: string) {
  stroke(doc, COLOR.grisBorde);
  doc.setLineWidth(0.3);
  doc.line(MARGEN, PIE_Y - 4, A4.ancho - MARGEN, PIE_Y - 4);
  fuente(doc, 7.5, false);
  tinta(doc, COLOR.textoSuave);
  doc.text(izquierda, MARGEN, PIE_Y);
  doc.text(derecha, A4.ancho - MARGEN, PIE_Y, { align: "right" });
}

// ── Instructivo ──────────────────────────────────────────────────────────────

function dibujarAviso(doc: Doc, y: number): number {
  const alto = 44;
  fill(doc, COLOR.azulProfundo);
  doc.roundedRect(MARGEN, y, ANCHO_UTIL, alto, 1.2, 1.2, "F");

  fuente(doc, 7.5, true);
  tinta(doc, COLOR.doradoClaro);
  doc.text("IMPORTANTE", MARGEN + 9, y + 10, { charSpace: 0.7 });

  fuente(doc, 17, true);
  tinta(doc, COLOR.blanco);
  doc.text("Para acceder a cualquier beneficio", MARGEN + 9, y + 19, { baseline: "top" });
  doc.text("presentá tu credencial y tu DNI", MARGEN + 9, y + 27.5, { baseline: "top" });

  parrafo(
    doc,
    "Los comercios adheridos verifican que seas socio del Colegio antes de aplicar el descuento.",
    MARGEN + 9, y + 37, ANCHO_UTIL - 18,
    { pt: 9, color: [180, 200, 220] }
  );

  return y + alto + 11;
}

function tituloSeccion(doc: Doc, texto: string, y: number): number {
  fuente(doc, 13, true);
  tinta(doc, COLOR.azulProfundo);
  doc.text(texto, MARGEN, y, { baseline: "top" });
  const ancho = doc.getTextWidth(texto);
  stroke(doc, COLOR.grisBorde);
  doc.setLineWidth(0.3);
  doc.line(MARGEN + ancho + 4, y + 3, A4.ancho - MARGEN, y + 3);
  return y + 9;
}

const PASOS = [
  ["Entrá a tu perfil", "Ingresá con tu usuario a la app del Colegio o al portal del socio desde la web."],
  ["Abrí \"Mi Credencial\"", "Vas a ver tu credencial digital con tu nombre, especialidad, DNI y estado de socio."],
  ["Mostrala en el comercio", "Presentala junto con tu DNI antes de pagar. También podés descargarla en PDF."],
];

function dibujarPasos(doc: Doc, y: number): number {
  const gap = 5;
  const w = (ANCHO_UTIL - gap * 2) / 3;
  const alto = 34;

  PASOS.forEach(([titulo, texto], i) => {
    const x = MARGEN + i * (w + gap);
    fill(doc, COLOR.gris);
    doc.roundedRect(x, y, w, alto, 1.2, 1.2, "F");
    fill(doc, COLOR.turquesa);
    doc.rect(x, y, w, 0.9, "F");

    fill(doc, COLOR.azulProfundo);
    doc.circle(x + 6, y + 9, 3.2, "F");
    fuente(doc, 8.5, true);
    tinta(doc, COLOR.blanco);
    doc.text(String(i + 1), x + 6, y + 9, { align: "center", baseline: "middle" });

    parrafo(doc, titulo, x + 4.5, y + 14.5, w - 9, { pt: 9.5, negrita: true, color: COLOR.azulProfundo });
    parrafo(doc, texto, x + 4.5, y + 20.5, w - 9, { pt: 7.5, color: COLOR.textoSuave, interlineado: 1.3 });
  });

  return y + alto + 11;
}

/** Proporción de las capturas (900×636). Se fija para que las tres queden
 *  exactamente iguales aunque alguna se reemplace por otra ligeramente distinta. */
const RATIO_GUIA = 900 / 636;

function dibujarGuias(doc: Doc, y: number, capturas: (string | null)[]): number {
  const gap = 5;
  const w = (ANCHO_UTIL - gap * 2) / 3;
  const alto = w / RATIO_GUIA;

  for (let i = 0; i < 3; i++) {
    const x = MARGEN + i * (w + gap);
    const captura = capturas[i];

    if (captura) {
      try {
        doc.addImage(captura, "JPEG", x, y, w, alto);
      } catch {
        rectPunteado(doc, x, y, w, alto);
      }
      // Filete alrededor: sin él la captura se funde con el papel y no se lee
      // como una pantalla.
      stroke(doc, COLOR.grisBorde);
      doc.setLineWidth(0.3);
      doc.rect(x, y, w, alto, "S");
    } else {
      rectPunteado(doc, x, y, w, alto);
    }

    fuente(doc, 8.5, true);
    tinta(doc, COLOR.azulProfundo);
    doc.text(`Paso ${i + 1}`, x + w / 2, y + alto + 4.5, { align: "center" });
  }

  return y + alto + 8;
}

// ── Catálogo ─────────────────────────────────────────────────────────────────

const ANCHO_TARJETA = (ANCHO_UTIL - 5) / 2;

function altoTarjeta(doc: Doc, b: Beneficio): number {
  const wTexto = ANCHO_TARJETA - 11;
  return 9 + altoParrafo(doc, escapar(b.descripcion), wTexto, 8, 1.35)
    + (b.ubicacion ? 5 : 0) + 7;
}

function dibujarTarjeta(doc: Doc, b: Beneficio, x: number, y: number, alto: number) {
  const acento = hexARgb(b.color);

  stroke(doc, COLOR.grisBorde);
  doc.setLineWidth(0.3);
  fill(doc, COLOR.blanco);
  doc.roundedRect(x, y, ANCHO_TARJETA, alto, 1.2, 1.2, "FD");
  // Franja del color del beneficio, sobre el borde izquierdo.
  fill(doc, acento);
  doc.rect(x, y + 0.6, 1.1, alto - 1.2, "F");

  const xt = x + 5;
  const wt = ANCHO_TARJETA - 11;

  // El chip del descuento se reserva su lugar para que el título no lo pise.
  let wTitulo = wt;
  if (b.descuento) {
    fuente(doc, 8.5, true);
    const wChip = doc.getTextWidth(escapar(b.descuento)) + 4.4;
    chip(doc, escapar(b.descuento), x + ANCHO_TARJETA - 5 - wChip, y + 4, acento, COLOR.blanco, 8.5);
    wTitulo = wt - wChip - 3;
  }

  fuente(doc, 10, true);
  tinta(doc, COLOR.azulProfundo);
  doc.text(recortar(doc, escapar(b.titulo), wTitulo), xt, y + 5, { baseline: "top" });

  let yy = parrafo(doc, escapar(b.descripcion), xt, y + 11.5, wt, {
    pt: 8, color: COLOR.textoSuave, interlineado: 1.35,
  });

  if (b.ubicacion) {
    yy += 1.2;
    fill(doc, COLOR.turquesa);
    doc.circle(xt + 1, yy + 1.3, 0.9, "F");
    fuente(doc, 7.5, false);
    tinta(doc, COLOR.textoSuave);
    doc.text(recortar(doc, escapar(b.ubicacion), wt - 4), xt + 3.5, yy, { baseline: "top" });
  }
}

// ── Documento completo ───────────────────────────────────────────────────────

export async function generarRevistaPdf(
  beneficios: Beneficio[],
  logoSrc: string
): Promise<Blob> {
  const [JsPDF, logo, ...capturas] = await Promise.all([
    cargarJsPdf(),
    comoDataUrl(logoSrc),
    // En paralelo: cada una descarga, reduce y reencoda por su cuenta.
    ...[guia1, guia2, guia3].map((src) => comoDataUrl(src, ANCHO_GUIA_PX)),
  ]);

  const vigentes = beneficios.filter((b) => b.activo);
  const grupos = agrupar(vigentes);
  const ahora = new Date();
  const edicion = ahora.toLocaleDateString("es-AR", { month: "long", year: "numeric" });

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.setProperties({
    title: "Red de Beneficios · Colegio Médico de Corrientes",
    author: "Colegio Médico de Corrientes",
  });

  // 1) Tapa
  dibujarTapa(doc, logo, edicion);

  // 2) Instructivo
  doc.addPage();
  dibujarCabecera(doc, logo, "Red de Beneficios");
  let y = dibujarAviso(doc, 36);
  y = tituloSeccion(doc, "¿Dónde encuentro mi credencial?", y);
  y = parrafo(
    doc,
    "Es digital: la llevás en el celular y la mostrás desde la pantalla. No hace falta imprimirla.",
    MARGEN, y, ANCHO_UTIL, { pt: 9, color: COLOR.textoSuave }
  ) + 5;
  y = dibujarPasos(doc, y);
  y = tituloSeccion(doc, "Guía paso a paso", y) + 2;
  dibujarGuias(doc, y, capturas);
  dibujarPie(doc, "Colegio Médico de Corrientes · Red de Beneficios", "Presentá credencial y DNI");

  // 3) Catálogo
  doc.addPage();
  const cuenta = `${vigentes.length} beneficio${vigentes.length === 1 ? "" : "s"} vigente${vigentes.length === 1 ? "" : "s"}`;
  dibujarCabecera(doc, logo, cuenta);
  y = 36;

  const nuevaPagina = () => {
    dibujarPie(doc, `Colegio Médico de Corrientes · Edición ${edicion}`, `Sujeto a modificaciones · ${ahora.getFullYear()}`);
    doc.addPage();
    dibujarCabecera(doc, logo, cuenta);
    return 36;
  };

  if (vigentes.length === 0) {
    parrafo(doc, "Todavía no hay beneficios cargados.", MARGEN, y + 20, ANCHO_UTIL, {
      pt: 11, color: COLOR.textoSuave, align: "center",
    });
  }

  for (const [categoria, lista] of grupos) {
    // Un título de categoría no puede quedar solo al pie de la hoja.
    if (y + 24 > TOPE_CONTENIDO) y = nuevaPagina();

    fuente(doc, 11.5, true);
    tinta(doc, COLOR.azulProfundo);
    doc.text(categoria, MARGEN, y, { baseline: "top" });
    const wCat = doc.getTextWidth(categoria);
    chip(doc, String(lista.length), MARGEN + wCat + 3, y - 0.6, [232, 244, 248], COLOR.turquesa, 7.5);
    stroke(doc, COLOR.grisBorde);
    doc.setLineWidth(0.3);
    doc.line(MARGEN + wCat + 14, y + 2.6, A4.ancho - MARGEN, y + 2.6);
    y += 8;

    // De a dos: se mide la fila entera y se salta antes de dibujar, así ninguna
    // tarjeta queda partida entre dos hojas.
    for (let i = 0; i < lista.length; i += 2) {
      const fila = lista.slice(i, i + 2);
      const alto = Math.max(...fila.map((b) => altoTarjeta(doc, b)));
      if (y + alto > TOPE_CONTENIDO) y = nuevaPagina();
      fila.forEach((b, k) => {
        dibujarTarjeta(doc, b, MARGEN + k * (ANCHO_TARJETA + 5), y, alto);
      });
      y += alto + 4;
    }
    y += 4;
  }

  dibujarPie(doc, `Colegio Médico de Corrientes · Edición ${edicion}`, `Sujeto a modificaciones · ${ahora.getFullYear()}`);

  return doc.output("blob") as Blob;
}
