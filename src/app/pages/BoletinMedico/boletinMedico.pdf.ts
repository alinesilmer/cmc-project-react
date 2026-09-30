// El boletín del socio, en un solo PDF.
//
// Un botón y un archivo con todo: valor de consulta, galenos y observaciones,
// uno detrás del otro. Separarlo en tres descargas obligaría al médico a
// juntarlas después, y lo que necesita llevarse es el boletín completo.
//
// Se exporta lo que la pantalla tiene cargado —el catálogo entero, no el
// resultado de la búsqueda—: el archivo es el boletín, no un recorte de lo que
// alguien estaba mirando cuando apretó el botón.
//
// Las tres secciones son tablas de `jspdf-autotable`, que es lo que ya usa el
// resto del panel para exportar. Se carga por `import()` dinámico para no
// sumar jsPDF al bundle de una pantalla que casi siempre sólo se lee.

import {
  CMC_NAME,
  CMC_SUBTITLE,
  CMC_LOGO_SRC,
} from "@/app/pages/BoletinConsultaComun/boletinConsultaComun.constants";
import {
  fetchAsDataUrl,
  getImageFormat,
} from "@/app/pages/BoletinConsultaComun/boletinConsultaComun.helpers";
import {
  agruparPorCodigo,
  etiquetaGaleno,
} from "@/app/features/nomenclador/galenos";
import type { ItemBoletin } from "./boletinMedico.api";

/* eslint-disable @typescript-eslint/no-explicit-any -- jsPDF y autoTable no
   traen tipos utilizables con el import dinámico; el resto del módulo sí. */

async function cargarLibs(): Promise<{ JsPDF: any; autoTable: any }> {
  const [jspdfMod, autotableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return {
    JsPDF: (jspdfMod as any)?.jsPDF ?? (jspdfMod as any)?.default ?? jspdfMod,
    autoTable: (autotableMod as any)?.default ?? autotableMod,
  };
}

const AZUL: [number, number, number] = [23, 63, 112]; // $primary-blue
const AMARILLO: [number, number, number] = [245, 234, 192]; // $primary-yellow-light
const GRIS: [number, number, number] = [100, 116, 139];
const FILA_ALT: [number, number, number] = [248, 250, 252];

const MARGEN = 14;

/** Alto reservado arriba para el índice: título más tres renglones. */
const ALTO_INDICE = 26;

const moneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const nombreArchivo = (hoy: Date): string => {
  const dd = (n: number) => String(n).padStart(2, "0");
  return `Boletin-${hoy.getFullYear()}${dd(hoy.getMonth() + 1)}${dd(hoy.getDate())}.pdf`;
};

export async function descargarBoletin(items: ItemBoletin[]): Promise<void> {
  const { JsPDF, autoTable } = await cargarLibs();
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const ancho = doc.internal.pageSize.getWidth();
  const hoy = new Date();

  // El logo es opcional a propósito: si la red falla, el boletín igual sale.
  const logo = await fetchAsDataUrl(CMC_LOGO_SRC);

  let y = MARGEN;
  if (logo) {
    try {
      doc.addImage(logo, getImageFormat(logo), MARGEN, y, 16, 16);
    } catch {
      // Un logo ilegible no puede impedir la descarga.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...AZUL);
  doc.text("Valores del boletín", logo ? MARGEN + 21 : MARGEN, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(CMC_NAME, logo ? MARGEN + 21 : MARGEN, y + 12.5);
  doc.text(CMC_SUBTITLE, logo ? MARGEN + 21 : MARGEN, y + 17);
  doc.text(
    `Emitido el ${hoy.toLocaleDateString("es-AR")}`,
    ancho - MARGEN,
    y + 7,
    { align: "right" }
  );

  y += 24;

  // El índice se dibuja al final, cuando ya se sabe en qué página cayó cada
  // sección, pero va arriba de todo: se le reserva el lugar ahora y se vuelve
  // a la página 1 al cerrar. Insertar una página aparte habría dejado el
  // encabezado del Colegio huérfano en la segunda.
  const yIndice = y;
  y += ALTO_INDICE;

  /** Dónde arranca cada sección, para enlazarla desde el índice. */
  const destinos: { titulo: string; pagina: number }[] = [];

  /**
   * Cabecera de sección, en el azul del sistema.
   *
   * Si no entra el título más un par de filas, abre página: sin esto el
   * título quedaba pegado al borde inferior y la tabla arrancaba en la
   * siguiente, con el índice apuntando a una página donde no se ve nada.
   */
  const ALTO_MINIMO = 32;
  const seccion = (titulo: string, desde: number): number => {
    let yTitulo = desde;
    if (yTitulo + ALTO_MINIMO > doc.internal.pageSize.getHeight() - MARGEN) {
      doc.addPage();
      yTitulo = MARGEN + 6;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...AZUL);
    doc.text(titulo, MARGEN, yTitulo);
    destinos.push({ titulo, pagina: doc.getCurrentPageInfo().pageNumber });
    return yTitulo + 3;
  };

  const estiloTabla = {
    theme: "grid" as const,
    margin: { left: MARGEN, right: MARGEN },
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 2, overflow: "linebreak" as const },
    headStyles: { fillColor: AZUL, textColor: AMARILLO, fontStyle: "bold" as const },
    alternateRowStyles: { fillColor: FILA_ALT },
  };

  // ── Valor de consulta ──────────────────────────────────────────────────────
  const consulta = items.filter((i) => i.consulta !== null);
  if (consulta.length > 0) {
    autoTable(doc, {
      ...estiloTabla,
      startY: seccion("Valor de consulta", y),
      head: [["N°", "Obra social", "Consulta"]],
      body: consulta.map((i) => [
        String(i.nro),
        i.nombre,
        moneda.format(i.consulta as number),
      ]),
      columnStyles: {
        0: { cellWidth: 16, halign: "right" },
        2: { cellWidth: 32, halign: "right" },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Galenos ────────────────────────────────────────────────────────────────
  // Una fila por galeno, con la obra social repetida: en papel se lee de
  // corrido y se puede buscar por nombre de galeno, no sólo por obra social.
  const galenos = items.flatMap((i) =>
    agruparPorCodigo(i.galenos).map((g) => [
      String(i.nro),
      i.nombre,
      g.nombre,
      g.minimo === g.maximo
        ? moneda.format(g.minimo)
        : `${moneda.format(g.minimo)} – ${moneda.format(g.maximo)}`,
      g.niveles.length > 1 ? g.niveles.map(etiquetaGaleno).join(", ") : "",
    ])
  );
  if (galenos.length > 0) {
    autoTable(doc, {
      ...estiloTabla,
      startY: seccion("Valores de galeno", y),
      head: [["N°", "Obra social", "Galeno", "Valor", "Niveles"]],
      body: galenos,
      columnStyles: {
        0: { cellWidth: 12, halign: "right" },
        1: { cellWidth: 42 },
        3: { cellWidth: 34, halign: "right" },
        4: { cellWidth: 44, textColor: GRIS, fontSize: 7.5 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ── Observaciones ──────────────────────────────────────────────────────────
  // Las condiciones van en una sola celda por obra social, una por renglón:
  // partidas en filas se pierde de un vistazo cuáles son del mismo convenio.
  const observaciones = items
    .filter((i) => i.observaciones.length > 0)
    .map((i) => [String(i.nro), i.nombre, i.observaciones.join("\n")]);
  if (observaciones.length > 0) {
    autoTable(doc, {
      ...estiloTabla,
      startY: seccion("Observaciones", y),
      head: [["N°", "Obra social", "Condiciones"]],
      body: observaciones,
      columnStyles: {
        0: { cellWidth: 12, halign: "right" },
        1: { cellWidth: 42 },
      },
    });
  }

  // ── Índice ─────────────────────────────────────────────────────────────────
  // Recién acá se sabe en qué página quedó cada sección. Cada renglón es un
  // enlace interno (`doc.link`) y además un marcador del PDF (`outline`), que
  // es el panel lateral de navegación del lector.
  doc.setPage(1);
  let yi = yIndice;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("CONTENIDO", MARGEN, yi);
  yi += 5;

  for (const { titulo, pagina } of destinos) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...AZUL);
    doc.text(titulo, MARGEN + 3, yi);

    const numero = String(pagina);
    doc.setTextColor(...GRIS);
    doc.text(numero, ancho - MARGEN, yi, { align: "right" });

    // Puntos guía entre el título y el número, como en un índice impreso.
    const desdeX = MARGEN + 3 + doc.getTextWidth(titulo) + 2;
    const hastaX = ancho - MARGEN - doc.getTextWidth(numero) - 2;
    if (hastaX > desdeX) {
      doc.setDrawColor(...GRIS);
      doc.setLineDashPattern([0.4, 1.2], 0);
      doc.setLineWidth(0.2);
      doc.line(desdeX, yi - 0.8, hastaX, yi - 0.8);
      doc.setLineDashPattern([], 0);
    }

    // El área clicable cubre el renglón entero, no sólo las letras.
    doc.link(MARGEN, yi - 3.6, ancho - MARGEN * 2, 5, { pageNumber: pagina });
    try {
      (doc as any).outline?.add(null, titulo, { pageNumber: pagina });
    } catch {
      // Sin marcadores el PDF sirve igual: los enlaces del índice ya funcionan.
    }

    yi += 5.5;
  }

  // Numeración al pie, al final: recién acá se sabe cuántas páginas salieron.
  const paginas = doc.getNumberOfPages();
  const alto = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= paginas; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(`${p} de ${paginas}`, ancho - MARGEN, alto - 8, { align: "right" });
  }

  doc.save(nombreArchivo(hoy));
}
