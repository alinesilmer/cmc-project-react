// El boletín de galenos en PDF: una ficha por obra social, en dos columnas,
// con un índice alfabético en la primera página.
//
// Es una lista de precios para imprimir o mandar: quien la recibe busca una
// obra social, no compara. Por eso va por obra social —al revés que la
// pantalla— y el índice lleva a la página de cada una.
//
// Se dibuja a mano con jsPDF y no con `jspdf-autotable`: las fichas tienen
// alto variable y se acomodan en columnas, que es justo lo que una tabla no
// hace. Primero se calcula dónde cae cada ficha y recién después se dibuja,
// porque el índice necesita los números de página antes de escribirse.

import type { jsPDF } from "jspdf";
import logoSrc from "@/website/assets/images/logoCMC-web.png";
import {
  CMC_NAME,
  CMC_SUBTITLE,
} from "@/app/pages/BoletinConsultaComun/boletinConsultaComun.constants";
import {
  fetchAsDataUrl,
  getImageFormat,
} from "@/app/pages/BoletinConsultaComun/boletinConsultaComun.helpers";
import { agruparPorCodigo } from "@/app/features/nomenclador/galenos";
import type { ItemBoletin } from "@/app/pages/BoletinMedico/boletinMedico.api";
import { moneda } from "@/app/pages/BoletinMedico/boletinMedico.formato";

type Color = [number, number, number];

const AZUL: Color = [23, 63, 112]; // $primary-blue
const AMARILLO: Color = [245, 234, 192]; // $primary-yellow-light
const TINTA: Color = [20, 35, 58];
const GRIS: Color = [100, 116, 139];
const LINEA: Color = [221, 226, 234];
const FILA_ALT: Color = [248, 250, 252];

const MARGEN = 14;
const SEPARACION = 6;
/** Lugar que se deja abajo para el pie. */
const PIE = 14;
/** Dónde arranca el contenido en las páginas que no son la primera. */
const ARRIBA = MARGEN + 9;

const ALTO_RENGLON = 5.8;
const ALTO_DETALLE = 3.2;
const ALTO_TITULO = 3.7;
const ALTO_INDICE = 4.2;
const ENTRE_FICHAS = 4;

interface Renglon {
  nombre: string;
  valor: string;
  /** Los niveles uno por uno, cuando no valen todos lo mismo. */
  detalle: string[];
}

interface Ficha {
  nro: number;
  nombre: string;
  titulo: string[];
  renglones: Renglon[];
  alto: number;
  pagina: number;
  x: number;
  y: number;
}

const nombreArchivo = (hoy: Date): string => {
  const dd = (n: number) => String(n).padStart(2, "0");
  return `Boletin-galenos-${hoy.getFullYear()}${dd(hoy.getMonth() + 1)}${dd(hoy.getDate())}.pdf`;
};

/** Las fichas con su contenido ya partido en renglones, todavía sin ubicar. */
function armarFichas(doc: jsPDF, items: ItemBoletin[], anchoFicha: number): Ficha[] {
  return items
    .filter((i) => i.galenos.length > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
    .map((item) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      const titulo = doc.splitTextToSize(item.nombre, anchoFicha - 22) as string[];

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      const renglones = agruparPorCodigo(item.galenos).map((g): Renglon => {
        const nivelado = g.niveles.length > 1;
        const distintos = g.minimo !== g.maximo;
        return {
          nombre: nivelado ? `${g.nombre} (${g.niveles.length} niveles)` : g.nombre,
          valor: distintos
            ? `${moneda.format(g.minimo)} a ${moneda.format(g.maximo)}`
            : moneda.format(g.maximo),
          detalle: distintos
            ? (doc.splitTextToSize(
                g.niveles.map((n) => `N${n.nivel} ${moneda.format(n.valor)}`).join("  ·  "),
                anchoFicha - 6
              ) as string[])
            : [],
        };
      });

      const alto =
        3 +
        titulo.length * ALTO_TITULO +
        renglones.reduce((t, r) => t + ALTO_RENGLON + r.detalle.length * ALTO_DETALLE, 0) +
        1;

      return { nro: item.nro, nombre: item.nombre, titulo, renglones, alto, pagina: 1, x: 0, y: 0 };
    });
}

/** Reparte las fichas: baja por la primera columna, sigue por la segunda y pasa de página. */
function ubicarFichas(fichas: Ficha[], desde: number, anchoFicha: number, altoPagina: number): void {
  const limite = altoPagina - PIE;
  let pagina = 1;
  let columna = 0;
  let y = desde;
  const arribaDe = (p: number) => (p === 1 ? desde : ARRIBA);

  for (const f of fichas) {
    // Una ficha que no entra en lo que queda de la columna pasa entera a la
    // siguiente: partida en dos no se sabe de qué obra social es la mitad.
    if (y + f.alto > limite && y > arribaDe(pagina)) {
      if (columna === 0) {
        columna = 1;
      } else {
        columna = 0;
        pagina += 1;
      }
      y = arribaDe(pagina);
    }
    f.pagina = pagina;
    f.x = MARGEN + columna * (anchoFicha + SEPARACION);
    f.y = y;
    y += f.alto + ENTRE_FICHAS;
  }
}

function dibujarFicha(doc: jsPDF, f: Ficha, ancho: number): void {
  const altoBarra = 3 + f.titulo.length * ALTO_TITULO;

  doc.setFillColor(...AZUL);
  doc.rect(f.x, f.y, ancho, altoBarra, "F");
  doc.setTextColor(...AMARILLO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  f.titulo.forEach((linea, i) => doc.text(linea, f.x + 2.5, f.y + 4.4 + i * ALTO_TITULO));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`N° ${f.nro}`, f.x + ancho - 2.5, f.y + 4.4, { align: "right" });

  let y = f.y + altoBarra;
  f.renglones.forEach((r, i) => {
    const alto = ALTO_RENGLON + r.detalle.length * ALTO_DETALLE;
    if (i % 2 === 1) {
      doc.setFillColor(...FILA_ALT);
      doc.rect(f.x, y, ancho, alto, "F");
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(...GRIS);
    doc.text(r.nombre, f.x + 2.5, y + 3.9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text(r.valor, f.x + ancho - 2.5, y + 3.9, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...GRIS);
    r.detalle.forEach((linea, n) => doc.text(linea, f.x + 2.5, y + ALTO_RENGLON + 1.6 + n * ALTO_DETALLE));
    y += alto;
  });

  doc.setDrawColor(...LINEA);
  doc.setLineWidth(0.2);
  doc.rect(f.x, f.y, ancho, f.alto);
}

/** Nombre recortado al ancho de su columna del índice. */
function recortar(doc: jsPDF, texto: string, ancho: number): string {
  if (doc.getTextWidth(texto) <= ancho) return texto;
  let corto = texto;
  while (corto.length > 1 && doc.getTextWidth(`${corto}...`) > ancho) corto = corto.slice(0, -1);
  return `${corto.trimEnd()}...`;
}

function dibujarIndice(doc: jsPDF, fichas: Ficha[], y: number, columnas: number, anchoUtil: number): void {
  const filas = Math.ceil(fichas.length / columnas);
  const anchoCol = (anchoUtil - (columnas - 1) * SEPARACION) / columnas;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  doc.text("ÍNDICE", MARGEN, y);

  fichas.forEach((f, i) => {
    const x = MARGEN + Math.floor(i / filas) * (anchoCol + SEPARACION);
    const yi = y + 5 + (i % filas) * ALTO_INDICE;
    const numero = String(f.pagina);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    const nombre = recortar(doc, f.nombre, anchoCol - 10);
    doc.setTextColor(...AZUL);
    doc.text(nombre, x, yi);
    doc.setTextColor(...GRIS);
    doc.text(numero, x + anchoCol, yi, { align: "right" });

    // Puntos guía entre el nombre y la página, como en un índice impreso.
    const desdeX = x + doc.getTextWidth(nombre) + 1.5;
    const hastaX = x + anchoCol - doc.getTextWidth(numero) - 1.5;
    if (hastaX > desdeX) {
      doc.setDrawColor(...GRIS);
      doc.setLineDashPattern([0.4, 1.2], 0);
      doc.setLineWidth(0.2);
      doc.line(desdeX, yi - 0.8, hastaX, yi - 0.8);
      doc.setLineDashPattern([], 0);
    }

    doc.link(x, yi - 3.2, anchoCol, ALTO_INDICE, { pageNumber: f.pagina });
  });
}

export async function descargarBoletinGalenos(items: ItemBoletin[]): Promise<void> {
  // Por `import()` dinámico: jsPDF no entra al bundle de una pantalla que casi
  // siempre sólo se lee.
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const ancho = doc.internal.pageSize.getWidth();
  const alto = doc.internal.pageSize.getHeight();
  const anchoUtil = ancho - MARGEN * 2;
  const anchoFicha = (anchoUtil - SEPARACION) / 2;
  const hoy = new Date();
  const emitido = `Emitido el ${hoy.toLocaleDateString("es-AR")}`;

  // El logo liviano del sitio (26 KB): el del panel pesa 1,9 MB y jsPDF lo
  // guarda sin comprimir, con lo que el PDF salía de más de 6 MB.
  // Es opcional a propósito: si la red falla, el boletín igual sale.
  const logo = await fetchAsDataUrl(logoSrc);

  const fichas = armarFichas(doc, items, anchoFicha);

  // Tres columnas de índice; con muchas obras sociales se suman hasta cinco
  // para que no se coma la primera página entera.
  const yIndice = MARGEN + 27;
  let columnas = 3;
  while (columnas < 5 && Math.ceil(fichas.length / columnas) * ALTO_INDICE > alto * 0.45) columnas += 1;
  const finIndice = yIndice + 5 + Math.ceil(fichas.length / columnas) * ALTO_INDICE + 3;

  ubicarFichas(fichas, finIndice, anchoFicha, alto);
  const paginas = Math.max(1, ...fichas.map((f) => f.pagina));
  for (let p = 2; p <= paginas; p++) doc.addPage();

  // ── Primera página: encabezado e índice ───────────────────────────────────
  doc.setPage(1);
  let xTitulo = MARGEN;
  if (logo) {
    try {
      const { width, height } = doc.getImageProperties(logo);
      const anchoLogo = height > 0 ? (16 * width) / height : 16;
      doc.addImage(logo, getImageFormat(logo), MARGEN, MARGEN, anchoLogo, 16);
      xTitulo = MARGEN + anchoLogo + 5;
    } catch {
      // Un logo ilegible no puede impedir la descarga.
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...AZUL);
  doc.text("Boletín de galenos", xTitulo, MARGEN + 7.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(CMC_NAME, xTitulo, MARGEN + 13);
  doc.text(emitido, ancho - MARGEN, MARGEN + 7.5, { align: "right" });
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.7);
  doc.line(MARGEN, MARGEN + 20, ancho - MARGEN, MARGEN + 20);

  dibujarIndice(doc, fichas, yIndice, columnas, anchoUtil);

  // ── Fichas ────────────────────────────────────────────────────────────────
  for (const f of fichas) {
    doc.setPage(f.pagina);
    dibujarFicha(doc, f, anchoFicha);
  }

  // ── Cabecera corrida y pie ────────────────────────────────────────────────
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);

    if (p > 1) {
      doc.text(`Boletín de galenos · ${CMC_NAME}`, MARGEN, MARGEN + 2);
      doc.text(emitido, ancho - MARGEN, MARGEN + 2, { align: "right" });
      doc.setDrawColor(...AZUL);
      doc.setLineWidth(0.5);
      doc.line(MARGEN, MARGEN + 4.5, ancho - MARGEN, MARGEN + 4.5);
    }

    doc.setDrawColor(...LINEA);
    doc.setLineWidth(0.2);
    doc.line(MARGEN, alto - 11, ancho - MARGEN, alto - 11);
    doc.text(CMC_SUBTITLE, MARGEN, alto - 7);
    doc.text(`${p} de ${paginas}`, ancho - MARGEN, alto - 7, { align: "right" });
  }

  doc.save(nombreArchivo(hoy));
}
