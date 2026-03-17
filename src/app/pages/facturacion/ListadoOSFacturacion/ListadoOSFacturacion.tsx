import {
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import styles from "./ListadoOSFacturacion.module.scss";

type PrestacionTipo = "C" | "P" | "H" | "S";
type RolTipo = "TITULAR" | "AYUDANTE" | "AYUDANTE 2";

type PrestacionRow = {
  id: string;
  nroSocio: string;
  prestador: string;
  matricula: string;
  fechaPrestacion: string;
  codigoPrestacion: string;
  nroAfiliado: string;
  afiliado: string;
  cantidad: number;
  cantTratamiento: number;
  porcentaje: number;
  honorarios: number;
  gastos: number;
  coseguro: number;
  subTotal: number;
  tipo: PrestacionTipo;
  rol: RolTipo;
  documentada: boolean;
};

type PeriodMeta = {
  mes: number;
  anio: number;
  obraSocialCodigo: string;
  obraSocialNombre: string;
  nroFacturaDesde: string;
  nroFacturaHasta: string;
  estado: "ABIERTO" | "CERRADO";
};

const PERIOD_META: PeriodMeta = {
  mes: 2,
  anio: 2026,
  obraSocialCodigo: "285",
  obraSocialNombre: "OBRA SOCIAL DEMO",
  nroFacturaDesde: "0001",
  nroFacturaHasta: "0099",
  estado: "ABIERTO",
};

const INITIAL_ROWS: PrestacionRow[] = [
  {
    id: "1",
    nroSocio: "101",
    prestador: "JUAN PEREZ",
    matricula: "4587",
    fechaPrestacion: "2026-02-02",
    codigoPrestacion: "420101",
    nroAfiliado: "AF-1001",
    afiliado: "MARTA GOMEZ",
    cantidad: 1,
    cantTratamiento: 1,
    porcentaje: 100,
    honorarios: 12500,
    gastos: 2100,
    coseguro: 500,
    subTotal: 14100,
    tipo: "C",
    rol: "TITULAR",
    documentada: false,
  },
  {
    id: "2",
    nroSocio: "145",
    prestador: "ANA LOPEZ",
    matricula: "7821",
    fechaPrestacion: "2026-02-03",
    codigoPrestacion: "420205",
    nroAfiliado: "AF-1002",
    afiliado: "ROBERTO DIAZ",
    cantidad: 2,
    cantTratamiento: 1,
    porcentaje: 80,
    honorarios: 9800,
    gastos: 1800,
    coseguro: 0,
    subTotal: 23200,
    tipo: "P",
    rol: "TITULAR",
    documentada: true,
  },
  {
    id: "3",
    nroSocio: "145",
    prestador: "LUCAS BENITEZ",
    matricula: "7822",
    fechaPrestacion: "2026-02-03",
    codigoPrestacion: "420205",
    nroAfiliado: "AF-1002",
    afiliado: "ROBERTO DIAZ",
    cantidad: 0,
    cantTratamiento: 0,
    porcentaje: 35,
    honorarios: 3500,
    gastos: 0,
    coseguro: 0,
    subTotal: 3500,
    tipo: "H",
    rol: "AYUDANTE",
    documentada: false,
  },
  {
    id: "4",
    nroSocio: "220",
    prestador: "MARIA SOSA",
    matricula: "9130",
    fechaPrestacion: "2026-02-05",
    codigoPrestacion: "430010",
    nroAfiliado: "AF-1003",
    afiliado: "ELENA ACOSTA",
    cantidad: 1,
    cantTratamiento: 3,
    porcentaje: 100,
    honorarios: 15700,
    gastos: 4200,
    coseguro: 1200,
    subTotal: 58500,
    tipo: "S",
    rol: "TITULAR",
    documentada: false,
  },
  {
    id: "5",
    nroSocio: "330",
    prestador: "CARLOS RAMIREZ",
    matricula: "6011",
    fechaPrestacion: "2026-02-08",
    codigoPrestacion: "440020",
    nroAfiliado: "AF-1004",
    afiliado: "LAURA MORALES",
    cantidad: 1,
    cantTratamiento: 1,
    porcentaje: 90,
    honorarios: 8900,
    gastos: 900,
    coseguro: 300,
    subTotal: 9500,
    tipo: "C",
    rol: "TITULAR",
    documentada: true,
  },
  {
    id: "6",
    nroSocio: "402",
    prestador: "PABLO GIMENEZ",
    matricula: "7777",
    fechaPrestacion: "2026-02-10",
    codigoPrestacion: "450010",
    nroAfiliado: "AF-1005",
    afiliado: "NORA VELAZQUEZ",
    cantidad: 1,
    cantTratamiento: 2,
    porcentaje: 75,
    honorarios: 6700,
    gastos: 1200,
    coseguro: 0,
    subTotal: 15800,
    tipo: "P",
    rol: "TITULAR",
    documentada: false,
  },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const getTipoLabel = (tipo: PrestacionTipo) => {
  switch (tipo) {
    case "C":
      return "CONSULTA";
    case "P":
      return "PRACTICA";
    case "H":
      return "HONORARIO";
    case "S":
      return "SANATORIO";
    default:
      return "OTRO";
  }
};

const getRolLabel = (tipo: PrestacionTipo, rol: RolTipo) => {
  if (rol === "AYUDANTE") return "AYUDANTE";
  if (rol === "AYUDANTE 2") return "AYUDANTE 2";
  return getTipoLabel(tipo);
};

const formatCurrency = (value: number) =>
  value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("es-AR");
};

const formatFileSafe = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");

const ListadoOSFacturacion = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState<PrestacionRow[]>(INITIAL_ROWS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const deferredSearch = useDeferredValue(search);

  // Legacy-like condition from PHP.
  const showCoseguro = useMemo(
    () =>
      PERIOD_META.obraSocialCodigo === "285" ||
      PERIOD_META.obraSocialCodigo === "256",
    []
  );

  const isPeriodOpen = PERIOD_META.estado === "ABIERTO";

  const filteredRows = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    if (!term) {
      return rows;
    }

    return rows.filter((row) => {
      const haystack = [
        row.nroSocio,
        row.prestador,
        row.matricula,
        row.codigoPrestacion,
        row.nroAfiliado,
        row.afiliado,
        getTipoLabel(row.tipo),
        getRolLabel(row.tipo, row.rol),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [deferredSearch, rows]);

  const exportableRows = useMemo(() => {
    if (selectedIds.size === 0) {
      return filteredRows;
    }

    return filteredRows.filter((row) => selectedIds.has(row.id));
  }, [filteredRows, selectedIds]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredRows.length / pageSize));
  }, [filteredRows.length, pageSize]);

  const safePage = Math.min(page, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredRows.slice(start, end);
  }, [filteredRows, pageSize, safePage]);

  const allVisibleSelected = useMemo(() => {
    if (paginatedRows.length === 0) return false;
    return paginatedRows.every((row) => selectedIds.has(row.id));
  }, [paginatedRows, selectedIds]);

  const columnCount = useMemo(() => {
    let total = 13; // base visible columns without COSEGURO and without ACCIONES

    if (showCoseguro) total += 1;
    if (isPeriodOpen) total += 1;

    return total;
  }, [showCoseguro, isPeriodOpen]);

  const selectedCount = selectedIds.size;

  const selectedRowsTotal = useMemo(() => {
    if (selectedIds.size === 0) return 0;

    let total = 0;
    for (const row of rows) {
      if (selectedIds.has(row.id)) {
        total += row.subTotal;
      }
    }
    return total;
  }, [rows, selectedIds]);

  const totalGeneral = useMemo(() => {
    return rows.reduce((acc, row) => acc + row.subTotal, 0);
  }, [rows]);

  const exportTotal = useMemo(() => {
    return exportableRows.reduce((acc, row) => acc + row.subTotal, 0);
  }, [exportableRows]);

  const exportBaseName = useMemo(() => {
    const os = formatFileSafe(PERIOD_META.obraSocialNombre);
    return `listado_os_facturacion_${PERIOD_META.obraSocialCodigo}_${os}_${PERIOD_META.mes}-${PERIOD_META.anio}`;
  }, []);

  const handleBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleSearchChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
      setPage(1);
    },
    []
  );

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setPageSize(Number(event.target.value));
      setPage(1);
    },
    []
  );

  const toggleRowSelection = useCallback((rowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }

      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (allVisibleSelected) {
        paginatedRows.forEach((row) => next.delete(row.id));
      } else {
        paginatedRows.forEach((row) => next.add(row.id));
      }

      return next;
    });
  }, [allVisibleSelected, paginatedRows]);

  const handleToggleDocumentada = useCallback((rowId: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, documentada: !row.documentada } : row
      )
    );

    // TODO backend:
    // POST toggle documentada.
    // Revalidar permisos, existencia del registro y estado del período.
  }, []);

  const handleDelete = useCallback((rowId: string) => {
    const confirmed = window.confirm(
      "¿Seguro que querés eliminar esta prestación?"
    );

    if (!confirmed) return;

    setRows((prev) => prev.filter((row) => row.id !== rowId));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });

    // TODO backend:
    // DELETE real.
    // Nunca confiar en el ID enviado desde frontend sin control de permisos.
  }, []);

  const handleEdit = useCallback((rowId: string) => {
    // TODO router/backend:
    // Navegar a edición real, ej. /panel/facturacion/prestacion/:id/editar
    console.log("Editar prestación:", rowId);
  }, []);

  const handleMoveToNextPeriod = useCallback((rowId: string) => {
    const confirmed = window.confirm(
      "¿Mover esta prestación al próximo período?"
    );

    if (!confirmed) return;

    // TODO backend:
    // Acción crítica: mover al próximo período.
    // Revalidar que el período actual siga abierto y que el registro sea movible.
    console.log("Mover al próximo período:", rowId);
  }, []);

  const goPrevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goNextPage = useCallback(() => {
    setPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const handleExportPdf = useCallback(() => {
    if (exportableRows.length === 0) return;

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
      compress: true,
    });

    const headers = [
      "SOCIO",
      "PRESTADOR",
      "MATRI.",
      "FECHA",
      "CÓDIGO",
      "NRO. AFILIADO",
      "AFILIADO",
      "CANT.",
      "CANT. TRAT.",
      "%",
      "HONORARIOS",
      "GASTOS",
      ...(showCoseguro ? ["COSEGURO"] : []),
      "SUBTOTAL",
      "TIPO / ROL",
      "DOC.",
    ];

    const body = exportableRows.map((row) => [
      row.nroSocio,
      row.prestador,
      row.matricula,
      formatDate(row.fechaPrestacion),
      row.codigoPrestacion,
      row.nroAfiliado,
      row.afiliado,
      row.cantidad,
      row.cantTratamiento,
      row.porcentaje.toFixed(2),
      formatCurrency(row.honorarios),
      formatCurrency(row.gastos),
      ...(showCoseguro ? [formatCurrency(row.coseguro)] : []),
      formatCurrency(row.subTotal),
      getRolLabel(row.tipo, row.rol),
      row.documentada ? "SI" : "NO",
    ]);

    autoTable(doc, {
      margin: { top: 110, right: 24, bottom: 28, left: 24 },
      head: [headers],
      body,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 5,
        textColor: [31, 41, 55],
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [246, 244, 251],
        textColor: [88, 28, 135],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [250, 250, 252],
      },
      bodyStyles: {
        minCellHeight: 22,
      },
      didParseCell: (data) => {
        if (data.section === "body") {
          const row = exportableRows[data.row.index];

          if (row?.documentada) {
            data.cell.styles.fillColor = [255, 251, 235];
          }
        }
      },
      didDrawPage: (data) => {
        doc.setFillColor(245, 243, 255);
        doc.rect(24, 20, doc.internal.pageSize.getWidth() - 48, 68, "F");

        doc.setTextColor(76, 29, 149);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text("Listado O.S. Facturación", 36, 44);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(
          `Obra social: ${PERIOD_META.obraSocialCodigo} · ${PERIOD_META.obraSocialNombre}`,
          36,
          62
        );
        doc.text(
          `Período: ${PERIOD_META.mes}/${PERIOD_META.anio} · Factura: ${PERIOD_META.nroFacturaDesde} - ${PERIOD_META.nroFacturaHasta} · Estado: ${PERIOD_META.estado}`,
          36,
          76
        );

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text(
          `Registros exportados: ${exportableRows.length}`,
          doc.internal.pageSize.getWidth() - 210,
          50
        );
        doc.text(
          `Total exportado: $${formatCurrency(exportTotal)}`,
          doc.internal.pageSize.getWidth() - 210,
          68
        );

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(
          `Página ${data.pageNumber}`,
          doc.internal.pageSize.getWidth() - 60,
          doc.internal.pageSize.getHeight() - 12
        );
      },
    });

    doc.save(`${exportBaseName}.pdf`);

    // Seguridad:
    // Este PDF es una exportación de frontend para UX.
    // El backend debe poder generar una versión oficial/validada si el documento es crítico.
  }, [exportBaseName, exportTotal, exportableRows, showCoseguro]);

  const handleExportExcel = useCallback(async () => {
    if (exportableRows.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CMC";
    workbook.lastModifiedBy = "CMC";
    workbook.created = new Date();
    workbook.modified = new Date();

    const worksheet = workbook.addWorksheet("Listado O.S. Facturación", {
      views: [{ state: "frozen", ySplit: 6 }],
    });

    const sheetColumns: Array<{
      header: string;
      key: string;
      width: number;
      isCurrency?: boolean;
    }> = [
      { header: "SOCIO", key: "nroSocio", width: 12 },
      { header: "PRESTADOR", key: "prestador", width: 24 },
      { header: "MATRI.", key: "matricula", width: 12 },
      { header: "FECHA", key: "fechaPrestacion", width: 14 },
      { header: "CÓDIGO", key: "codigoPrestacion", width: 14 },
      { header: "NRO. AFILIADO", key: "nroAfiliado", width: 18 },
      { header: "AFILIADO", key: "afiliado", width: 24 },
      { header: "CANT.", key: "cantidad", width: 10 },
      { header: "CANT. TRAT.", key: "cantTratamiento", width: 14 },
      { header: "%", key: "porcentaje", width: 10 },
      { header: "HONORARIOS", key: "honorarios", width: 16, isCurrency: true },
      { header: "GASTOS", key: "gastos", width: 14, isCurrency: true },
      ...(showCoseguro
        ? [
            {
              header: "COSEGURO",
              key: "coseguro",
              width: 14,
              isCurrency: true,
            },
          ]
        : []),
      { header: "SUBTOTAL", key: "subTotal", width: 16, isCurrency: true },
      { header: "TIPO / ROL", key: "tipoRol", width: 18 },
      { header: "DOC.", key: "documentada", width: 12 },
    ];

    worksheet.columns = sheetColumns.map((column) => ({
      key: column.key,
      width: column.width,
    }));

    const totalColumns = sheetColumns.length;

    worksheet.mergeCells(1, 1, 1, totalColumns);
    worksheet.mergeCells(2, 1, 2, totalColumns);
    worksheet.mergeCells(3, 1, 3, totalColumns);
    worksheet.mergeCells(4, 1, 4, totalColumns);

    worksheet.getCell(1, 1).value = "LISTADO O.S. FACTURACIÓN";
    worksheet.getCell(2, 1).value = `Obra social: ${PERIOD_META.obraSocialCodigo} · ${PERIOD_META.obraSocialNombre}`;
    worksheet.getCell(3, 1).value = `Período: ${PERIOD_META.mes}/${PERIOD_META.anio} · Factura: ${PERIOD_META.nroFacturaDesde} - ${PERIOD_META.nroFacturaHasta} · Estado: ${PERIOD_META.estado}`;
    worksheet.getCell(4, 1).value = `Registros exportados: ${exportableRows.length} · Total exportado: $${formatCurrency(exportTotal)}`;

    worksheet.getCell(1, 1).font = {
      bold: true,
      size: 16,
      color: { argb: "5B21B6" },
    };
    worksheet.getCell(2, 1).font = {
      size: 11,
      color: { argb: "374151" },
    };
    worksheet.getCell(3, 1).font = {
      size: 11,
      color: { argb: "374151" },
    };
    worksheet.getCell(4, 1).font = {
      bold: true,
      size: 11,
      color: { argb: "111827" },
    };

    [1, 2, 3, 4].forEach((rowNumber) => {
      const cell = worksheet.getCell(rowNumber, 1);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowNumber === 1 ? "F3E8FF" : "FAFAFC" },
      };
      cell.alignment = { vertical: "middle", horizontal: "left" };
      cell.border = {
        top: { style: "thin", color: { argb: "E5E7EB" } },
        left: { style: "thin", color: { argb: "E5E7EB" } },
        bottom: { style: "thin", color: { argb: "E5E7EB" } },
        right: { style: "thin", color: { argb: "E5E7EB" } },
      };
    });

    worksheet.getRow(1).height = 26;
    worksheet.getRow(2).height = 22;
    worksheet.getRow(3).height = 22;
    worksheet.getRow(4).height = 22;

    const headerRowIndex = 6;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = ["", ...sheetColumns.map((column) => column.header)];
    headerRow.height = 22;

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: "5B21B6" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "F6F4FB" },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = {
        top: { style: "thin", color: { argb: "E5E7EB" } },
        left: { style: "thin", color: { argb: "E5E7EB" } },
        bottom: { style: "thin", color: { argb: "E5E7EB" } },
        right: { style: "thin", color: { argb: "E5E7EB" } },
      };
    });

    exportableRows.forEach((row, index) => {
      const excelRow = worksheet.addRow({
        nroSocio: row.nroSocio,
        prestador: row.prestador,
        matricula: row.matricula,
        fechaPrestacion: formatDate(row.fechaPrestacion),
        codigoPrestacion: row.codigoPrestacion,
        nroAfiliado: row.nroAfiliado,
        afiliado: row.afiliado,
        cantidad: row.cantidad,
        cantTratamiento: row.cantTratamiento,
        porcentaje: row.porcentaje,
        honorarios: row.honorarios,
        gastos: row.gastos,
        ...(showCoseguro ? { coseguro: row.coseguro } : {}),
        subTotal: row.subTotal,
        tipoRol: getRolLabel(row.tipo, row.rol),
        documentada: row.documentada ? "SI" : "NO",
      });

      excelRow.height = 20;

      excelRow.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "E5E7EB" } },
          left: { style: "thin", color: { argb: "E5E7EB" } },
          bottom: { style: "thin", color: { argb: "E5E7EB" } },
          right: { style: "thin", color: { argb: "E5E7EB" } },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: "left",
        };
      });

      if (index % 2 === 0) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FCFCFE" },
          };
        });
      }

      if (row.documentada) {
        excelRow.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFBEB" },
          };
        });
      }

      sheetColumns.forEach((column, columnIndex) => {
        const cell = excelRow.getCell(columnIndex + 1);

        if (column.isCurrency) {
          cell.numFmt = '"$"#,##0.00';
          cell.alignment = {
            vertical: "middle",
            horizontal: "right",
          };
        }

        if (column.key === "porcentaje") {
          cell.numFmt = "0.00";
          cell.alignment = {
            vertical: "middle",
            horizontal: "right",
          };
        }

        if (
          column.key === "cantidad" ||
          column.key === "cantTratamiento" ||
          column.key === "nroSocio" ||
          column.key === "matricula"
        ) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        }
      });
    });

    const totalRow = worksheet.addRow({});
    const totalRowIndex = totalRow.number;

    worksheet.mergeCells(totalRowIndex, 1, totalRowIndex, Math.max(1, totalColumns - 1));
    worksheet.getCell(totalRowIndex, 1).value = "TOTAL EXPORTADO";
    worksheet.getCell(totalRowIndex, totalColumns).value = exportTotal;

    worksheet.getCell(totalRowIndex, 1).font = {
      bold: true,
      color: { argb: "111827" },
    };
    worksheet.getCell(totalRowIndex, totalColumns).font = {
      bold: true,
      color: { argb: "111827" },
    };
    worksheet.getCell(totalRowIndex, totalColumns).numFmt = '"$"#,##0.00';

    for (let col = 1; col <= totalColumns; col += 1) {
      const cell = worksheet.getCell(totalRowIndex, col);
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "ECFDF5" },
      };
      cell.border = {
        top: { style: "thin", color: { argb: "D1FAE5" } },
        left: { style: "thin", color: { argb: "D1FAE5" } },
        bottom: { style: "thin", color: { argb: "D1FAE5" } },
        right: { style: "thin", color: { argb: "D1FAE5" } },
      };
      cell.alignment = {
        vertical: "middle",
        horizontal: col === totalColumns ? "right" : "left",
      };
    }

    worksheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: totalColumns },
    };

    worksheet.pageSetup = {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `${exportBaseName}.xlsx`);

    // Seguridad:
    // Esto es una exportación de cliente para UX.
    // Para cierres o documentos oficiales, idealmente el backend debe poder generar una versión auditable.
  }, [exportBaseName, exportTotal, exportableRows, showCoseguro]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleBack}
          >
            <ArrowLeft size={18} />
            <span>Volver</span>
          </button>
        </div>

        <div className={styles.headerMain}>
          <div>
            <h1 className={styles.title}>Listado O.S. Facturación</h1>
            <p className={styles.subtitle}>
              Vista detallada de prestaciones facturadas por obra social, con
              selección múltiple y exportación elegante a PDF y Excel.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={handleExportPdf}
              disabled={exportableRows.length === 0}
            >
              <FileText size={18} />
              <span>Exportar PDF</span>
            </button>

            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => void handleExportExcel()}
              disabled={exportableRows.length === 0}
            >
              <FileSpreadsheet size={18} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </div>

      <section className={styles.periodCard}>
        <div className={styles.periodGrid}>
          <div className={styles.periodItem}>
            <span className={styles.periodLabel}>Período</span>
            <strong className={styles.periodValue}>
              {PERIOD_META.mes}/{PERIOD_META.anio}
            </strong>
          </div>

          <div className={styles.periodItem}>
            <span className={styles.periodLabel}>Obra social</span>
            <strong className={styles.periodValue}>
              {PERIOD_META.obraSocialCodigo} · {PERIOD_META.obraSocialNombre}
            </strong>
          </div>

          <div className={styles.periodItem}>
            <span className={styles.periodLabel}>Factura</span>
            <strong className={styles.periodValue}>
              {PERIOD_META.nroFacturaDesde} - {PERIOD_META.nroFacturaHasta}
            </strong>
          </div>

          <div className={styles.periodItem}>
            <span className={styles.periodLabel}>Estado</span>
            <strong
              className={`${styles.statusBadge} ${
                isPeriodOpen ? styles.statusOpen : styles.statusClosed
              }`}
            >
              {PERIOD_META.estado}
            </strong>
          </div>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <div className={styles.tableHeading}>
            <h2 className={styles.tableTitle}>Detalle de prestaciones</h2>
            <p className={styles.tableSubtitle}>
              Seleccioná filas individuales o toda la página visible. Si hay
              selección, la exportación usa solo esas filas; si no, exporta el
              resultado filtrado.
            </p>
          </div>

          <div className={styles.toolbarControls}>
            <div className={styles.searchBox}>
              <Search size={18} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                value={search}
                onChange={handleSearchChange}
                placeholder="Buscar por socio, prestador, afiliado, código..."
                autoComplete="off"
              />
            </div>

            <div className={styles.pageSizeBox}>
              <label className={styles.pageSizeLabel} htmlFor="pageSize">
                Filas
              </label>
              <select
                id="pageSize"
                className={styles.pageSizeSelect}
                value={pageSize}
                onChange={handlePageSizeChange}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}/página
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.selectionBar}>
          <div className={styles.selectionInfo}>
            <span className={styles.selectionCount}>
              {selectedCount} seleccionada{selectedCount === 1 ? "" : "s"}
            </span>
            <span className={styles.selectionAmount}>
              Total seleccionado: ${formatCurrency(selectedRowsTotal)}
            </span>
            <span className={styles.selectionExportHint}>
              Exportación actual: {exportableRows.length} fila
              {exportableRows.length === 1 ? "" : "s"}
            </span>
          </div>

          {selectedCount > 0 ? (
            <button
              type="button"
              className={styles.softActionButton}
              onClick={() => setSelectedIds(new Set())}
            >
              Limpiar selección
            </button>
          ) : null}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCol}>
                  <label className={styles.checkboxLabel} aria-label="Seleccionar todo">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                    />
                    <span className={styles.customCheckbox} />
                  </label>
                </th>
                <th>SOCIO</th>
                <th>PRESTADOR</th>
                <th>MATRI.</th>
                <th>FECHA</th>
                <th>CÓDIGO</th>
                <th>CANT.</th>
                <th>%</th>
                <th>HONORARIOS</th>
                <th>GASTOS</th>
                {showCoseguro ? <th>COSEGURO</th> : null}
                <th>SUB. TOTAL</th>
                <th>TIPO / ROL</th>
                {isPeriodOpen ? <th>ACCIONES</th> : null}
              </tr>
            </thead>

            <tbody>
              {paginatedRows.length === 0 ? (
                <tr>
                  <td className={styles.emptyCell} colSpan={columnCount}>
                    No se encontraron resultados para la búsqueda actual.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isSelected = selectedIds.has(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`
                        ${isSelected ? styles.rowSelected : ""}
                        ${row.documentada ? styles.rowMarked : ""}
                      `}
                    >
                      <td className={styles.checkboxCol}>
                        <label
                          className={styles.checkboxLabel}
                          aria-label={`Seleccionar fila ${row.id}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRowSelection(row.id)}
                          />
                          <span className={styles.customCheckbox} />
                        </label>
                      </td>

                      <td>{row.nroSocio}</td>
                      <td className={styles.textCellStrong}>{row.prestador}</td>
                      <td>{row.matricula}</td>
                      <td>{formatDate(row.fechaPrestacion)}</td>
                      <td>{row.codigoPrestacion}</td>
                      <td>
                        {row.rol === "TITULAR"
                          ? `${row.cantidad} - ${row.cantTratamiento}`
                          : "-"}
                      </td>
                      <td>{row.porcentaje.toFixed(2)}</td>
                      <td>${formatCurrency(row.honorarios)}</td>
                      <td>${formatCurrency(row.gastos)}</td>
                      {showCoseguro ? (
                        <td>${formatCurrency(row.coseguro)}</td>
                      ) : null}
                      <td className={styles.amountStrong}>
                        ${formatCurrency(row.subTotal)}
                      </td>
                      <td>
                        <span className={styles.roleBadge}>
                          {getRolLabel(row.tipo, row.rol)}
                        </span>
                      </td>

                      {isPeriodOpen ? (
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => handleEdit(row.id)}
                              aria-label="Editar"
                              title="Editar"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className={`${styles.iconButton} ${styles.iconDanger}`}
                              onClick={() => handleDelete(row.id)}
                              aria-label="Eliminar"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>

                            <button
                              type="button"
                              className={`${styles.iconButton} ${
                                row.documentada ? styles.iconSuccess : ""
                              }`}
                              onClick={() => handleToggleDocumentada(row.id)}
                              aria-label="Marcar documentación"
                              title="Marcar documentación"
                            >
                              <CheckCheck size={16} />
                            </button>

                          
                           
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.tableFooter}>
          <div className={styles.footerStats}>
            <span>{filteredRows.length} registro(s)</span>
            <span>Total general: ${formatCurrency(totalGeneral)}</span>
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={goPrevPage}
              disabled={safePage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <span className={styles.pageIndicator}>
              Página {safePage} de {totalPages}
            </span>

            <button
              type="button"
              className={styles.pageButton}
              onClick={goNextPage}
              disabled={safePage === totalPages}
              aria-label="Página siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Facturación total</span>
          <strong className={styles.summaryValue}>
            ${formatCurrency(totalGeneral)}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Seleccionado</span>
          <strong className={styles.summaryValue}>
            ${formatCurrency(selectedRowsTotal)}
          </strong>
        </div>

        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Exportación actual</span>
          <strong className={styles.summaryValue}>
            ${formatCurrency(exportTotal)}
          </strong>
        </div>
      </section>

      {/* TODO backend:
          - Reemplazar mock INITIAL_ROWS por fetch real.
          - Si el volumen crece, mover filtro/paginación/exportación al server.
          - Para documentos oficiales, idealmente generar PDF/Excel desde backend también.
          - Nunca confiar en IDs seleccionados sin revalidar permisos y estado del período.
      */}
    </div>
  );
};

export default ListadoOSFacturacion;