"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Users,
  Search,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  X,
} from "lucide-react";

import styles from "./AfiliadosPorObraSocialPage.module.scss";
import Button from "../../../website/components/UI/Button/Button";
import { useLocation, useNavigate } from "react-router-dom";
import Logo from "../../assets/logoCMC.png";

type ObraSocial = {
  NRO_OBRA_SOCIAL: number;
  NOMBRE: string;
  CODIGO?: string | null;
  ACTIVA?: "S" | "N" | string;
};

type Socio = {
  id?: number | string | null;
  nro_socio?: string | number | null;
  socio?: string | number | null;
  nombre?: string | null;
  apellido_nombre?: string | null;
  ape_nom?: string | null;
  matricula_prov?: string | number | null;
  estado?: string | null;
  telefono_consulta?: string | null;
  especialidad?: string | null;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "/api";

const ENDPOINTS = {
  obrasSociales: `${API_BASE}/api/obras_social/`,
  medicosByOS: (nroOS: number) =>
    `${API_BASE}/api/padrones/obras-sociales/${nroOS}/medicos`,
};

function fmtDate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function safeStr(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function pickNombre(p: Socio) {
  return p.apellido_nombre ?? p.ape_nom ?? p.nombre ?? "";
}

function pickNroPrestador(p: Socio) {
  return p.nro_socio ?? p.socio ?? "";
}

function pickMatriculaProv(p: Socio) {
  return p.matricula_prov ?? "";
}

function pickTelefonoConsulta(p: Socio) {
  return p.telefono_consulta ?? "";
}

function pickEspecialidad(p: Socio) {
  return p.especialidad ?? "";
}

function mapObraSocialRawToOS(raw: any): ObraSocial {
  const nro =
    raw?.NRO_OBRA_SOCIAL ??
    raw?.NRO_OBRASOCIAL ??
    raw?.nro_obra_social ??
    raw?.nro_obrasocial ??
    0;
  const nombre =
    raw?.NOMBRE ?? raw?.OBRA_SOCIAL ?? raw?.obra_social ?? raw?.nombre ?? "";
  const codigo =
    raw?.CODIGO ??
    (Number.isFinite(Number(nro))
      ? `OS${String(Number(nro)).padStart(3, "0")}`
      : null);
  const activa = raw?.ACTIVA ?? raw?.MARCA ?? undefined;

  return {
    NRO_OBRA_SOCIAL: Number(nro),
    NOMBRE: String(nombre),
    CODIGO: codigo,
    ACTIVA: activa,
  };
}

async function fetchObrasSociales(): Promise<ObraSocial[]> {
  const { data } = await axios.get(ENDPOINTS.obrasSociales);
  const arr = Array.isArray(data) ? data : [];
  return arr
    .map(mapObraSocialRawToOS)
    .sort((a, b) => a.NOMBRE.localeCompare(b.NOMBRE));
}

async function fetchMedicosAllPages(nroOS: number): Promise<Socio[]> {
  const PAGE_SIZE = 200;
  let page = 1;
  let total = Infinity;
  const out: Socio[] = [];

  while (out.length < total) {
    const { data } = await axios.get(ENDPOINTS.medicosByOS(nroOS), {
      params: { page, size: PAGE_SIZE },
      // withCredentials: true,
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    total = Number.isFinite(data?.total) ? data.total : items.length;

    for (const it of items) {
      const id = it?.ID ?? it?.id ?? null;
      const nro = it?.NRO_SOCIO ?? null;
      const nombre = it?.NOMBRE ?? null;
      const matricula_prov = it?.MATRICULA_PROV ?? null;
      const telefono_consulta = it?.TELEFONO_CONSULTA ?? null;
      const especialidad = it?.ESPECIALIDAD ?? null;

      out.push({
        id,
        nro_socio: nro,
        socio: nro,

        apellido_nombre: nombre,
        nombre: nombre,
        matricula_prov: matricula_prov,
        telefono_consulta: telefono_consulta,
        especialidad: especialidad,
      });
    }

    if (items.length === 0) break;
    page += 1;
    if (page > 10000) break;
  }

  return out;
}

const AfiliadosPorObraSocialPage = () => {
  const [obras, setObras] = useState<ObraSocial[]>([]);
  const [loadingObras, setLoadingObras] = useState(true);
  const [errorObras, setErrorObras] = useState<string | null>(null);

  const [selectedOS, setSelectedOS] = useState<ObraSocial | null>(null);

  const [prestador, setPrestadores] = useState<Socio[]>([]);
  const [loadingPrestadores, setLoadingPrestadores] = useState(false);
  const [errorPrestadores, setErrorPrestadores] = useState<string | null>(null);

  const [osQuery, setOsQuery] = useState("");
  const [tableQuery, setTableQuery] = useState("");

  const [osDropdownOpen, setOsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  function goToDoctorPadrones(id: unknown) {
    const v = String(id ?? "").trim();
    if (!v) {
      window.alert("Falta ID del médico.");
      return;
    }
    // respaldo por si el state no viaja (refresh)
    sessionStorage.setItem("cmc_open_padrones_next", "1");

    navigate(`/panel/doctors/${encodeURIComponent(v)}`, {
      state: { fromPath: location.pathname },
    });
  }

  // Cargar obras sociales desde /obras-sociales
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingObras(true);
        setErrorObras(null);
        const rows = await fetchObrasSociales();
        if (!alive) return;
        setObras(rows);
      } catch (e) {
        if (!alive) return;
        setErrorObras("No se pudieron cargar las obras sociales.");
      } finally {
        if (!alive) return;
        setLoadingObras(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Cerrar dropdown al click afuera
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!osDropdownOpen) return;
      if (!dropdownRef.current) return;
      const t = e.target as Node;
      if (!dropdownRef.current.contains(t)) setOsDropdownOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [osDropdownOpen]);

  // Cargar prestadores (médicos del padrón) cuando cambia la OS
  useEffect(() => {
    if (!selectedOS?.NRO_OBRA_SOCIAL) {
      setPrestadores([]);
      setErrorPrestadores(null);
      return;
    }

    let alive = true;
    (async () => {
      try {
        setLoadingPrestadores(true);
        setErrorPrestadores(null);
        setTableQuery("");

        const rows = await fetchMedicosAllPages(selectedOS.NRO_OBRA_SOCIAL);
        if (!alive) return;
        setPrestadores(rows);
      } catch (e) {
        if (!alive) return;
        setErrorPrestadores(
          "No se pudieron cargar los prestadores de esta obra social."
        );
        setPrestadores([]);
      } finally {
        if (!alive) return;
        setLoadingPrestadores(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedOS?.NRO_OBRA_SOCIAL]);

  // Filtrar lista de OS client-side
  const filteredOS = useMemo(() => {
    const q = normalize(osQuery);
    if (!q) return obras;

    return obras.filter((os) => {
      const name = normalize(os.NOMBRE ?? "");
      const code = normalize(
        os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`
      );
      return name.includes(q) || code.includes(q);
    });
  }, [obras, osQuery]);

  // Filtrado de tabla client-side
  const filteredPrestadores = useMemo(() => {
    const q = normalize(tableQuery);
    if (!q) return prestador;

    return prestador.filter((a) => {
      const nro = normalize(safeStr(pickNroPrestador(a)));
      const nom = normalize(safeStr(pickNombre(a)));
      const mat = normalize(safeStr(pickMatriculaProv(a)));
      const tel = normalize(safeStr(pickTelefonoConsulta(a)));
      const esp = normalize(safeStr(pickEspecialidad(a)));
      return (
        nro.includes(q) ||
        nom.includes(q) ||
        mat.includes(q) ||
        tel.includes(q) ||
        esp.includes(q)
      );
    });
  }, [prestador, tableQuery]);

  function getExportRows() {
    return filteredPrestadores.map((a) => ({
      nro_socio: safeStr(pickNroPrestador(a)),
      nombre: safeStr(pickNombre(a)),
      matricula_prov: safeStr(pickMatriculaProv(a)),
      telefono_consulta: safeStr(pickTelefonoConsulta(a)),
      especialidad: safeStr(pickEspecialidad(a)),
    }));
  }

  async function downloadExcel() {
    if (!selectedOS) return;
    if (filteredPrestadores.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.");
      return;
    }

    const rows = getExportRows();
    const wb = new ExcelJS.Workbook();
    wb.creator = "CMC";
    wb.created = new Date();

    const ws = wb.addWorksheet("Prestadores", {
      views: [{ state: "frozen", ySplit: 6 }],
      pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    const C = {
      titleBlue: "FF0B1F3A",
      black: "FF111111",
      white: "FFFFFFFF",
      gray100: "FFF7F7F7",
    };

    ws.columns = [
      { header: "N° Socio", key: "nro_socio", width: 14 },
      { header: "Prestador", key: "nombre", width: 42 },
      { header: "Matricula Prov", key: "matricula_prov", width: 16 },
      { header: "Telefono", key: "telefono_consulta", width: 18 },
      { header: "Especialidad", key: "especialidad", width: 28 },
    ];

    ws.mergeCells("A2:E2");
    ws.getCell("A2").value = "Prestadores por Obra Social";
    ws.getCell("A2").font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: C.titleBlue },
    };
    ws.getCell("A2").alignment = { vertical: "middle", horizontal: "left" };

    ws.mergeCells("A3:E3");
    const osCode =
      selectedOS.CODIGO ??
      `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
    ws.getCell("A3").value = `${
      selectedOS.NOMBRE
    } (${osCode}) • Generado: ${fmtDate(new Date())} • Filas: ${rows.length}`;
    ws.getCell("A3").font = { name: "Calibri", size: 11, color: { argb: C.black } };
    ws.getCell("A3").alignment = { vertical: "middle", horizontal: "left" };

    ws.getRow(4).height = 6;

    const headerRow = 6;
    ws.getRow(headerRow).values = [
      "N° Socio",
      "Prestador",
      "Matricula Prov",
      "Telefono",
      "Especialidad",
    ];
    ws.getRow(headerRow).height = 20;

    const tableBorder = {
      top: { style: "thin" as const, color: { argb: C.black } },
      left: { style: "thin" as const, color: { argb: C.black } },
      bottom: { style: "thin" as const, color: { argb: C.black } },
      right: { style: "thin" as const, color: { argb: C.black } },
    };

    ws.getRow(headerRow).eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = tableBorder;
    });

    rows.forEach((r, idx) => {
      const row = ws.addRow(r);
      row.height = 18;

      const zebraFill = idx % 2 === 0 ? C.white : C.gray100;

      row.eachCell((cell, col) => {
        cell.font = { name: "Calibri", size: 11, color: { argb: C.black } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraFill } };
        cell.border = tableBorder;

        if (col === 2 || col === 5) {
          cell.alignment = {
            vertical: "middle",
            horizontal: "left",
            wrapText: true,
          };
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        }
      });
    });

    const endRow = ws.lastRow?.number ?? headerRow + 1;
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: endRow, column: 5 },
    };

    ws.getRow(1).height = 6;

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `prestadores_${osCode}_${fmtDate(new Date())}.xlsx`
    );
  }

  function downloadPdf() {
    if (!selectedOS) return;
    if (filteredPrestadores.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.");
      return;
    }

    const osCode =
      selectedOS.CODIGO ??
      `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`;

    const rows = getExportRows().map((r) => [
      r.nro_socio,
      r.nombre,
      r.matricula_prov,
      r.telefono_consulta,
      r.especialidad,
    ]);

    const doc = new jsPDF({ orientation: "landscape" });

    const FOOTER_EMAIL = "padrones@colegiomedicocorrientes.com";
    const FOOTER_PHONE = "+54 3794 252323";

    const LOGO_DATA_URL = Logo;
    const HEADER_TOP = 10;
    const HEADER_HEIGHT = 30;
    const FOOTER_HEIGHT = 14;

    function drawHeader() {
      const pageWidth = doc.internal.pageSize.getWidth();

      const logoX = 14;
      const logoY = HEADER_TOP;
      const logoW = 22;
      const logoH = 28;

      if (LOGO_DATA_URL) {
        try {
          doc.addImage(LOGO_DATA_URL, "PNG", logoX, logoY, logoW, logoH);
        } catch {
          doc.setDrawColor(0);
          doc.rect(logoX, logoY, logoW, logoH);
          doc.setFontSize(10);
          doc.text("CMC", logoX + 4, logoY + 11);
        }
      } else {
        doc.setDrawColor(0);
        doc.rect(logoX, logoY, logoW, logoH);
        doc.setFontSize(10);
        doc.text("CMC", logoX + 4, logoY + 11);
      }

      doc.setTextColor(0);

      doc.setFontSize(14);
      doc.text("Colegio Médico de Corrientes", logoX + logoW + 8, logoY + 7);

      doc.setFontSize(12);
      doc.text("Listado por Prestadores", logoX + logoW + 8, logoY + 14);

      doc.setFontSize(10);
      doc.text(
        `${selectedOS?.NOMBRE} (${osCode}) • ${fmtDate(new Date())} • Filas: ${rows.length}`,
        logoX + logoW + 8,
        logoY + 21
      );

      doc.setDrawColor(0);
      doc.line(14, HEADER_TOP + HEADER_HEIGHT - 2, pageWidth - 14, HEADER_TOP + HEADER_HEIGHT - 2);
    }

    function drawFooter() {
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageNumber = doc.internal.pages.length;

      doc.setDrawColor(0);
      doc.line(14, pageHeight - FOOTER_HEIGHT, pageWidth - 14, pageHeight - FOOTER_HEIGHT);

      doc.setFontSize(9);
      doc.setTextColor(0);

      const y = pageHeight - 6;
      doc.text(`Mail: ${FOOTER_EMAIL}`, 14, y);
      doc.text(`Tel: ${FOOTER_PHONE}`, 14 + 70, y);
      doc.text(`Página ${pageNumber}`, pageWidth - 14, y, { align: "right" });
    }

    autoTable(doc, {
      head: [["N° Socio", "Prestador", "Matricula Prov", "Telefono", "Especialidad"]],
      body: rows,
      startY: HEADER_TOP + HEADER_HEIGHT + 6,
      margin: { top: HEADER_TOP + HEADER_HEIGHT + 6, bottom: FOOTER_HEIGHT + 4, left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 3, valign: "middle" },
      headStyles: {
        fillColor: [17, 17, 17],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [247, 247, 247] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 74 },
        2: { cellWidth: 26 },
        3: { cellWidth: 28 },
        4: { cellWidth: 62 },
      },
      didDrawPage: () => {
        drawHeader();
        drawFooter();
      },
    });

    doc.save(`prestadores_${osCode}_${fmtDate(new Date())}.pdf`);
  }

  function selectOS(os: ObraSocial) {
    setSelectedOS(os);
    setOsDropdownOpen(false);
  }

  const selectedCode = selectedOS
    ? selectedOS.CODIGO ?? `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`
    : "";

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Prestadores por Obra Social</h1>
            <p className={styles.subtitle}>
              Seleccioná una obra social, buscá prestadores y descargá los
              resultados en PDF o Excel
            </p>
          </div>
        </header>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardDescription}>
              Mostrando {filteredPrestadores.length}{" "}
              {filteredPrestadores.length === 1 ? "prestador" : "prestadores"}
            </p>
          </div>

          <div className={styles.cardContent}>
            <div className={styles.topRow}>
              <div className={styles.osPicker} ref={dropdownRef}>
                <button
                  type="button"
                  className={styles.osButton}
                  onClick={() => setOsDropdownOpen((v) => !v)}
                  disabled={loadingObras}
                  aria-expanded={osDropdownOpen}
                >
                  <div className={styles.osButtonContent}>
                    <span className={styles.osButtonValue}>
                      {selectedOS
                        ? `${selectedOS.NOMBRE} (${selectedCode})`
                        : "Seleccionar obra social…"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`${styles.chevron} ${
                      osDropdownOpen ? styles.chevronOpen : ""
                    }`}
                  />
                </button>

                {osDropdownOpen && (
                  <div className={styles.dropdown}>
                    <div className={styles.dropdownSearch}>
                      <Search className={styles.searchIconSmall} />
                      <input
                        className={styles.dropdownInput}
                        value={osQuery}
                        onChange={(e) => setOsQuery(e.target.value)}
                        placeholder="Buscar por nombre o código…"
                        aria-label="Buscar obra social"
                      />
                      {osQuery.trim() && (
                        <button
                          className={styles.clearBtn}
                          type="button"
                          onClick={() => setOsQuery("")}
                          title="Limpiar búsqueda"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>

                    <div className={styles.dropdownList}>
                      {loadingObras ? (
                        <div className={styles.emptyMessage}>
                          Cargando obras sociales…
                        </div>
                      ) : errorObras ? (
                        <div className={styles.errorMessage}>
                          <span>{errorObras}</span>
                        </div>
                      ) : filteredOS.length === 0 ? (
                        <div className={styles.emptyMessage}>
                          Sin resultados para "{osQuery}"
                        </div>
                      ) : (
                        filteredOS.map((os) => {
                          const code =
                            os.CODIGO ??
                            `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
                          const active =
                            selectedOS?.NRO_OBRA_SOCIAL === os.NRO_OBRA_SOCIAL;
                          return (
                            <button
                              key={os.NRO_OBRA_SOCIAL}
                              type="button"
                              className={`${styles.dropdownItem} ${
                                active ? styles.dropdownItemActive : ""
                              }`}
                              onClick={() => selectOS(os)}
                            >
                              <span className={styles.dropdownItemName}>
                                {os.NOMBRE}
                              </span>
                              <span className={styles.dropdownItemCode}>
                                {code}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="medium"
                  onClick={downloadPdf}
                  disabled={
                    !selectedOS ||
                    loadingPrestadores ||
                    filteredPrestadores.length === 0
                  }
                >
                  <FileText size={18} />
                  <span>Descargar PDF</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  onClick={downloadExcel}
                  disabled={
                    !selectedOS ||
                    loadingPrestadores ||
                    filteredPrestadores.length === 0
                  }
                >
                  <FileSpreadsheet size={18} />
                  <span>Descargar Excel</span>
                </Button>
              </div>
            </div>

            {selectedOS && (
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} />
                <input
                  className={styles.searchInput}
                  value={tableQuery}
                  onChange={(e) => setTableQuery(e.target.value)}
                  placeholder="Buscar por nombre, N° socio, matrícula, teléfono o especialidad…"
                  disabled={!selectedOS || loadingPrestadores}
                  aria-label="Buscar prestador"
                />
                {tableQuery.trim() && (
                  <button
                    className={styles.clearBtn}
                    type="button"
                    onClick={() => setTableQuery("")}
                    title="Limpiar búsqueda"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}

            {!selectedOS ? (
              <div className={styles.emptyState}>
                <Users size={48} className={styles.emptyIcon} />
                <h3 className={styles.emptyTitle}>Seleccioná una obra social</h3>
                <p className={styles.emptyMessage}>
                  Elegí una obra social del menú desplegable para ver el listado
                  de prestadores
                </p>
              </div>
            ) : loadingPrestadores ? (
              <div className={styles.loadingState}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} />
                </div>
                <p className={styles.loadingText}>Cargando prestadores…</p>
              </div>
            ) : errorPrestadores ? (
              <div className={styles.errorMessage}>
                <span>{errorPrestadores}</span>
              </div>
            ) : (
              <>
                <div className={styles.resultsHeader}>
                  <p className={styles.resultsCount}>
                    Mostrando <strong>{filteredPrestadores.length}</strong> de{" "}
                    <strong>{prestador.length}</strong> prestadores
                  </p>
                </div>

                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>
                          <div className={styles.thContent}>
                            <span>N° Socio</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Nombre Completo</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Matricula Prov</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Telefono</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Especialidad</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Acciones</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPrestadores.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={styles.noResults}>
                            No se encontraron prestadores que coincidan con "
                            {tableQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredPrestadores.map((p, idx) => {
                          const nro = safeStr(pickNroPrestador(p));
                          const nom = safeStr(pickNombre(p));
                          const mat = safeStr(pickMatriculaProv(p));
                          const tel = safeStr(pickTelefonoConsulta(p));
                          const esp = safeStr(pickEspecialidad(p));

                          return (
                            <tr key={`${nro}-${mat}-${idx}`}>
                              <td>{nro}</td>
                              <td className={styles.tdName}>{nom}</td>
                              <td>{mat}</td>
                              <td>{tel}</td>
                              <td>{esp}</td>
                              <td>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="small"
                                  onClick={() => goToDoctorPadrones(p.id)}
                                  disabled={!p.id}
                                >
                                  Editar
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AfiliadosPorObraSocialPage;
