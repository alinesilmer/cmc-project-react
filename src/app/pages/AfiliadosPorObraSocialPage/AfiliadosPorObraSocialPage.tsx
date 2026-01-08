"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import axios from "axios"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Users, Search, FileSpreadsheet, FileText, ChevronDown, X } from "lucide-react"

import styles from "./AfiliadosPorObraSocialPage.module.scss"
import Button from "../../../website/components/UI/Button/Button"

type ObraSocial = {
  NRO_OBRA_SOCIAL: number
  NOMBRE: string
  CODIGO?: string | null
  ACTIVA?: "S" | "N" | string
}

type Afiliado = {
  nro_afiliado?: string | number | null
  afiliado?: string | number | null

  nombre?: string | null
  apellido_nombre?: string | null
  ape_nom?: string | null

  documento?: string | number | null
  dni?: string | number | null

  plan?: string | null
  categoria?: string | null

  fecha_alta?: string | null
  alta?: string | null

  fecha_baja?: string | null
  baja?: string | null

  estado?: string | null
}

const API_BASE =
  (import.meta as any).env?.VITE_API_URL?.toString?.() ||
  (import.meta as any).env?.VITE_API_BASE?.toString?.() ||
  "/api"

const ENDPOINTS = {
  obrasSociales: `${API_BASE}/obras-sociales`,
  afiliadosByOS: (nroOS: number) => `${API_BASE}/obras-sociales/${nroOS}/afiliados`,
}

function fmtDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()

function safeStr(v: unknown) {
  if (v === null || v === undefined) return ""
  return String(v)
}

function pickNombre(a: Afiliado) {
  return a.apellido_nombre ?? a.ape_nom ?? a.nombre ?? ""
}

function pickNroAfiliado(a: Afiliado) {
  return a.nro_afiliado ?? a.afiliado ?? ""
}

function pickDocumento(a: Afiliado) {
  return a.documento ?? a.dni ?? ""
}

function pickPlan(a: Afiliado) {
  return a.plan ?? a.categoria ?? ""
}

function pickAlta(a: Afiliado) {
  return a.fecha_alta ?? a.alta ?? ""
}

function pickBaja(a: Afiliado) {
  return a.fecha_baja ?? a.baja ?? ""
}

function pickEstado(a: Afiliado) {
  if (a.estado) return a.estado
  const baja = pickBaja(a)
  return baja ? "INACTIVO" : "ACTIVO"
}

async function fetchObrasSocialesActivas(): Promise<ObraSocial[]> {
  const { data } = await axios.get(ENDPOINTS.obrasSociales, {
    params: { estado: "S" },
  })
  return Array.isArray(data) ? data : []
}

async function fetchAfiliadosByOS(nroOS: number): Promise<Afiliado[]> {
  const { data } = await axios.get(ENDPOINTS.afiliadosByOS(nroOS))
  return Array.isArray(data) ? data : []
}

const AfiliadosPorObraSocialPage = () => {
  const [obras, setObras] = useState<ObraSocial[]>([])
  const [loadingObras, setLoadingObras] = useState(true)
  const [errorObras, setErrorObras] = useState<string | null>(null)

  const [selectedOS, setSelectedOS] = useState<ObraSocial | null>(null)

  const [afiliados, setAfiliados] = useState<Afiliado[]>([])
  const [loadingAfiliados, setLoadingAfiliados] = useState(false)
  const [errorAfiliados, setErrorAfiliados] = useState<string | null>(null)

  const [osQuery, setOsQuery] = useState("")
  const [tableQuery, setTableQuery] = useState("")

  const [osDropdownOpen, setOsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  // Load Obras Sociales
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoadingObras(true)
        setErrorObras(null)
        const rows = await fetchObrasSocialesActivas()
        if (!alive) return
        setObras(rows)
      } catch (e) {
        if (!alive) return
        setErrorObras("No se pudieron cargar las obras sociales.")
      } finally {
        if (!alive) return
        setLoadingObras(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Close dropdown click outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!osDropdownOpen) return
      if (!dropdownRef.current) return
      const t = e.target as Node
      if (!dropdownRef.current.contains(t)) setOsDropdownOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [osDropdownOpen])

  // Load Afiliados when OS changes
  useEffect(() => {
    if (!selectedOS?.NRO_OBRA_SOCIAL) {
      setAfiliados([])
      setErrorAfiliados(null)
      return
    }

    let alive = true
    ;(async () => {
      try {
        setLoadingAfiliados(true)
        setErrorAfiliados(null)
        setTableQuery("")
        const rows = await fetchAfiliadosByOS(selectedOS.NRO_OBRA_SOCIAL)
        if (!alive) return
        setAfiliados(rows)
      } catch (e) {
        if (!alive) return
        setErrorAfiliados("No se pudieron cargar los afiliados de esta obra social.")
        setAfiliados([])
      } finally {
        if (!alive) return
        setLoadingAfiliados(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [selectedOS?.NRO_OBRA_SOCIAL])

  // Filter OS list
  const filteredOS = useMemo(() => {
    const q = normalize(osQuery)
    if (!q) return obras

    return obras.filter((os) => {
      const name = normalize(os.NOMBRE ?? "")
      const code = normalize(os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`)
      return name.includes(q) || code.includes(q)
    })
  }, [obras, osQuery])

  // Filter affiliates table
  const filteredAfiliados = useMemo(() => {
    const q = normalize(tableQuery)
    if (!q) return afiliados

    return afiliados.filter((a) => {
      const nro = normalize(safeStr(pickNroAfiliado(a)))
      const nom = normalize(safeStr(pickNombre(a)))
      const doc = normalize(safeStr(pickDocumento(a)))
      const plan = normalize(safeStr(pickPlan(a)))
      return nro.includes(q) || nom.includes(q) || doc.includes(q) || plan.includes(q)
    })
  }, [afiliados, tableQuery])

  function getExportRows() {
    return filteredAfiliados.map((a) => ({
      nro_afiliado: safeStr(pickNroAfiliado(a)),
      nombre: safeStr(pickNombre(a)),
      documento: safeStr(pickDocumento(a)),
      plan: safeStr(pickPlan(a)),
      alta: safeStr(pickAlta(a)),
      baja: safeStr(pickBaja(a)),
      estado: safeStr(pickEstado(a)),
    }))
  }

  async function downloadExcel() {
    if (!selectedOS) return
    if (filteredAfiliados.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.")
      return
    }

    const rows = getExportRows()
    const wb = new ExcelJS.Workbook()
    wb.creator = "CMC"
    wb.created = new Date()

    const ws = wb.addWorksheet("Afiliados", {
      views: [{ state: "frozen", ySplit: 6 }],
      pageSetup: { fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    })

    const C = {
      titleBlue: "FF0B1F3A",
      black: "FF111111",
      white: "FFFFFFFF",
      gray100: "FFF7F7F7",
      gray200: "FFE5E5E5",
    }

    ws.columns = [
      { header: "N° Afiliado", key: "nro_afiliado", width: 14 },
      { header: "Afiliado", key: "nombre", width: 42 },
      { header: "Documento", key: "documento", width: 16 },
      { header: "Plan", key: "plan", width: 18 },
      { header: "Alta", key: "alta", width: 14 },
      { header: "Baja", key: "baja", width: 14 },
      { header: "Estado", key: "estado", width: 12 },
    ]

    ws.mergeCells("A2:G2")
    ws.getCell("A2").value = "Afiliados por Obra Social"
    ws.getCell("A2").font = {
      name: "Calibri",
      size: 16,
      bold: true,
      color: { argb: C.titleBlue },
    }
    ws.getCell("A2").alignment = { vertical: "middle", horizontal: "left" }

    ws.mergeCells("A3:G3")
    const osCode = selectedOS.CODIGO ?? `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`
    ws.getCell("A3").value =
      `${selectedOS.NOMBRE} (${osCode}) • Generado: ${fmtDate(new Date())} • Filas: ${rows.length}`
    ws.getCell("A3").font = { name: "Calibri", size: 11, color: { argb: C.black } }
    ws.getCell("A3").alignment = { vertical: "middle", horizontal: "left" }

    ws.getRow(4).height = 6

    const headerRow = 6
    ws.getRow(headerRow).values = ["N° Afiliado", "Afiliado", "Documento", "Plan", "Alta", "Baja", "Estado"]
    ws.getRow(headerRow).height = 20

    const tableBorder = {
      top: { style: "thin" as const, color: { argb: C.black } },
      left: { style: "thin" as const, color: { argb: C.black } },
      bottom: { style: "thin" as const, color: { argb: C.black } },
      right: { style: "thin" as const, color: { argb: C.black } },
    }

    ws.getRow(headerRow).eachCell((cell) => {
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: C.white } }
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.black } }
      cell.alignment = { vertical: "middle", horizontal: "center" }
      cell.border = tableBorder
    })

    rows.forEach((r, idx) => {
      const row = ws.addRow(r)
      row.height = 18

      const zebraFill = idx % 2 === 0 ? C.white : C.gray100

      row.eachCell((cell, col) => {
        cell.font = { name: "Calibri", size: 11, color: { argb: C.black } }
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: zebraFill } }
        cell.border = tableBorder

        if (col === 2) {
          cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true }
        } else if (col === 5 || col === 6) {
          cell.alignment = { vertical: "middle", horizontal: "center" }
        } else if (col === 3) {
          cell.alignment = { vertical: "middle", horizontal: "center" }
        } else {
          cell.alignment = { vertical: "middle", horizontal: "center" }
        }
      })
    })

    const endRow = ws.lastRow?.number ?? headerRow + 1
    ws.autoFilter = {
      from: { row: headerRow, column: 1 },
      to: { row: endRow, column: 7 },
    }

    ws.getRow(1).height = 6

    const buf = await wb.xlsx.writeBuffer()
    saveAs(
      new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      `afiliados_${osCode}_${fmtDate(new Date())}.xlsx`,
    )
  }

  function downloadPdf() {
    if (!selectedOS) return
    if (filteredAfiliados.length === 0) {
      window.alert("No hay datos para exportar con el filtro actual.")
      return
    }

    const osCode = selectedOS.CODIGO ?? `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`
    const rows = getExportRows().map((r) => [r.nro_afiliado, r.nombre, r.documento, r.plan, r.alta, r.baja, r.estado])

    const doc = new jsPDF({ orientation: "landscape" })
    doc.setFontSize(14)
    doc.text("Afiliados por Obra Social", 14, 14)
    doc.setFontSize(11)
    doc.text(`${selectedOS.NOMBRE} (${osCode}) • ${fmtDate(new Date())} • Filas: ${rows.length}`, 14, 22)

    autoTable(doc, {
      head: [["N° Afiliado", "Afiliado", "Documento", "Plan", "Alta", "Baja", "Estado"]],
      body: rows,
      startY: 28,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        valign: "middle",
      },
      headStyles: {
        fillColor: [17, 17, 17],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: [247, 247, 247],
      },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 86 },
        2: { cellWidth: 28 },
        3: { cellWidth: 30 },
        4: { cellWidth: 22 },
        5: { cellWidth: 22 },
        6: { cellWidth: 22 },
      },
    })

    doc.save(`afiliados_${osCode}_${fmtDate(new Date())}.pdf`)
  }

  function selectOS(os: ObraSocial) {
    setSelectedOS(os)
    setOsDropdownOpen(false)
  }

  const selectedCode = selectedOS
    ? (selectedOS.CODIGO ?? `OS${String(selectedOS.NRO_OBRA_SOCIAL).padStart(3, "0")}`)
    : ""

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Afiliados por Obra Social</h1>
            <p className={styles.subtitle}>
              Seleccioná una obra social, buscá afiliados y descargá los resultados en PDF o Excel
            </p>
          </div>
        </header>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardDescription}>
              Mostrando {filteredAfiliados.length} {filteredAfiliados.length === 1 ? "afiliado" : "afiliados"}
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
                      {selectedOS ? `${selectedOS.NOMBRE} (${selectedCode})` : "Seleccionar obra social…"}
                    </span>
                  </div>
                  <ChevronDown className={`${styles.chevron} ${osDropdownOpen ? styles.chevronOpen : ""}`} />
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
                        <div className={styles.emptyMessage}>Cargando obras sociales…</div>
                      ) : errorObras ? (
                        <div className={styles.errorMessage}>
                          <span>{errorObras}</span>
                        </div>
                      ) : filteredOS.length === 0 ? (
                        <div className={styles.emptyMessage}>Sin resultados para "{osQuery}"</div>
                      ) : (
                        filteredOS.map((os) => {
                          const code = os.CODIGO ?? `OS${String(os.NRO_OBRA_SOCIAL).padStart(3, "0")}`
                          const active = selectedOS?.NRO_OBRA_SOCIAL === os.NRO_OBRA_SOCIAL
                          return (
                            <button
                              key={os.NRO_OBRA_SOCIAL}
                              type="button"
                              className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ""}`}
                              onClick={() => selectOS(os)}
                            >
                              <span className={styles.dropdownItemName}>{os.NOMBRE}</span>
                              <span className={styles.dropdownItemCode}>{code}</span>
                            </button>
                          )
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
                  disabled={!selectedOS || loadingAfiliados || filteredAfiliados.length === 0}
                >
                  <FileText size={18} />
                  <span>Descargar PDF</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  onClick={downloadExcel}
                  disabled={!selectedOS || loadingAfiliados || filteredAfiliados.length === 0}
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
                  placeholder="Buscar por nombre, N° afiliado, documento o plan…"
                  disabled={!selectedOS || loadingAfiliados}
                  aria-label="Buscar afiliado"
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
                  Elegí una obra social del menú desplegable para ver el listado de afiliados 
                </p>
              </div>
            ) : loadingAfiliados ? (
              <div className={styles.loadingState}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} />
                </div>
                <p className={styles.loadingText}>Cargando afiliados…</p>
              </div>
            ) : errorAfiliados ? (
              <div className={styles.errorMessage}>
                <span>{errorAfiliados}</span>
              </div>
            ) : (
              <>
                <div className={styles.resultsHeader}>
                  <p className={styles.resultsCount}>
                    Mostrando <strong>{filteredAfiliados.length}</strong> de <strong>{afiliados.length}</strong>{" "}
                    afiliados
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
                            <span>N° Afiliado</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Nombre Completo</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Documento</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Plan</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Alta</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Baja</span>
                          </div>
                        </th>
                        <th>
                          <div className={styles.thContent}>
                            <span>Estado</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAfiliados.length === 0 ? (
                        <tr>
                          <td colSpan={7} className={styles.noResults}>
                            No se encontraron afiliados que coincidan con "{tableQuery}"
                          </td>
                        </tr>
                      ) : (
                        filteredAfiliados.map((a, idx) => {
                          const nro = safeStr(pickNroAfiliado(a))
                          const nom = safeStr(pickNombre(a))
                          const doc = safeStr(pickDocumento(a))
                          const plan = safeStr(pickPlan(a))
                          const alta = safeStr(pickAlta(a))
                          const baja = safeStr(pickBaja(a))
                          const estado = safeStr(pickEstado(a))
                          const isActive = !estado.toUpperCase().includes("INAC")

                          return (
                            <tr key={`${nro}-${doc}-${idx}`}>
                              <td>{nro}</td>
                              <td className={styles.tdName}>{nom}</td>
                              <td>{doc}</td>
                              <td>{plan}</td>
                              <td>{alta}</td>
                              <td>{baja}</td>
                              <td>
                                <span
                                  className={`${styles.badge} ${isActive ? styles.badgeActive : styles.badgeInactive}`}
                                >
                                  {estado}
                                </span>
                              </td>
                            </tr>
                          )
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
  )
}

export default AfiliadosPorObraSocialPage
