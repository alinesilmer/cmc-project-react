import autoTable from "jspdf-autotable";

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
  fitLines,
  formatApiDate,
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
    doc.text("Boletín Informativo de Valores", pageWidth / 2, 58, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Valorización de Consultas y Prácticas", pageWidth / 2, 66, {
      align: "center",
    });

    doc.setTextColor(...palette.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(CMC_NAME, pageWidth / 2, 96, { align: "center" });

   

    doc.setFillColor(...palette.softBlue);
    doc.roundedRect(24, 118, pageWidth - 48, 54, 4, 4, "F");

    doc.setTextColor(...palette.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Detalle del documento", 32, 131);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.2);
    doc.text(`Código nomenclador: ${CONSULTA_COMUN_CODE}`, 32, 141);
    doc.text(`Fecha de generación: ${generatedAtLabel}`, 32, 149);
    doc.text(`Cantidad de obras sociales: ${items.length}`, 32, 157);
    

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

  function drawDetailPage(item: ConsultaComunItem) {
    doc.addPage();
    drawHeaderSection(
      item.nombre,
      `Consulta Común · Código ${CONSULTA_COMUN_CODE}`,
      true
    );

    doc.setFillColor(...palette.softBlue);
    doc.roundedRect(marginX, 50, pageWidth - marginX * 2, 24, 3, 3, "F");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.4);
    doc.setTextColor(...palette.muted);
    doc.text("Valor vigente", marginX + 6, 58);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...palette.green);
    doc.text(moneyFormatter.format(item.valor), marginX + 6, 68);

    autoTable(doc, {
      startY: 83,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      head: [["Campo", "Detalle"]],
      body: [
        ["N° Obra Social", String(item.nro)],
        ["Obra Social", item.nombre],
        ["Código nomenclador", CONSULTA_COMUN_CODE],
        ["Práctica", "Consulta Común"],
        ["Valor", moneyFormatter.format(item.valor)],
        ["Fecha informada", formatApiDate(item.fechaCambio)],
      ],
      styles: {
        font: "helvetica",
        fontSize: 10,
        cellPadding: 3.2,
        textColor: [...palette.text],
        lineColor: [...palette.line],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [...palette.navy],
        textColor: [...palette.white],
        fontStyle: "bold",
      },
      columnStyles: {
        0: {
          fontStyle: "bold",
          fillColor: [248, 250, 252],
          cellWidth: 48,
        },
        1: {
          cellWidth: "auto",
        },
      },
      alternateRowStyles: {
        fillColor: [252, 253, 255],
      },
    });

    const finalY =
      ((doc as any).lastAutoTable?.finalY as number | undefined) ?? 132;

    doc.setDrawColor(...palette.line);
    doc.line(marginX, finalY + 8, pageWidth - marginX, finalY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...palette.text);
    doc.text("Observaciones", marginX, finalY + 18);

    const observations =
      item.observaciones.length > 0
        ? item.observaciones
        : ["Sin observaciones particulares."];

    let obsY = finalY + 28;

    observations.slice(0, 4).forEach((obs) => {
      const lines = fitLines(doc.splitTextToSize(`• ${obs}`, 172) as string[], 3);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.7);
      doc.setTextColor(...palette.muted);
      doc.text(lines, marginX + 2, obsY);
      obsY += Math.max(8, lines.length * 4.8);
    });

    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.6);
    doc.setTextColor(...palette.muted);
    doc.text(
      "Documento informativo generado desde el módulo de valores.",
      marginX,
      pageHeight - 18
    );
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