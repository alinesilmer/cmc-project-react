import { useEffect, useMemo, useRef, useState } from "react";
import {
  FileUp,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  FileSpreadsheet,
  FileType,
  Trash2,
  ArrowLeftRight,
  SlidersHorizontal,
  X as XIcon,
} from "lucide-react";
import { saveAs } from "file-saver";

import styles from "./ImportarPreciosPdf.module.scss";
import Modal from "../../../components/atoms/Modal/Modal";
import { useCatalogoCodigos } from "./useCatalogoCodigos";
import type { PrecioRow, SheetData, ColMapping, FileKind } from "../../../utils/precios/types";
import { readPdf } from "../../../utils/precios/readPdf";
import { readExcel } from "../../../utils/precios/readExcel";
import { readCsv } from "../../../utils/precios/readCsv";
import { autoDetectMapping, sheetToRows, columnList } from "../../../utils/precios/sheet";
import { rowsToCsv, buildComponentCsv } from "../../../utils/precios/csv";
import {
  importarValoresCsv,
  listCodigosPorVigencia,
  eliminarValoresPorVigencia,
  listVigenciasCargadas,
} from "../nomenclador.api";
import type { ImportarCSVResult } from "../nomenclador.types";

const PREVIEW_LIMIT = 1000;
const ORIGEN = "NNE"; // estas cargas son siempre Nomenclador Negociado
const ACCEPT: Record<FileKind, string> = { pdf: ".pdf", excel: ".xls,.xlsx", csv: ".csv" };

export default function ImportarPreciosPdf() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const codeSet = useCatalogoCodigos();

  const [fileKind, setFileKind] = useState<FileKind | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PrecioRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Excel/CSV: hojas + mapeo (oculto por defecto; el auto-detecto usa el catálogo)
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [sheetIdx, setSheetIdx] = useState(0);
  const [mapping, setMapping] = useState<ColMapping | null>(null);
  const [showMapping, setShowMapping] = useState(false);
  const grid = sheets[sheetIdx]?.grid ?? [];
  const columns = useMemo(() => (sheets.length ? columnList(grid) : []), [sheets, sheetIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Datos comunes a todas las filas
  const [vigencia, setVigencia] = useState("");
  const [nroObraSocial, setNroObraSocial] = useState("");

  // Paso 2 — importación
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportarCSVResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  // Códigos del archivo que ya estaban cargados en esta vigencia y se omitieron.
  const [omitidos, setOmitidos] = useState(0);

  // Modal de eliminación por vigencia
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [delOS, setDelOS] = useState("");
  const [vigenciasList, setVigenciasList] = useState<{ vigencia_desde: string; cantidad: number }[]>([]);
  const [loadingVigencias, setLoadingVigencias] = useState(false);
  const [selectedVigencia, setSelectedVigencia] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSheet = fileKind === "excel" || fileKind === "csv";

  // Excel/CSV: al cambiar hoja/catálogo, re-detectar columnas
  useEffect(() => {
    if (sheets.length === 0) return;
    setMapping(autoDetectMapping(sheets[sheetIdx]?.grid ?? [], codeSet));
  }, [sheets, sheetIdx, codeSet]);

  // Excel/CSV: al cambiar hoja/mapeo/catálogo, recomputar filas
  useEffect(() => {
    if (sheets.length === 0 || !mapping) return;
    setRows(sheetToRows(sheets[sheetIdx]?.grid ?? [], mapping, codeSet));
  }, [sheets, sheetIdx, mapping, codeSet]);

  // Modal: cargar vigencias de la OS
  useEffect(() => {
    if (!deleteModalOpen) return;
    const os = Number(delOS.trim());
    if (!os) { setVigenciasList([]); setSelectedVigencia(""); return; }
    let alive = true;
    setLoadingVigencias(true);
    listVigenciasCargadas(os)
      .then((v) => { if (!alive) return; setVigenciasList(v); setSelectedVigencia(v[0]?.vigencia_desde ?? ""); })
      .catch(() => { if (alive) setVigenciasList([]); })
      .finally(() => { if (alive) setLoadingVigencias(false); });
    return () => { alive = false; };
  }, [deleteModalOpen, delOS]);

  // ── File handling ──────────────────────────────────────────────────────────

  function clearFileState() {
    setFileName(null);
    setRows([]);
    setError(null);
    setImportResult(null);
    setImportError(null);
    setOmitidos(0);
    setSheets([]);
    setMapping(null);
    setSheetIdx(0);
    setShowMapping(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function chooseKind(k: FileKind) {
    clearFileState();
    setFileKind(k);
  }

  function changeKind() {
    clearFileState();
    setFileKind(null);
  }

  async function handleFile(file: File | null | undefined) {
    if (!file || !fileKind) return;
    setParsing(true);
    setError(null);
    setRows([]);
    setImportResult(null);
    setImportError(null);
    setSheets([]);
    setMapping(null);
    setSheetIdx(0);
    setShowMapping(false);
    setFileName(file.name);
    try {
      if (fileKind === "pdf") {
        const result = await readPdf(file);
        setRows(result);
        if (result.length === 0) setError("No se encontraron filas con código y precio en el PDF.");
      } else {
        const data = fileKind === "excel" ? await readExcel(file) : await readCsv(file);
        if (data.length === 0) { setError("El archivo no tiene datos."); return; }
        setSheets(data); // los efectos auto-detectan y arman las filas
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo leer el archivo. Verificá el formato.");
    } finally {
      setParsing(false);
    }
  }

  // ── Rows ─────────────────────────────────────────────────────────────────────

  // Intercambia precio_1 y precio_2 en una fila (persiste hasta cambiar hoja/mapeo).
  function swapRow(i: number) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, precio_1: r.precio_2, precio_2: r.precio_1 } : r)),
    );
  }

  const previewRows = rows.slice(0, PREVIEW_LIMIT);
  const canDownload = rows.length > 0 && vigencia.trim() !== "" && nroObraSocial.trim() !== "";

  function downloadCsv() {
    if (!canDownload) return;
    const csv = rowsToCsv(rows, { vigencia: vigencia.trim(), nroObraSocial: nroObraSocial.trim() });
    const base = (fileName ?? "precios").replace(/\.(pdf|xlsx|xls|csv)$/i, "");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${base}_OS${nroObraSocial.trim()}_${vigencia.trim()}.csv`);
  }

  async function importToDb() {
    if (!canDownload) return;
    const os = Number(nroObraSocial.trim());
    const vig = vigencia.trim();
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    setOmitidos(0);
    try {
      // Cargar por partes: se importan solo los códigos que aún no están cargados
      // para esta OS en esta vigencia; los ya presentes se omiten (no se pisan).
      const { codigos } = await listCodigosPorVigencia(os, vig);
      const yaCargados = new Set(codigos);
      const nuevos = rows.filter((r) => !yaCargados.has(r.codigo));
      const cantidadOmitidos = rows.length - nuevos.length;

      if (nuevos.length === 0) {
        setImportError(
          `Los ${rows.length} código${rows.length !== 1 ? "s" : ""} de este archivo ya ` +
            `${rows.length !== 1 ? "están" : "está"} cargado${rows.length !== 1 ? "s" : ""} ` +
            `para la obra social ${os} en la vigencia ${vig}. No hay códigos nuevos para importar.`,
        );
        return;
      }

      const file = new File([buildComponentCsv(nuevos, ORIGEN)], "valores.csv", { type: "text/csv" });
      setImportResult(await importarValoresCsv(file, os, vig));
      setOmitidos(cantidadOmitidos);
    } catch (e) {
      console.error(e);
      setImportError("No se pudo importar. Revisá la conexión y los datos.");
    } finally {
      setImporting(false);
    }
  }

  // ── Delete modal ─────────────────────────────────────────────────────────────

  function openDeleteModal() {
    setDelOS(nroObraSocial.trim());
    setSelectedVigencia("");
    setVigenciasList([]);
    setConfirmingDelete(false);
    setDeleteResult(null);
    setDeleteError(null);
    setDeleteModalOpen(true);
  }
  function closeDeleteModal() { setDeleteModalOpen(false); setConfirmingDelete(false); }

  async function doDelete() {
    const os = Number(delOS.trim());
    if (!os || !selectedVigencia) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteResult(null);
    try {
      const { eliminados } = await eliminarValoresPorVigencia(os, selectedVigencia);
      setDeleteResult(eliminados);
      const v = await listVigenciasCargadas(os);
      setVigenciasList(v);
      setSelectedVigencia(v[0]?.vigencia_desde ?? "");
    } catch (e) {
      console.error(e);
      setDeleteError("No se pudieron eliminar los códigos.");
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}><FileUp size={20} /></span>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Importar Precios</h1>
          <p className={styles.subtitle}>Leé un PDF, Excel o CSV de valores del Colegio y cargá los precios</p>
        </div>
        <button type="button" className={styles.headerDeleteBtn} onClick={openDeleteModal}>
          <Trash2 size={15} /> Eliminar cargados
        </button>
      </div>

      {/* Paso 0 — elegir tipo de archivo */}
      {!fileKind ? (
        <div className={styles.kindCard}>
          <p className={styles.kindTitle}>¿Qué tipo de archivo vas a subir?</p>
          <div className={styles.kindGrid}>
            <button type="button" className={styles.kindBtn} onClick={() => chooseKind("pdf")}>
              <FileText size={26} />
              <span className={styles.kindName}>PDF</span>
              <small className={styles.kindHint}>Anexo con texto</small>
            </button>
            <button type="button" className={styles.kindBtn} onClick={() => chooseKind("excel")}>
              <FileSpreadsheet size={26} />
              <span className={styles.kindName}>Excel</span>
              <small className={styles.kindHint}>.xlsx / .xls</small>
            </button>
            <button type="button" className={styles.kindBtn} onClick={() => chooseKind("csv")}>
              <FileType size={26} />
              <span className={styles.kindName}>CSV</span>
              <small className={styles.kindHint}>.csv</small>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Upload */}
          <div className={styles.uploadCard}>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT[fileKind]}
              className={styles.hiddenInput}
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {!fileName ? (
              <button type="button" className={styles.dropZone} onClick={() => inputRef.current?.click()}>
                <FileUp size={28} />
                <span className={styles.dropTitle}>Seleccionar {fileKind.toUpperCase()}</span>
                <span className={styles.dropHint}>
                  {fileKind === "pdf" ? "Anexo de valores (PDF con texto, no escaneado)" : `Archivo ${ACCEPT[fileKind]}`}
                  {" · "}
                  <span className={styles.linkLike} onClick={(e) => { e.stopPropagation(); changeKind(); }}>cambiar tipo</span>
                </span>
              </button>
            ) : (
              <div className={styles.fileBar}>
                <FileText size={18} className={styles.fileIcon} />
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{fileName}</span>
                  {!parsing && !error && (
                    <span className={styles.fileMeta}>{rows.length} código{rows.length !== 1 ? "s" : ""} detectado{rows.length !== 1 ? "s" : ""}</span>
                  )}
                </div>
                {parsing ? (
                  <Loader2 size={18} className={styles.spin} />
                ) : (
                  <div className={styles.fileActions}>
                    <button type="button" className={styles.btnPrimary} onClick={downloadCsv} disabled={!canDownload} title={!canDownload ? "Completá vigencia y N° obra social" : undefined}>
                      <Download size={15} /> Descargar CSV
                    </button>
                    <button type="button" className={styles.btnGhost} onClick={clearFileState} title="Cargar otro archivo"><XIcon size={15} /></button>
                    <button type="button" className={styles.btnGhost} onClick={changeKind} title="Cambiar tipo de archivo"><SlidersHorizontal size={15} /></button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Excel/CSV: resumen + ajuste opcional de columnas */}
          {!parsing && isSheet && sheets.length > 0 && mapping && (
            <div className={styles.mapCard}>
              <div className={styles.mapSummary}>
                {sheets.length > 1 ? (
                  <div className={styles.mapField}>
                    <label className={styles.mapLabel}>Hoja</label>
                    <select className={styles.mapSelect} value={sheetIdx} onChange={(e) => setSheetIdx(Number(e.target.value))}>
                      {sheets.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
                    </select>
                  </div>
                ) : <span className={styles.mapSummaryText}>Hoja «{sheets[sheetIdx]?.name}»</span>}
                <span className={styles.mapSummaryText}>{rows.length} código{rows.length !== 1 ? "s" : ""} detectado{rows.length !== 1 ? "s" : ""} con el catálogo CMC.</span>
                <button type="button" className={styles.linkBtn} onClick={() => setShowMapping((v) => !v)}>
                  <SlidersHorizontal size={13} /> {showMapping ? "Ocultar columnas" : "Ajustar columnas"}
                </button>
              </div>

              {showMapping && (
                <div className={styles.mapRow}>
                  <div className={styles.mapField}>
                    <label className={styles.mapLabel}>Código</label>
                    <select className={styles.mapSelect} value={mapping.codigo} onChange={(e) => setMapping({ ...mapping, codigo: Number(e.target.value) })}>
                      {columns.map((c) => <option key={c.index} value={c.index}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className={styles.mapField}>
                    <label className={styles.mapLabel}>Precio 1 · Cirujano</label>
                    <select className={styles.mapSelect} value={mapping.precio1} onChange={(e) => setMapping({ ...mapping, precio1: Number(e.target.value) })}>
                      {columns.map((c) => <option key={c.index} value={c.index}>{c.label}</option>)}
                    </select>
                  </div>
                  <button type="button" className={styles.swapBtn} disabled={mapping.precio2 == null} title="Intercambiar Precio 1 y Precio 2"
                    onClick={() => setMapping({ ...mapping, precio1: mapping.precio2!, precio2: mapping.precio1 })}>
                    <ArrowLeftRight size={15} />
                  </button>
                  <div className={styles.mapField}>
                    <label className={styles.mapLabel}>Precio 2 · Ayudante</label>
                    <select className={styles.mapSelect} value={mapping.precio2 ?? ""} onChange={(e) => setMapping({ ...mapping, precio2: e.target.value === "" ? null : Number(e.target.value) })}>
                      <option value="">— ninguno —</option>
                      {columns.map((c) => <option key={c.index} value={c.index}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Datos comunes */}
          <div className={styles.metaCard}>
            <div className={styles.metaGrid}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Vigencia</label>
                <input type="date" className={styles.fieldInput} value={vigencia} onChange={(e) => setVigencia(e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>N° Obra Social</label>
                <input type="number" inputMode="numeric" className={styles.fieldInput} placeholder="Ej: 285" value={nroObraSocial} onChange={(e) => setNroObraSocial(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Error */}
          {!parsing && error && (
            <div className={styles.errorState}><AlertCircle size={16} /> {error}</div>
          )}

          {/* Preview */}
          {!parsing && rows.length > 0 && (
            <div className={styles.previewCard}>
              <div className={styles.previewHeader}>
                <span className={styles.previewTitle}>Vista previa</span>
                <span className={styles.previewCount}>
                  {rows.length > PREVIEW_LIMIT ? `Mostrando ${PREVIEW_LIMIT} de ${rows.length}` : `${rows.length} fila${rows.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>codigo</th>
                      <th className={styles.num}>precio_1</th>
                      <th className={styles.num}>precio_2</th>
                      <th>vigencia</th>
                      <th className={styles.num}>nro_obrasocial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((r, i) => (
                      <tr key={`${r.codigo}-${i}`}>
                        <td className={styles.code}>{r.codigo}</td>
                        {r.por_presupuesto ? (
                          <td className={styles.presupuestoCell} colSpan={2}>Por presupuesto</td>
                        ) : r.precio_1 && r.precio_2 ? (
                          <>
                            <td className={`${styles.num} ${styles.swappable}`} onClick={() => swapRow(i)} title="Click para intercambiar precio_1 y precio_2">{r.precio_1}</td>
                            <td className={`${styles.num} ${styles.swappable}`} onClick={() => swapRow(i)} title="Click para intercambiar precio_1 y precio_2">{r.precio_2}</td>
                          </>
                        ) : (
                          <>
                            <td className={styles.num}>{r.precio_1}</td>
                            <td className={styles.num}>{r.precio_2}</td>
                          </>
                        )}
                        <td className={styles.muted}>{vigencia}</td>
                        <td className={`${styles.num} ${styles.muted}`}>{nroObraSocial}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paso 2 — importar */}
          {!parsing && rows.length > 0 && (
            <div className={styles.importCard}>
              <div className={styles.importHead}>
                <span className={styles.stepBadge}>Paso 2</span>
                <div>
                  <h2 className={styles.importTitle}>Importar a la base de datos</h2>
                  <p className={styles.importSub}>Crea los valores (nm_valores) para la obra social {nroObraSocial || "…"} con vigencia {vigencia || "…"}. Podés cargar varias hojas en la misma vigencia: se importan solo los códigos nuevos, los ya cargados se omiten.</p>
                </div>
              </div>
              <div className={styles.importRow}>
                <button type="button" className={styles.btnPrimary} onClick={importToDb} disabled={!canDownload || importing} title={!canDownload ? "Completá vigencia y N° obra social" : undefined}>
                  {importing ? <Loader2 size={15} className={styles.spin} /> : <Database size={15} />}
                  {importing ? "Importando…" : "Importar a base de datos"}
                </button>
              </div>
              {importError && <div className={styles.errorState}><AlertCircle size={16} /> {importError}</div>}
              {importResult && (
                <div className={styles.importResult}>
                  <div className={styles.resultOk}>
                    <CheckCircle2 size={15} />
                    {importResult.procesados} código{importResult.procesados !== 1 ? "s" : ""} importado{importResult.procesados !== 1 ? "s" : ""}
                  </div>
                  {omitidos > 0 && (
                    <div className={styles.resultInfo}>
                      <AlertCircle size={15} />
                      {omitidos} código{omitidos !== 1 ? "s" : ""} ya cargado{omitidos !== 1 ? "s" : ""} en esta vigencia se {omitidos !== 1 ? "omitieron" : "omitió"} para no pisar los precios existentes.
                    </div>
                  )}
                  {importResult.errores.length > 0 && (
                    <div className={styles.resultErrors}>
                      <div className={styles.resultErrTitle}><AlertCircle size={14} /> {importResult.errores.length} con error</div>
                      <ul>
                        {importResult.errores.slice(0, 20).map((e, i) => (
                          <li key={i}>
                            {e.codigo ? <>Código <strong>{e.codigo}</strong> (fila {String(e.fila)})</> : <>Fila {String(e.fila)}</>}: {e.motivo}
                          </li>
                        ))}
                        {importResult.errores.length > 20 && <li>… y {importResult.errores.length - 20} más</li>}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal: eliminar por vigencia */}
      <Modal isOpen={deleteModalOpen} onClose={closeDeleteModal} title="Eliminar códigos cargados" size="small">
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>N° Obra Social</label>
            <input type="number" inputMode="numeric" className={styles.fieldInput} placeholder="Ej: 285" value={delOS} onChange={(e) => setDelOS(e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Vigencia a eliminar</label>
            {loadingVigencias ? (
              <span className={styles.muted}><Loader2 size={14} className={styles.spin} /> Cargando…</span>
            ) : !delOS.trim() ? (
              <span className={styles.muted}>Ingresá una obra social.</span>
            ) : vigenciasList.length === 0 ? (
              <span className={styles.muted}>No hay vigencias cargadas para esta obra social.</span>
            ) : (
              <select className={styles.fieldInput} value={selectedVigencia} onChange={(e) => setSelectedVigencia(e.target.value)}>
                {vigenciasList.map((v) => (
                  <option key={v.vigencia_desde} value={v.vigencia_desde}>{v.vigencia_desde} — {v.cantidad} código{v.cantidad !== 1 ? "s" : ""}</option>
                ))}
              </select>
            )}
          </div>
          {deleteError && <div className={styles.errorState}><AlertCircle size={16} /> {deleteError}</div>}
          {deleteResult !== null && (
            <div className={styles.resultOk}><CheckCircle2 size={15} /> {deleteResult} código{deleteResult !== 1 ? "s" : ""} eliminado{deleteResult !== 1 ? "s" : ""}</div>
          )}
          {confirmingDelete ? (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>¿Eliminar <strong>todos</strong> los códigos de la obra social {delOS} en la vigencia {selectedVigencia}? Es un borrado definitivo, no se puede deshacer.</span>
              <div className={styles.confirmActions}>
                <button type="button" className={styles.btnDanger} onClick={doDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={14} className={styles.spin} /> : <Trash2 size={14} />} Sí, eliminar
                </button>
                <button type="button" className={styles.btnGhost} onClick={() => setConfirmingDelete(false)} disabled={deleting}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnDanger} onClick={() => setConfirmingDelete(true)} disabled={!selectedVigencia || deleting}>
                <Trash2 size={15} /> Eliminar
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
