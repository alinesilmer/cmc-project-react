import {
  CMC_EMAIL,
  CMC_LOGO_SRC,
  CMC_NAME,
  CMC_PHONE,
  CMC_SUBTITLE,
  CONSULTA_COMUN_CODE,
  moneyFormatter,
} from "./boletinConsultaComun.constants";
import {
  buildPdfFilename,
  fetchAsDataUrl,
  formatGeneratedDate,
  getImageFormat,
  normalizeText,
} from "./boletinConsultaComun.helpers";
import type { ConsultaComunItem } from "./boletinConsultaComun.types";

export async function generateConsultaComunPdf(items: ConsultaComunItem[]) {
  const [{ jsPDF }, { saveAs }] = await Promise.all([
    import("jspdf"),
    import("file-saver"),
  ]);

  const generatedAt = new Date();
  const generatedAtLabel = formatGeneratedDate(generatedAt);
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
    navy: [32, 55, 105] as const,
    blue: [49, 92, 184] as const,
    softBlue: [234, 241, 252] as const,
    line: [221, 229, 240] as const,
    text: [36, 43, 52] as const,
    muted: [102, 112, 133] as const,
    green: [16, 124, 87] as const,
    white: [255, 255, 255] as const,
  };

  const detailPagesStart = 2 + Math.max(1, Math.ceil(items.length / 22));

  function addLogo(x: number, y: number, w: number, h: number) {
    if (!logoDataUrl) return;
    doc.addImage(logoDataUrl, getImageFormat(logoDataUrl), x, y, w, h);
  }

  function drawFooter(pageNumber: number, totalPages: number) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...palette.muted);

    doc.setDrawColor(...palette.line);
    doc.line(marginX, pageHeight - 12, pageWidth - marginX, pageHeight - 12);

    doc.text(
      `${CMC_NAME} · ${CMC_EMAIL} · ${CMC_PHONE}`,
      marginX,
      pageHeight - 7.2
    );
    doc.text(
      `Página ${pageNumber} de ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 7.2,
      { align: "right" }
    );
  }

  function drawHeaderSection(
    title: string,
    subtitle?: string,
    showBackToIndex = false
  ) {
    doc.setFillColor(...palette.navy);
    doc.rect(0, 0, pageWidth, 24, "F");

    addLogo(marginX, 5.2, 12, 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...palette.white);
    doc.text(CMC_NAME, logoDataUrl ? marginX + 16 : marginX, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.text(CMC_SUBTITLE, logoDataUrl ? marginX + 16 : marginX, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.8);
    doc.text(mes, pageWidth - marginX, 10, { align: "right" });

    doc.setTextColor(...palette.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(title, marginX, 36);

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.2);
      doc.setTextColor(...palette.muted);
      doc.text(subtitle, marginX, 42);
    }

    if (showBackToIndex) {
      const label = "Volver al índice";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...palette.white);
      const x = pageWidth - marginX - doc.getTextWidth(label);
      const y = 17;
      doc.text(label, x, y);
      (doc as any).link(x, y - 4, doc.getTextWidth(label), 6, {
        pageNumber: 2,
      });
    }
  }

  function drawCover() {
    doc.setFillColor(...palette.navy);
    doc.rect(0, 0, pageWidth, 74, "F");

    addLogo((pageWidth - 30) / 2, 18, 30, 30);

    doc.setTextColor(...palette.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("Boletín Informativo de Valores", pageWidth / 2, 58, {
      align: "center",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Valorización de Consultas y Prácticas", pageWidth / 2, 66, {
      align: "center",
    });

    doc.setDrawColor(...palette.line);
    doc.setLineWidth(0.35);
    doc.line(24, 188, pageWidth - 24, 188);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...palette.text);
    doc.text("Contacto institucional", 24, 202);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.4);
    doc.setTextColor(...palette.muted);
    doc.text(`Email: ${CMC_EMAIL}`, 24, 212);
    doc.text(`Teléfono: ${CMC_PHONE}`, 24, 220);
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

      doc.setFillColor(...palette.softBlue);
      doc.roundedRect(marginX, 50, pageWidth - marginX * 2, 10, 2.5, 2.5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...palette.navy);
      doc.text("N°", marginX + 4, 56.5);
      doc.text("Obra Social", marginX + 20, 56.5);
      doc.text("Valor", pageWidth - 54, 56.5);
      doc.text("Pág.", pageWidth - 22, 56.5, { align: "right" });

      let y = 67;
      chunk.forEach((item, idx) => {
        const absoluteIndex = start + idx;
        const targetPage = detailPagesStart + absoluteIndex;

        doc.setDrawColor(...palette.line);
        doc.line(marginX, y + 4.8, pageWidth - marginX, y + 4.8);

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
    doc.text("Valor vigente", marginX + 6, 55.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...palette.green);
    doc.text(moneyFormatter.format(item.valor), marginX + 6, 65);

    // ── GALENO values (always render, defensive fallback for stale cache) ──
    const galeno = item.galeno ?? {
      quirurgico: 0,
      practica: 0,
      radiologico: 0,
      cirugiaAdultos: 0,
      cirugiaInfantil: 0,
      gastosQuirurgicos: 0,
      gastosRadiologico: 0,
      gastosBioquimicos: 0,
      otrosGastos: 0,
    };
    const galenoEntries: [string, number][] = [
      ["Quirúrgico", galeno.quirurgico],
      ["Práctica", galeno.practica],
      ["Radiológico", galeno.radiologico],
      ["Cirugía Adultos", galeno.cirugiaAdultos],
      ["Cirugía Infantil", galeno.cirugiaInfantil],
    ];
    const gastosEntries: [string, number][] = [
      ["G. Quirúrgicos", galeno.gastosQuirurgicos],
      ["G. Radiológico", galeno.gastosRadiologico],
      ["G. Bioquímicos", galeno.gastosBioquimicos],
      ["Otros Gastos", galeno.otrosGastos],
    ];

    let curY = 76;

    doc.setDrawColor(...palette.line);
    doc.line(marginX, curY, pageWidth - marginX, curY);
    curY += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...palette.navy);
    doc.text("Valores GENERALES", marginX, curY);
    curY += 7;

    const colW = (pageWidth - marginX * 2) / galenoEntries.length;
    const galenoCardH = 17;

    galenoEntries.forEach(([label, val], i) => {
      const cx = marginX + i * colW;
      doc.setFillColor(...palette.softBlue);
      doc.roundedRect(cx, curY, colW - 2, galenoCardH, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(...palette.muted);
      doc.text(label, cx + 3.5, curY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.green);
      doc.text(moneyFormatter.format(val), cx + 3.5, curY + 13.5);
    });

    curY += galenoCardH + 4;

    const gastosColW = (pageWidth - marginX * 2) / gastosEntries.length;

    gastosEntries.forEach(([label, val], i) => {
      const cx = marginX + i * gastosColW;
      doc.setFillColor(...palette.softBlue);
      doc.roundedRect(cx, curY, gastosColW - 2, galenoCardH, 2, 2, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(...palette.muted);
      doc.text(label, cx + 3.5, curY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...palette.green);
      doc.text(moneyFormatter.format(val), cx + 3.5, curY + 13.5);
    });

    curY += galenoCardH + 6;

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
    // Line height derived from font metrics: 9.5pt × 1.15 factor ≈ 4.6mm; keep
    // a small overhead so the card is always tall enough to contain the text.
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