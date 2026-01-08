"use client"

import type React from "react"
import { useMemo, useRef, useState } from "react"
import styles from "./Boletin.module.scss"
import Button from "../../../website/components/UI/Button/Button"
import { parseInputFile } from "../../utils/boletinParser"
import { exportToExcel } from "../../utils/excelExporter"
import type { ObraSocial } from "../../utils/docxParser"

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function Boletin() {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<ObraSocial[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)

  const ordered = useMemo(() => [...data].sort((a, b) => b.consulta - a.consulta), [data])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ordered
    return ordered.filter((x) => x.nombre.toLowerCase().includes(q))
  }, [ordered, query])

  const handlePickFile = () => inputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    setData([])
    setQuery("")
    setError(null)
    e.target.value = ""
  }

  const handleProcess = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const parsed = await parseInputFile(file)
      setData(parsed)
      if (parsed.length === 0) {
        setError("No se detectaron items. Revisá que el archivo tenga el formato esperado.")
      }
    } catch (err) {
      console.error(err)
      setError("No se pudo leer el archivo. Probá con otro archivo o re-exportalo.")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (data.length === 0) return
    await exportToExcel(data)
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header Section */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            </div>
            <h1 className={styles.title}>Ranking de Obras Sociales</h1>
            <p className={styles.subtitle}>
              Subí el boletín, generá el ranking automáticamente y descargá el resultado en Excel 
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Cargar Documento</h2>
            <p className={styles.cardDescription}>Seleccioná el archivo del boletín para procesar</p>
          </div>

          <div className={styles.cardContent}>
            <input
              ref={inputRef}
              type="file"
              accept=".docx,.xlsx,.xls,.pdf"
              onChange={handleFileChange}
              className={styles.hiddenInput}
            />

            <div className={styles.uploadSection}>
              <button type="button" onClick={handlePickFile} className={styles.uploadButton}>
                <svg className={styles.uploadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className={styles.uploadText}>{file ? file.name : "Seleccionar archivo"}</span>
              </button>

              {file && (
                <div className={styles.fileInfo}>
                  <svg className={styles.fileIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className={styles.fileName}>{file.name}</span>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <Button size="medium" variant="primary" onClick={handleProcess} disabled={!file || loading}>
                {loading ? "Procesando..." : "Procesar Documento"}
              </Button>

              <Button size="medium" variant="secondary" onClick={handleDownload} disabled={data.length === 0}>
                Descargar Excel
              </Button>
            </div>

            {loading && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill}></div>
              </div>
            )}

            {error && (
              <div className={styles.errorMessage}>
                <svg className={styles.errorIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {data.length > 0 && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.resultsHeader}>
                <div>
                  <h2 className={styles.cardTitle}>Ranking Generado</h2>
                  <p className={styles.resultsCount}>
                    {filtered.length} obra{filtered.length !== 1 ? "s" : ""} social
                    {filtered.length !== 1 ? "es" : ""} encontrada
                    {filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <div className={styles.searchWrapper}>
                  <svg className={styles.searchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar obra social..."
                    className={styles.searchInput}
                  />
                </div>
              </div>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thRank}>
                      <div className={styles.thContent}>
                        <svg className={styles.thIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                          />
                        </svg>
                        Ranking
                      </div>
                    </th>
                    <th className={styles.thName}>Obra Social</th>
                    <th className={styles.thAmount}>Valor Consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const rank = ordered.findIndex((x) => x.nombre === row.nombre && x.consulta === row.consulta) + 1
                    return (
                      <tr key={`${row.nombre}-${row.consulta}-${idx}`}>
                        <td className={styles.tdRank}>
                          <span
                            className={`${styles.rankBadge} ${
                              rank === 1
                                ? styles.rankFirst
                                : rank === 2
                                  ? styles.rankSecond
                                  : rank === 3
                                    ? styles.rankThird
                                    : ""
                            }`}
                          >
                            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                          </span>
                        </td>
                        <td className={styles.tdName}>{row.nombre}</td>
                        <td className={styles.tdAmount}>{money.format(row.consulta)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
  )
}
