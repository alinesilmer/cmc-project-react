import {
  CMC_EMAIL,
  CMC_LOGO_SRC,
  CMC_NAME,
  CMC_PHONE,
  CMC_SUBTITLE,
  moneyFormatter,
} from "./boletinConsultaComun.constants";
import {
  buildPdfFilename,
  fetchAsDataUrl,
  getImageFormat,
  normalizeText,
} from "./boletinConsultaComun.helpers";
import type { ConsultaComunItem } from "./boletinConsultaComun.types";
import { etiquetaGaleno } from "@/app/features/nomenclador/galenos";
import type { NormasPorOS } from "./useNormasOperativas";

/** Fecha de la norma, corta. En el PDF no hay lugar para más. */
function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-AR", { dateStyle: "short" });
}

export async function generateConsultaComunPdf(
  items: ConsultaComunItem[],
  normasPorOS?: NormasPorOS
) {
  items = [...items].sort((a, b) => b.valor - a.valor);

  // El PDF se lee fuera del panel, así que los links a las normas van absolutos: `/noticias/12` impreso en papel no lleva a ninguna parte.
  const baseUrl =
    typeof window === "undefined" ? "" : window.location.origin;

  const [{ jsPDF }, { saveAs }] = await Promise.all([
    import("jspdf"),
    import("file-saver"),
  ]);

  const generatedAt = new Date();
  const logoDataUrl = await fetchAsDataUrl(CMC_LOGO_SRC);
  const mes = generatedAt
    .toLocaleString("es-AR", { month: "long" })
    .toUpperCase();

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;

  const palette = {
    navy: [23, 63, 112] as const,
    // Cabecera de las tablas: un azul más profundo.
    deepNavy: [12, 42, 82] as const,
    blue: [23, 63, 112] as const,
    cream: [245, 239, 224] as const,
    yellow: [247, 233, 170] as const,
    // Fondo de las tarjetas y de las filas alternadas.
    softBlue: [241, 245, 249] as const,
    line: [203, 213, 225] as const,
    text: [15, 23, 42] as const,
    muted: [100, 116, 139] as const,
    green: [23, 63, 112] as const,
    white: [255, 255, 255] as const,
    // Ámbar para las normas operativas: la ficha ya usa azul para todo.
    amber: [176, 106, 31] as const,
    softAmber: [252, 245, 234] as const,
  };

  /** "\02": el número de página con la barra de la portada. */
  const pagina = (n: number) => `\\${String(n).padStart(2, "0")}`;

  /** Rótulo chico en mayúscula, como los de la portada. */
  function rotulo(
    texto: string,
    x: number,
    y: number,
    align: "left" | "right",
    color: readonly [number, number, number],
    tenue = false
  ) {
    doc.setFont("helvetica", tenue ? "normal" : "bold");
    doc.setFontSize(tenue ? 6.5 : 7.5);
    doc.setTextColor(...color);
    doc.text(texto.toUpperCase(), x, y, { align, charSpace: 0.25 });
  }

  const detailPagesStart = 2 + Math.max(1, Math.ceil(items.length / 22));

  function addLogo(x: number, y: number, w: number, h: number) {
    if (!logoDataUrl) return;
    doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), x, y, w, h);
  }

  function drawFooter(pageNumber: number, totalPages: number) {
    // La portada va sin pie: es azul de borde a borde.
    if (pageNumber === 1) return;
    doc.setDrawColor(...palette.navy);
    doc.setLineWidth(0.2);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...palette.muted);
    doc.text(
      `${CMC_NAME}  ·  ${CMC_PHONE}  ·  ${CMC_EMAIL}`,
      marginX,
      pageHeight - 7.2
    );
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...palette.navy);
    doc.text(
      `${pagina(pageNumber)}  de  ${pagina(totalPages)}`,
      pageWidth - marginX,
      pageHeight - 7.2,
      { align: "right" }
    );
  }

  /** Encabezado de las hojas blancas: rótulos, título en Times y un filete. */
  function drawHeaderSection(
    title: string,
    subtitle?: string,
    showBackToIndex = false
  ) {
    let x = marginX;
    if (logoDataUrl) {
      // El logo es de 2:3; se respeta la proporción.
      addLogo(marginX, 7, 12, 18);
      x = marginX + 17;
    }

    rotulo(CMC_NAME, x, 12, "left", palette.navy);
    rotulo(mes, pageWidth - marginX, 12, "right", palette.navy);
    // La aclaración institucional, más tenue, a la altura del título.
    rotulo(CMC_SUBTITLE, pageWidth - marginX, 25, "right", palette.muted, true);

    doc.setFont("times", "normal");
    doc.setFontSize(22);
    doc.setTextColor(...palette.navy);
    doc.text(normalizeText(title, 46), x, 25);

    doc.setDrawColor(...palette.navy);
    doc.setLineWidth(0.25);
    doc.line(marginX, 31, pageWidth - marginX, 31);

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.muted);
      doc.text(subtitle, marginX, 40);
    }

    if (showBackToIndex) {
      const label = "VOLVER AL ÍNDICE";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...palette.navy);
      const ancho = doc.getTextWidth(label);
      const lx = pageWidth - marginX - ancho;
      doc.text(label, lx, 25);
      (doc as any).link(lx, 21, ancho, 6, { pageNumber: 2 });
    }
  }

  /** Portada: azul a página llena, como la del padrón. */
  function drawCover() {
    doc.setFillColor(...palette.navy);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    rotulo(CMC_NAME, marginX, 16, "left", palette.cream);
    rotulo(mes, pageWidth - marginX, 16, "right", palette.cream);

    addLogo(marginX, 62, 24, 36);

    doc.setTextColor(...palette.cream);
    doc.setFont("times", "normal");
    doc.setFontSize(52);
    doc.text("Boletín", marginX, pageHeight / 2 - 4);
    doc.text("de valores", marginX, pageHeight / 2 + 16);
    doc.setFontSize(20);
    doc.text("Consulta común", marginX, pageHeight / 2 + 30);

    // Un filete amarillo corto, bajo el título.
    doc.setFillColor(...palette.yellow);
    doc.rect(marginX, pageHeight / 2 + 37, 26, 1.2, "F");

    rotulo("Obras sociales", marginX, pageHeight - 22, "left", palette.cream, true);
    rotulo(String(items.length), marginX, pageHeight - 17, "left", palette.cream);
    rotulo("Contacto", pageWidth - marginX, pageHeight - 22, "right", palette.cream, true);
    rotulo(`${CMC_EMAIL}  ·  ${CMC_PHONE}`, pageWidth - marginX, pageHeight - 17, "right", palette.cream);
  }

  function drawIndexPages() {
    const itemsPerPage = 22;
    const totalIndexPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

    for (let indexPage = 0; indexPage < totalIndexPages; indexPage += 1) {
      doc.addPage();
      drawHeaderSection(
        "Índice",
        "Seleccione una obra social para ir directamente a su página."
      );

      const start = indexPage * itemsPerPage;
      const chunk = items.slice(start, start + itemsPerPage);

      doc.setFillColor(...palette.deepNavy);
      doc.roundedRect(marginX, 50, pageWidth - marginX * 2, 10, 2.5, 2.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...palette.cream);
      doc.text("N°", marginX + 4, 56.5);
      doc.text("Obra Social", marginX + 20, 56.5);
      doc.text("Valor", pageWidth - 54, 56.5);
      doc.text("Pág.", pageWidth - 22, 56.5, { align: "right" });

      let y = 67;
      chunk.forEach((item, idx) => {
        const absoluteIndex = start + idx;
        const targetPage = detailPagesStart + absoluteIndex;

        // Una fila blanca, una gris claro.
        if (idx % 2 === 1) {
          doc.setFillColor(...palette.softBlue);
          doc.rect(marginX, y - 5.2, pageWidth - marginX * 2, 10, "F");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.8);
        doc.setTextColor(...palette.text);

        const name = normalizeText(item.nombre, 60);
        doc.text(String(item.nro), marginX + 4, y);
        doc.text(name, marginX + 20, y);
        doc.text(moneyFormatter.format(item.valor), pageWidth - 34, y, {
          align: "right",
        });
        doc.text(String(targetPage), pageWidth - 22, y, { align: "right" });

        (doc as any).link(marginX, y - 5, pageWidth - marginX * 2, 8, {
          pageNumber: targetPage,
        });

        y += 10;
      });
    }
  }

  /** Strips stray regex/template artifacts from raw observation text. */
  function cleanObs(raw: string): string {
    return raw
      .replace(/^[\s)?(|\\[\]{}]+/, "")
      .replace(/[\s)?(|\\[\]{}]+$/, "")
      .trim();
  }

  function drawDetailPage(item: ConsultaComunItem) {
    doc.addPage();
    drawHeaderSection(
      item.nombre
    );

    // ── Main value card ──────────────────────────────────────────
    doc.setFillColor(...palette.softBlue);
    doc.roundedRect(marginX, 48, pageWidth - marginX * 2, 22, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...palette.muted);
    doc.text("VALOR VIGENTE", marginX + 6, 55.5, { charSpace: 0.25 });

    doc.setFont("times", "normal");
    doc.setFontSize(24);
    doc.setTextColor(...palette.green);
    doc.text(moneyFormatter.format(item.valor), marginX + 6, 65);

    // ── Galenos ──────────────────────────────────────────────────
    // Cuántos y cuáles depende de la obra social, así que la grilla se arma con lo que haya y baja de renglón sola.
    let curY = 76;

    doc.setDrawColor(...palette.line);
    doc.line(marginX, curY, pageWidth - marginX, curY);
    curY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...palette.navy);
    doc.text("Valores GENERALES", marginX, curY);
    curY += 7;

    if (item.galenos.length === 0) {
      doc.setFillColor(...palette.softBlue);
      doc.roundedRect(marginX, curY, pageWidth - marginX * 2, 14, 2, 2, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.muted);
      doc.text(
        "Sin galenos pactados con esta obra social.",
        marginX + 6,
        curY + 9
      );
      curY += 20;
    } else {
      const porFila = 5;
      const colW = (pageWidth - marginX * 2) / porFila;
      const cardPad = 3.5;
      const galenoCardH = 20;
      const bottomY = pageHeight - 22;

      item.galenos.forEach((g, i) => {
        const col = i % porFila;

        if (col === 0 && i > 0) curY += galenoCardH + 3;
        if (col === 0 && curY + galenoCardH > bottomY) {
          doc.addPage();
          drawHeaderSection(item.nombre);
          curY = 50;
        }

        const cx = marginX + col * colW;
        doc.setFillColor(...palette.softBlue);
        doc.roundedRect(cx, curY, colW - 2, galenoCardH, 2, 2, "F");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.6);
        doc.setTextColor(...palette.muted);
        // Dos líneas como máximo: la tarjeta tiene alto fijo.
        const lineas = (
          doc.splitTextToSize(etiquetaGaleno(g), colW - cardPad * 2 - 2) as string[]
        ).slice(0, 2);
        lineas.forEach((linea, n) => {
          doc.text(linea, cx + cardPad, curY + 5 + n * 3.4);
        });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...palette.green);
        doc.text(moneyFormatter.format(g.valor), cx + cardPad, curY + 16.5);
      });

      curY += galenoCardH + 6;
    }

    doc.setDrawColor(...palette.line);
    doc.line(marginX, curY, pageWidth - marginX, curY);
    curY += 8;

    // ── Observations ─────────────────────────────────────────────
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...palette.navy);
    doc.text("Observaciones", marginX, curY);
    curY += 8;

    const rawObs = item.observaciones.map(cleanObs).filter(Boolean);
    const safeBottomY = pageHeight - 22;
    const borderW = 3.5;
    const cardPadX = 7;
    const cardPadY = 5;
    const textX = marginX + borderW + cardPadX;
    // Right edge of card minus right padding — must be set with font active.
    const cardRight = pageWidth - marginX - 6;
    const textWidth = cardRight - textX;
    // Line height derived from font metrics: 9.5pt × 1.15 factor ≈ 4.6mm.
    const lineH = 5.2;

    // Set font NOW so splitTextToSize uses correct glyph widths.
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    if (rawObs.length === 0) {
      doc.setFillColor(...palette.softBlue);
      doc.roundedRect(marginX, curY, pageWidth - marginX * 2, 14, 2, 2, "F");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.muted);
      doc.text(
        "Sin observaciones particulares para esta obra social.",
        marginX + 6,
        curY + 9
      );
      curY += 20;
    } else {
      for (const obs of rawObs) {
        // splitTextToSize must be called with font already active.
        const lines = doc.splitTextToSize(obs, textWidth) as string[];
        const cardH = lines.length * lineH + cardPadY * 2;

        if (curY + cardH > safeBottomY) {
          doc.addPage();
          drawHeaderSection(
            item.nombre
          );
          curY = 50;
        }

        // Card background
        doc.setFillColor(...palette.softBlue);
        doc.roundedRect(marginX, curY, pageWidth - marginX * 2, cardH, 2, 2, "F");

        // Left accent strip (inset 1mm top/bottom to stay within rounded corners)
        doc.setFillColor(...palette.blue);
        doc.rect(marginX, curY + 1, borderW, cardH - 2, "F");

        // Text — maxWidth acts as a hard clip guard for unbreakable long tokens.
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...palette.text);
        doc.text(lines, textX, curY + cardPadY + lineH - 0.8, { maxWidth: textWidth });

        curY += cardH + 5;
      }
    }

    // ── Normas operativas ────────────────────────────────────────
    // A diferencia de Observaciones, si no hay no se dibuja nada: un "sin normas operativas" en cada una de las ~300 fichas es ruido.
    const normas = normasPorOS?.get(item.nro) ?? [];
    if (normas.length === 0) return;

    curY += 3;
    if (curY + 24 > safeBottomY) {
      doc.addPage();
      drawHeaderSection(item.nombre);
      curY = 50;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...palette.navy);
    doc.text("Normas operativas", marginX, curY);
    curY += 8;

    for (const norma of normas) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      const tituloLines = doc.splitTextToSize(norma.titulo, textWidth) as string[];
      // Título (n líneas) + la URL debajo, más el padding de la card.
      const cardH = (tituloLines.length + 1) * lineH + cardPadY * 2;

      if (curY + cardH > safeBottomY) {
        doc.addPage();
        drawHeaderSection(item.nombre);
        curY = 50;
      }

      doc.setFillColor(...palette.softAmber);
      doc.roundedRect(marginX, curY, pageWidth - marginX * 2, cardH, 2, 2, "F");
      doc.setFillColor(...palette.amber);
      doc.rect(marginX, curY + 1, borderW, cardH - 2, "F");

      const url = `${baseUrl}/noticias/${norma.id}`;
      let lineY = curY + cardPadY + lineH - 0.8;

      // El título es el link: en pantalla se hace click, y la URL impresa de abajo es para la copia en papel.
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.text);
      tituloLines.forEach((line) => {
        doc.textWithLink(line, textX, lineY, { url, maxWidth: textWidth });
        lineY += lineH;
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...palette.muted);
      doc.text(
        `${formatShortDate(norma.fecha)} · ${url}`,
        textX,
        lineY,
        { maxWidth: textWidth }
      );

      curY += cardH + 5;
    }
  }

  drawCover();
  drawIndexPages();

  items.forEach((item) => {
    drawDetailPage(item);
  });

  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    drawFooter(page, totalPages);
  }

  const blob = doc.output("blob");
  saveAs(blob, buildPdfFilename(generatedAt));
}