"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
} from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";
import { Download, Calendar } from "lucide-react";
import styles from "./GenerarBoletin.module.scss";
import Button from "@/website/components/UI/Button/Button";
import CMCLogoUrl from "../../assets/logoCMC.png";
// `http` y no `httpBare`: la ruta ahora va detrás de RequireAuth, y /api/valores/boletin exige sesión.
import { fetchValoresBoletin, type ApiBoletinRow } from "./generarBoletin.api";
import { axiosErrorMessage, sinControl } from "@/app/shared/lib/utiles";
import Cargando from "@/app/components/ui/Cargando/Cargando";

registerLocale("es", es);

// Ruta relativa: la baseURL por ambiente la resuelve la instancia `http` compartida, no hay que armarla acá.
type ObraSocialBoletin = {
  id: number;
  nombre: string;
  nivel: number | null;
  fechaCambioISO: string | null;

  consulta: number;
  galenoQuirurgico: number;
  gastosQuirurgicos: number;
  galenoPractica: number;
  galenoRadiologico: number;
  gastosRadiologicos: number;
  gastosBioquimicos: number;
  otrosGastos: number;
  galenoCirugiaAdultos: number;
  galenoCirugiaInfantil: number;
  consultaEspecial: number;

  categoriaA: string | null;
  categoriaB: string | null;
  categoriaC: string | null;

  traumatologiaPP: string;
  clinicaPediatrica: string;
  normas: string;
  autorizaciones: string;
  anexoIV: string;
};

function parseISODateLocal(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return null;
  return new Date(y, mo - 1, d);
}

function isoKey(s: string | null | undefined): number {
  const dt = parseISODateLocal(s);
  if (!dt) return -1;
  return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
}

function formatMonthYearFromDate(dt: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(dt);
}

function formatDDMMYYYYFromDate(dt: Date): string {
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dt.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function formatMonthYearFromISO(iso: string | null): string {
  const dt = parseISODateLocal(iso);
  if (!dt) return "-";
  return formatMonthYearFromDate(dt);
}

function formatDDMMYYYYFromISO(iso: string | null): string {
  const dt = parseISODateLocal(iso);
  if (!dt) return "-";
  return formatDDMMYYYYFromDate(dt);
}

function parseDateDDMMYYYY(input: string): Date | null {
  const t = String(input || "").trim();
  if (!t) return null;

  const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t);
  if (!m) return null;

  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);

  if (!Number.isFinite(d) || !Number.isFinite(mo) || !Number.isFinite(y))
    return null;
  if (y < 1900 || y > 3000) return null;
  if (mo < 1 || mo > 12) return null;
  if (d < 1 || d > 31) return null;

  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return null;
  return dt;
}

function normalizeText(s: unknown, maxLen = 120): string {
  const t = sinControl(String(s ?? ""), "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (!t) return "";
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

function buildPerOS(
  rows: ApiBoletinRow[]
): { items: ObraSocialBoletin[]; lastISO: string | null } {
  const byOS = new Map<number, ApiBoletinRow[]>();
  let lastISO: string | null = null;
  let lastKey = -1;

  for (const r of rows) {
    const arr = byOS.get(r.nro_obrasocial) ?? [];
    arr.push(r);
    byOS.set(r.nro_obrasocial, arr);

    const k = isoKey(r.fecha_cambio);
    if (k > lastKey) {
      lastKey = k;
      lastISO = r.fecha_cambio;
    }
  }

  const items: ObraSocialBoletin[] = [];

  for (const [nro, arr] of byOS.entries()) {
    arr.sort((a, b) => {
      const dk = isoKey(b.fecha_cambio) - isoKey(a.fecha_cambio);
      if (dk !== 0) return dk;
      const nk = (b.nivel ?? 0) - (a.nivel ?? 0);
      if (nk !== 0) return nk;
      return (b.id ?? 0) - (a.id ?? 0);
    });

    const top = arr[0];

    items.push({
      id: nro,
      nombre: normalizeText(top.obra_social ?? `OS ${nro}`, 140),
      nivel: Number.isFinite(top.nivel) ? top.nivel : null,
      fechaCambioISO: top.fecha_cambio ?? null,

      consulta: top.consulta ?? 0,
      galenoQuirurgico: top.galeno_quirurgico ?? 0,
      gastosQuirurgicos: top.gastos_quirurgicos ?? 0,
      galenoPractica: top.galeno_practica ?? 0,
      galenoRadiologico: top.galeno_radiologico ?? 0,
      gastosRadiologicos: top.gastos_radiologico ?? 0,
      gastosBioquimicos: top.gastos_bioquimicos ?? 0,
      otrosGastos: top.otros_gastos ?? 0,
      galenoCirugiaAdultos: top.galeno_cirugia_adultos ?? 0,
      galenoCirugiaInfantil: top.galeno_cirugia_infantil ?? 0,
      consultaEspecial: top.consulta_especial ?? 0,

      categoriaA: top.categoria_a ?? null,
      categoriaB: top.categoria_b ?? null,
      categoriaC: top.categoria_c ?? null,

      traumatologiaPP: "-",
      clinicaPediatrica: "-",
      normas: "",
      autorizaciones: "",
      anexoIV: "",
    });
  }

  items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return { items, lastISO };
}

async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("IMG_LOAD_FAILED");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("IMG_READ_FAILED"));
    reader.readAsDataURL(blob);
  });
}

const formatCurrency = (value: number): string => {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
function buildIndexBodyTwoCol(
  items: ObraSocialBoletin[],
  detailsStartPage: number
): Array<Array<string>> {
  const rows: Array<Array<string>> = [];
  for (let i = 0; i < items.length; i += 2) {
    const a = items[i];
    const b = items[i + 1];

    rows.push([
      `${a.id} - ${a.nombre}`,
      String(detailsStartPage + i),
      b ? `${b.id} - ${b.nombre}` : "",
      b ? String(detailsStartPage + i + 1) : "",
    ]);
  }
  return rows;
}

function calcIndexPagesCountTwoCol(
  items: ObraSocialBoletin[],
  JsPDF: typeof import("jspdf").jsPDF,
  autoTable: typeof import("jspdf-autotable").default,
): number {
  const tmp = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 20;
  const body = buildIndexBodyTwoCol(items, 1);

  autoTable(tmp, {
    startY: 66,
    head: [["Obra Social", "Pág.", "Obra Social", "Pág."]],
    body,
    margin: { top: 52, left: margin, right: margin, bottom: 22 },
    styles: { fontSize: 9, cellPadding: 3, lineWidth: 0.1 },
    headStyles: { fontStyle: "bold", fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 12, halign: "center" },
      2: { cellWidth: 78 },
      3: { cellWidth: 12, halign: "center" },
    },
  });

  return tmp.getNumberOfPages();
}

type DateInputProps = {
  value?: string;
  onClick?: () => void;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
};

const VigenciaDateInput = forwardRef<HTMLInputElement, DateInputProps>(
  (
    { value, onClick, onChange, onBlur, disabled, placeholder, className, hasError },
    ref
  ) => {
    return (
      <div
        className={[
          styles.dateField,
          hasError ? styles.dateFieldError : "",
          className || "",
        ].join(" ")}
      >
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={value || ""}
          onClick={onClick}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={styles.dateInput}
        />
        <span className={styles.dateIconWrap}>
          <Calendar size={18} className={styles.datePickerIcon} />
        </span>
      </div>
    );
  }
);

VigenciaDateInput.displayName = "VigenciaDateInput";

const GenerarBoletin = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [boletinData, setBoletinData] = useState<ObraSocialBoletin[]>([]);
  const [lastUpdateISO, setLastUpdateISO] = useState<string | null>(null);

  const [vigenciaDate, setVigenciaDate] = useState<Date | null>(null);
  const [vigenciaInput, setVigenciaInput] = useState("");
  const [vigenciaError, setVigenciaError] = useState(false);

  const generatingRef = useRef(false);
  const mountedRef = useRef(true);
  const userTouchedVigenciaRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safeSetIsGenerating = useCallback((v: boolean) => {
    if (!mountedRef.current) return;
    setIsGenerating(v);
  }, []);

  const safeSetProgress = useCallback((v: number) => {
    if (!mountedRef.current) return;
    setProgress(v);
  }, []);

  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const rows = await fetchValoresBoletin();
      const built = buildPerOS(rows);
      if (!mountedRef.current) return;

      setBoletinData(built.items);
      setLastUpdateISO(built.lastISO);

      if (!userTouchedVigenciaRef.current) {
        const dt = parseISODateLocal(built.lastISO);
        setVigenciaDate(dt);
      }
    } catch (e) {
      if (!mountedRef.current) return;
      setLoadError(axiosErrorMessage(e));
      setBoletinData([]);
      setLastUpdateISO(null);
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (vigenciaDate) setVigenciaInput(formatDDMMYYYYFromDate(vigenciaDate));
    else setVigenciaInput("");
    setVigenciaError(false);
  }, [vigenciaDate]);

  const lastUpdateLabel = useMemo(() => {
    if (!lastUpdateISO) return "-";
    return formatMonthYearFromISO(lastUpdateISO);
  }, [lastUpdateISO]);

  const vigenciaLabel = useMemo(() => {
    if (vigenciaDate) return formatDDMMYYYYFromDate(vigenciaDate);
    if (lastUpdateISO) return formatDDMMYYYYFromISO(lastUpdateISO);
    return "-";
  }, [vigenciaDate, lastUpdateISO]);

  const vigenciaMonthYear = useMemo(() => {
    if (vigenciaDate) return formatMonthYearFromDate(vigenciaDate);
    if (lastUpdateISO) return formatMonthYearFromISO(lastUpdateISO);
    return "-";
  }, [vigenciaDate, lastUpdateISO]);

  const generatePDF = useCallback(async () => {
    let logoDataUrl: string | null = null;

    try {
      logoDataUrl = await urlToDataUrl(CMCLogoUrl);
    } catch {
      logoDataUrl = null;
    }

    if (generatingRef.current) return;
    generatingRef.current = true;

    safeSetIsGenerating(true);
    safeSetProgress(0);

    try {
      if (!boletinData.length) return;

      const { jsPDF: JsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new JsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      const primaryColor: [number, number, number] = [30, 41, 59];
      const accentColor: [number, number, number] = [12, 42, 82];
      const lightGray: [number, number, number] = [241, 245, 249];
      const mediumGray: [number, number, number] = [100, 116, 139];

      const indexPagesCount = calcIndexPagesCountTwoCol(boletinData, JsPDF, autoTable);
      const totalPages = 2 + indexPagesCount + boletinData.length;
      const detailsStartPage = 3 + indexPagesCount;

      const addHeader = (_pageNum: number, _total: number) => {
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(0.5);
        doc.line(margin, 25, pageWidth - margin, 25);

        const logoSize = 20;
        const logoX = margin;
        const logoY = 3;

        if (logoDataUrl) {
          doc.addImage(
            logoDataUrl,
            "PNG",
            logoX,
            logoY,
            logoSize,
            logoSize,
            undefined,
            "FAST"
          );
        } else {
          doc.setFillColor(...accentColor);
          doc.circle(margin + 8, 15, 8, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(10);
          doc.setFont("helvetica", "bold");
          doc.text("CMC", margin + 8, 17, { align: "center" });
        }

        doc.setTextColor(...primaryColor);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Colegio Médico de Corrientes", margin + 22, 12);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...mediumGray);
        doc.text("Boletín de Valores", margin + 22, 18);

        const today = new Date().toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        doc.setFontSize(9);
        doc.text(today, pageWidth - margin, 15, { align: "right" });
      };

      const addFooter = (pageNum: number, total: number) => {
        const footerY = pageHeight - 15;

        doc.setDrawColor(...lightGray);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setFontSize(8);
        doc.setTextColor(...mediumGray);
        doc.setFont("helvetica", "normal");
        doc.text("auditoriacolegiomedico23@gmail.com", margin, footerY);
        doc.text("Tel: (3794) 722-121", margin + 70, footerY);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(`${pageNum} / ${total}`, pageWidth - margin, footerY, {
          align: "right",
        });
      };

      const centerX = pageWidth / 2;

      safeSetProgress(10);
      addHeader(1, totalPages);

      doc.setFillColor(...accentColor);
      doc.roundedRect(margin, 38, 8, pageHeight - 60, 4, 4, "F");

      doc.setTextColor(...primaryColor);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(34);
      doc.text("Boletín", centerX, 70, { align: "center" });

      doc.setFontSize(26);
      doc.text("INFORMATIVO", centerX, 86, { align: "center" });
      doc.text("DE VALORES", centerX, 100, { align: "center" });

      doc.setFontSize(18);
      doc.text("AUDITORÍA", centerX, 118, { align: "center" });

      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.8);
      doc.line(centerX - 22, 123, centerX + 22, 123);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(...mediumGray);

      const block = [
        "VALORIZACIÓN DE",
        "CONSULTAS Y PRÁCTICAS",
        "DE LAS DIFERENTES",
        "ENTIDADES QUE",
        "SE FACTURAN POR",
      ];

      let y = 142;
      for (const line of block) {
        doc.text(line, centerX, y, { align: "center" });
        y += 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...primaryColor);
      doc.text("COLEGIO MÉDICO DE CORRIENTES", centerX, y + 6, {
        align: "center",
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...mediumGray);
      doc.text(
        `Vigencia: ${vigenciaLabel}  |  ${vigenciaMonthYear}`,
        centerX,
        y + 18,
        { align: "center" }
      );

      addFooter(1, totalPages);

      safeSetProgress(18);
      doc.addPage();
      addHeader(2, totalPages);

      doc.setFillColor(...lightGray);
      doc.roundedRect(margin, 58, contentWidth, 62, 4, 4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text("VALORES QUE SE PACTAN", margin + 8, 70);

      const leftX = margin + 10;
      let ly = 78;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);

      const bullets = [
        "Consulta",
        "Consulta Especial (si corresponde)",
        "Unidades de Galeno (quirúrgico, práctica, radiológico)",
        "Unidades de Gastos (quirúrgicos, radiológicos, bioquímicos)",
        "Otros gastos y consideraciones",
      ];

      for (const b of bullets) {
        doc.circle(leftX, ly - 2, 0.7, "F");
        doc.text(b, leftX + 4, ly);
        ly += 8;
      }

      doc.setFillColor(...accentColor);
      doc.roundedRect(margin, 128, contentWidth, 60, 4, 4, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text("CÓMO LEER ESTE BOLETÍN", margin + 8, 140);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      const explain = [
        "Los montos se informan como valores de referencia.",
        "Los valores pueden cambiar según actualizaciones vigentes.",
        "Usá el índice para navegar a cada Obra Social, haciendo click en el número de página.",
      ];

      let ey = 148;
      for (const line of explain) {
        doc.text(`• ${line}`, margin + 10, ey);
        ey += 8;
      }

      addFooter(2, totalPages);

      safeSetProgress(26);
      doc.addPage();

      const indexFirstPage = doc.getNumberOfPages();
      const indexBody = buildIndexBodyTwoCol(boletinData, detailsStartPage);

      autoTable(doc, {
        startY: 66,
        head: [["Obra Social", "Pág.", "Obra Social", "Pág."]],
        body: indexBody,
        margin: { top: 52, left: margin, right: margin, bottom: 22 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          textColor: primaryColor,
          lineColor: lightGray,
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 78 },
          1: { cellWidth: 12, halign: "center" },
          2: { cellWidth: 78 },
          3: { cellWidth: 12, halign: "center" },
        },
        didParseCell: (data) => {
          if (
            data.section === "body" &&
            (data.column.index === 1 || data.column.index === 3)
          ) {
            const txt = String(data.cell.raw ?? "").trim();
            if (txt) {
              data.cell.styles.fillColor = lightGray;
              data.cell.styles.textColor = accentColor;
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.halign = "center";
            }
          }
        },
        didDrawPage: () => {
          const pageNum = doc.getNumberOfPages();
          addHeader(pageNum, totalPages);

          if (pageNum === indexFirstPage) {
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(...primaryColor);
            doc.text("Índice", margin, 45);

            doc.setFillColor(...accentColor);
            doc.rect(margin, 48, 25, 2, "F");
          }

          addFooter(pageNum, totalPages);
        },
        didDrawCell: (data) => {
          if (data.section !== "body") return;
          if (data.column.index !== 1 && data.column.index !== 3) return;

          const pageStr = String(data.cell.text?.[0] ?? "").trim();
          if (!pageStr) return;

          const pageNum = parseInt(pageStr, 10);
          if (Number.isNaN(pageNum)) return;

          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            pageNumber: pageNum,
          });
        },
      });

      for (let i = 0; i < boletinData.length; i++) {
        const os = boletinData[i];
        const currentPage = detailsStartPage + i;

        safeSetProgress(
          30 + Math.floor((i / Math.max(1, boletinData.length)) * 65)
        );

        doc.addPage();
        addHeader(currentPage, totalPages);

        doc.setFillColor(...lightGray);
        doc.roundedRect(margin, 30, contentWidth, 25, 3, 3, "F");

        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text(`${os.id} – ${os.nombre}`, margin + 10, 42);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...mediumGray);

        const subtitle = [
          `VIGENCIA ${vigenciaLabel}`,
        ]
          .filter(Boolean)
          .join("  |  ");

        doc.text(subtitle, margin + 10, 50);

        let currentY = 65;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...primaryColor);
        doc.text("Valores de Referencia", margin, currentY);
        currentY += 6;

        const valuesData: Array<[string, string]> = [
          ["Consulta", `$${formatCurrency(os.consulta)}`],
          ...(os.consultaEspecial > 0
            ? ([["Consulta Especial", `$${formatCurrency(os.consultaEspecial)}`]] as Array<
                [string, string]
              >)
            : []),
          ["Galeno Quirúrgico", `$${formatCurrency(os.galenoQuirurgico)}`],
          ["Gastos Quirúrgicos", `$${formatCurrency(os.gastosQuirurgicos)}`],
          ["Galeno Práctica", `$${formatCurrency(os.galenoPractica)}`],
          ["Galeno Radiológico", `$${formatCurrency(os.galenoRadiologico)}`],
          ["Gastos Radiológicos", `$${formatCurrency(os.gastosRadiologicos)}`],
          ["Gastos Bioquímicos", `$${formatCurrency(os.gastosBioquimicos)}`],
          ["Otros Gastos", `$${formatCurrency(os.otrosGastos)}`],
          ["Galeno Cirugía Adultos", `$${formatCurrency(os.galenoCirugiaAdultos)}`],
          ["Galeno Cirugía Infantil", `$${formatCurrency(os.galenoCirugiaInfantil)}`],
        ];

        // TABLA A ANCHO COMPLETO (ocupa el espacio restante)
        autoTable(doc, {
          startY: currentY,
          body: valuesData,
          margin: { left: margin, right: margin, bottom: 22 },
          tableWidth: contentWidth,
          styles: {
            fontSize: 10,
            cellPadding: 5,
            textColor: primaryColor,
            lineColor: lightGray,
            lineWidth: 0.1,
          },
          columnStyles: {
            0: { fontStyle: "normal", textColor: mediumGray, cellWidth: contentWidth * 0.68 },
            1: { fontStyle: "bold", halign: "right", cellWidth: contentWidth * 0.32 },
          },
          alternateRowStyles: { fillColor: [248, 250, 252] },
        });





        addFooter(currentPage, totalPages);
      }

      safeSetProgress(100);
      doc.save("Boletin_de_Valores.pdf");
    } catch (e) {
      if (mountedRef.current) setLoadError(axiosErrorMessage(e));
    } finally {
      generatingRef.current = false;
      safeSetIsGenerating(false);
      safeSetProgress(0);
    }
  }, [boletinData, safeSetIsGenerating, safeSetProgress, vigenciaLabel, vigenciaMonthYear]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Boletín de Valores</h1>
        <p className={styles.subtitle}>
          Genera el documento oficial con los valores de referencia para todas las Obras Sociales
        </p>
      </div>

      <div className={styles.info}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Obras Sociales incluidas</span>
          <span className={styles.infoValue}>{boletinData.length}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Formato</span>
          <span className={styles.infoValue}>PDF</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Última actualización</span>
          <span className={styles.infoValue}>{lastUpdateLabel}</span>
        </div>
      </div>

      <div className={styles.infoVigencia}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Vigencia</span>
          <div className={styles.datePickerWrap}>
            <DatePicker
              selected={vigenciaDate}
              onChange={(d) => {
                userTouchedVigenciaRef.current = true;
                setVigenciaDate(d as Date | null);
              }}
              value={vigenciaInput}
              onChangeRaw={(e) => {
                userTouchedVigenciaRef.current = true;
                const raw = String((e?.target as HTMLInputElement | undefined)?.value ?? "");
                setVigenciaInput(raw);

                const t = raw.trim();
                if (!t) {
                  setVigenciaError(false);
                  setVigenciaDate(null);
                  return;
                }

                const parsed = parseDateDDMMYYYY(t);
                if (parsed) {
                  setVigenciaError(false);
                  setVigenciaDate(parsed);
                } else {
                  setVigenciaError(t.length >= 6);
                }
              }}
              onBlur={() => {
                const t = vigenciaInput.trim();
                if (!t) {
                  setVigenciaError(false);
                  return;
                }
                setVigenciaError(!parseDateDDMMYYYY(t));
              }}
              locale="es"
              dateFormat="dd/MM/yyyy"
              placeholderText="dd/mm/aaaa"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              scrollableYearDropdown
              yearDropdownItemNumber={60}
              popperPlacement="bottom-start"
              showPopperArrow={false}
              disabled={isGenerating || isLoading}
              calendarClassName={styles.datePickerCalendar}
              popperClassName={styles.datePickerPopper}
              customInput={<VigenciaDateInput hasError={vigenciaError} placeholder="dd/mm/aaaa" />}
            />
          </div>
      </div>

      {loadError ? <p className={styles.subtitle}>{loadError}</p> : null}

      {isGenerating ? (
        <div className={styles.progress}>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
          <span className={styles.progressText}>Generando PDF... {progress}%</span>
        </div>
      ) : null}

      <Button
        variant="primary"
        size="medium"
        onClick={generatePDF}
        disabled={isGenerating || isLoading || boletinData.length === 0 || vigenciaError}
        type="button"
      >
        {isGenerating || isLoading ? (
          <>
            <Cargando size={20} className={styles.spinner} />
            {isGenerating ? "Generando..." : "Cargando..."}
          </>
        ) : (
          <>
            <Download size={20} />
            Generar Boletín de Valores
          </>
        )}
      </Button>
      </div>
    </div>
  );
};

export default GenerarBoletin;
