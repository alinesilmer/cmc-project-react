"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Users, Search, FileSpreadsheet, FileText, X } from "lucide-react";

import styles from "./AfiliadosPorObraSocialPage.module.scss";
import Button from "../../../website/components/UI/Button/Button";
import { useLocation, useNavigate } from "react-router-dom";

type ObraSocial = {
  NRO_OBRA_SOCIAL: number;
  NOMBRE: string;
  CODIGO?: string | null;
  ACTIVA?: "S" | "N" | string;
};

type Prestador = {
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

function pickNombre(p: Prestador) {
  return p.apellido_nombre ?? p.ape_nom ?? p.nombre ?? "";
}

function pickNroPrestador(p: Prestador) {
  return p.nro_socio ?? p.socio ?? "";
}

function pickMatriculaProv(p: Prestador) {
  return p.matricula_prov ?? "";
}

function pickTelefonoConsulta(p: Prestador) {
  return p.telefono_consulta ?? "";
}

function pickEspecialidad(p: Prestador) {
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

function mapItemToPrestador(it: any): Prestador {
  const id = it?.ID ?? it?.id ?? null;
  const nro = it?.NRO_SOCIO ?? null;
  const nombre = it?.NOMBRE ?? null;
  const matricula_prov = it?.MATRICULA_PROV ?? null;
  const telefono_consulta = it?.TELEFONO_CONSULTA ?? null;
  const especialidad = it?.ESPECIALIDAD ?? null;

  return {
    id,
    nro_socio: nro,
    socio: nro,
    apellido_nombre: nombre,
    nombre: nombre,
    matricula_prov: matricula_prov,
    telefono_consulta: telefono_consulta,
    especialidad: especialidad,
  };
}

async function fetchPrestadoresAllPages(nroOS: number): Promise<Prestador[]> {
  const PAGE_SIZE = 200;
  let page = 1;
  const out: Prestador[] = [];
  let total: number | null = null;

  while (true) {
    const { data } = await axios.get(ENDPOINTS.medicosByOS(nroOS), {
      params: { page, size: PAGE_SIZE },
    });

    if (Array.isArray(data)) {
      return data.map(mapItemToPrestador);
    }

    const items = Array.isArray(data?.items) ? data.items : [];
    total = Number.isFinite(data?.total) ? Number(data.total) : total;

    for (const it of items) out.push(mapItemToPrestador(it));

    if (items.length === 0) break;
    if (total !== null && out.length >= total) break;

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

  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
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
      window.alert("Falta ID del prestador.");
      return;
    }
    sessionStorage.setItem("cmc_open_padrones_next", "1");
    navigate(`/panel/doctors/${encodeURIComponent(v)}`, {
      state: { fromPath: location.pathname },
    });
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingObras(true);
        setErrorObras(null);
        const rows = await fetchObrasSociales();
        if (!alive) return;
        setObras(rows);
      } catch {
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

        const rows = await fetchPrestadoresAllPages(selectedOS.NRO_OBRA_SOCIAL);
        if (!alive) return;
        setPrestadores(rows);
      } catch (e: any) {
        if (!alive) return;

        let extra = "";
        if (axios.isAxiosError(e)) {
          const status = e.response?.status;
          const url = e.config?.url;
          extra = ` (HTTP ${status ?? "?"}${url ? ` • ${url}` : ""})`;
        }

        setErrorPrestadores(
          `No se pudieron cargar los prestadores de esta obra social.${extra}`
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

  const filteredPrestadores = useMemo(() => {
    const q = normalize(tableQuery);
    if (!q) return prestadores;

    return prestadores.filter((p) => {
      const nro = normalize(safeStr(pickNroPrestador(p)));
      const nom = normalize(safeStr(pickNombre(p)));
      const mat = normalize(safeStr(pickMatriculaProv(p)));
      const tel = normalize(safeStr(pickTelefonoConsulta(p)));
      const esp = normalize(safeStr(pickEspecialidad(p)));
      return (
        nro.includes(q) ||
        nom.includes(q) ||
        mat.includes(q) ||
        tel.includes(q) ||
        esp.includes(q)
      );
    });
  }, [prestadores, tableQuery]);

  function getExportRows() {
    return filteredPrestadores.map((p) => ({
      nro_socio: safeStr(pickNroPrestador(p)),
      nombre: safeStr(pickNombre(p)),
      matricula_prov: safeStr(pickMatriculaProv(p)),
      telefono_consulta: safeStr(pickTelefonoConsulta(p)),
      especialidad: safeStr(pickEspecialidad(p)),
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

    const osCode =
      selectedOS.CODIGO ??
      `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`;

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
    doc.setFontSize(14);
    doc.text("Prestadores por Obra Social", 14, 14);
    doc.setFontSize(11);
    doc.text(
      `${selectedOS.NOMBRE} (${osCode}) • ${fmtDate(new Date())} • Filas: ${rows.length}`,
      14,
      22
    );

    autoTable(doc, {
      head: [["N° Socio", "Prestador", "Matricula Prov", "Telefono", "Especialidad"]],
      body: rows,
      startY: 28,
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
    });

    doc.save(`prestadores_${osCode}_${fmtDate(new Date())}.pdf`);
  }

  function downloadPdfByEspecialidad() {
    if (!selectedOS) return;
    if (filteredPrestadores.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.");
      return;
    }

    const osCode =
      selectedOS.CODIGO ??
      `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`;

    const groups = new Map<string, Prestador[]>();
    for (const p of filteredPrestadores) {
      const raw = safeStr(pickEspecialidad(p)).trim();
      const key = raw ? raw : "Sin especialidad";
      const arr = groups.get(key) ?? [];
      arr.push(p);
      groups.set(key, arr);
    }

    const keys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b, "es"));
    for (const k of keys) {
      const arr = groups.get(k)!;
      arr.sort((a, b) => safeStr(pickNombre(a)).localeCompare(safeStr(pickNombre(b)), "es"));
    }

    const doc = new jsPDF({ orientation: "landscape" });

    keys.forEach((esp, idx) => {
      if (idx > 0) doc.addPage();

      const arr = groups.get(esp)!;

      doc.setFontSize(14);
      doc.text("Prestadores por Obra Social", 14, 14);

      doc.setFontSize(11);
      doc.text(
        `${selectedOS.NOMBRE} (${osCode}) • ${fmtDate(new Date())} • ${arr.length} ${
          arr.length === 1 ? "prestador" : "prestadores"
        }`,
        14,
        22
      );

      doc.setFontSize(11);
      doc.text(`Especialidad: ${esp}`, 14, 28);

      const body = arr.map((p) => [
        safeStr(pickNroPrestador(p)),
        safeStr(pickNombre(p)),
        safeStr(pickMatriculaProv(p)),
        safeStr(pickTelefonoConsulta(p)),
      ]);

      autoTable(doc, {
        head: [["N° Socio", "Prestador", "Matricula Prov", "Telefono"]],
        body,
        startY: 34,
        styles: { fontSize: 8, cellPadding: 3, valign: "middle" },
        headStyles: {
          fillColor: [17, 17, 17],
          textColor: [255, 255, 255],
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [247, 247, 247] },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 110 },
          2: { cellWidth: 30 },
          3: { cellWidth: 32 },
        },
      });
    });

    doc.save(`prestadores_${osCode}_por_especialidad_${fmtDate(new Date())}.pdf`);
  }

  function selectOS(os: ObraSocial) {
    const code = os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`;
    setSelectedOS(os);
    setOsQuery(`${os.NOMBRE} (${code})`);
    setOsDropdownOpen(false);
  }

  function clearOS() {
    setSelectedOS(null);
    setPrestadores([]);
    setErrorPrestadores(null);
    setTableQuery("");
    setOsQuery("");
    setOsDropdownOpen(false);
  }

  const selectedCode = selectedOS
    ? selectedOS.CODIGO ??
      `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`
    : "";

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Prestadores por Obra Social</h1>
            <p className={styles.subtitle}>
              Buscá una obra social, filtrá prestadores y descargá los resultados
              en PDF o Excel
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
                <div className={styles.dropdownSearch}>
                  <Search className={styles.searchIconSmall} />
                  <input
                    className={styles.dropdownInput}
                    value={osQuery}
                    onFocus={() => setOsDropdownOpen(true)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setOsQuery(v);
                      setOsDropdownOpen(true);
                      if (selectedOS) {
                        setSelectedOS(null);
                        setPrestadores([]);
                        setErrorPrestadores(null);
                        setTableQuery("");
                      }
                    }}
                    placeholder="Buscar obra social por nombre o código…"
                    aria-label="Buscar obra social"
                    disabled={loadingObras}
                  />
                  {(osQuery.trim() || selectedOS) && (
                    <button
                      className={styles.clearBtn}
                      type="button"
                      onClick={clearOS}
                      title="Limpiar selección"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {osDropdownOpen && (
                  <div className={styles.dropdown}>
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
                  variant="secondary"
                  size="medium"
                  onClick={downloadPdfByEspecialidad}
                  disabled={
                    !selectedOS ||
                    loadingPrestadores ||
                    filteredPrestadores.length === 0
                  }
                >
                  <FileText size={18} />
                  <span>PDF por especialidad</span>
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
                <h3 className={styles.emptyTitle}>Buscá una obra social</h3>
                <p className={styles.emptyMessage}>
                  Escribí el nombre o el código para seleccionar una obra social y
                  ver el listado de prestadores
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
                    <strong>{prestadores.length}</strong> prestadores
                  </p>
                  <span className={styles.resultsInfo}>
                    {selectedOS.NOMBRE} ({selectedCode})
                  </span>
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
