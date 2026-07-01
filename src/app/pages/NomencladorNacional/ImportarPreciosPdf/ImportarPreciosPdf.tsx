import { useEffect, useRef, useState } from "react";
import {
  FileUp,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Database,
  FileText,
  Trash2,
  X as XIcon,
} from "lucide-react";
import { saveAs } from "file-saver";

import styles from "./ImportarPreciosPdf.module.scss";
import Modal from "../../../components/atoms/Modal/Modal";
import { parsePreciosPdf, rowsToCsv, type PrecioRow } from "../../../utils/preciosPdfParser";
import {
  importarValoresCsv,
  contarValoresPorVigencia,
  eliminarValoresPorVigencia,
  listVigenciasCargadas,
} from "../nomenclador.api";
import type { ImportarCSVResult } from "../nomenclador.types";

const PREVIEW_LIMIT = 1000;

// Estas cargas son siempre Nomenclador Negociado (NNE): el usuario no lo elige ni lo ve.
const ORIGEN = "NNE";

// Convierte las filas (codigo, precio_1, precio_2) al CSV por componente que
// espera POST /api/valores_nm/importar_csv: precio_1 → Honorarios, precio_2 →
// Ayudante, ambos como componentes fijos (cantidad 0, sin galeno).
function buildComponentCsv(rows: PrecioRow[], origen: string): string {
  const header =
    "codigo_colegio,origen,descripcion,valor_unitario,nivel,especialidad,concepto,galeno_codigo,cantidad,presupuesto";
  const lines = [header];
  for (const r of rows) {
    if (r.precio_1) lines.push(`${r.codigo},${origen},,${r.precio_1},,,Honorarios,,0,`);
    if (r.precio_2) lines.push(`${r.codigo},${origen},,${r.precio_2},,,Ayudante,,0,`);
  }
  return lines.join("\r\n") + "\r\n";
}

export default function ImportarPreciosPdf() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PrecioRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Constantes que se agregan a todas las filas
  const [vigencia, setVigencia] = useState("");
  const [nroObraSocial, setNroObraSocial] = useState("");

  // Paso 2 — importación a la base de datos
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportarCSVResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Modal de eliminación (revertir carga por vigencia)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [delOS, setDelOS] = useState("");
  const [vigenciasList, setVigenciasList] = useState<{ vigencia_desde: string; cantidad: number }[]>([]);
  const [loadingVigencias, setLoadingVigencias] = useState(false);
  const [selectedVigencia, setSelectedVigencia] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Carga las vigencias disponibles cuando el modal está abierto y hay una OS válida.
  useEffect(() => {
    if (!deleteModalOpen) return;
    const os = Number(delOS.trim());
    if (!os) {
      setVigenciasList([]);
      setSelectedVigencia("");
      return;
    }
    let alive = true;
    setLoadingVigencias(true);
    listVigenciasCargadas(os)
      .then((v) => {
        if (!alive) return;
        setVigenciasList(v);
        setSelectedVigencia(v[0]?.vigencia_desde ?? "");
      })
      .catch(() => {
        if (alive) setVigenciasList([]);
      })
      .finally(() => {
        if (alive) setLoadingVigencias(false);
      });
    return () => {
      alive = false;
    };
  }, [deleteModalOpen, delOS]);

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    setParsing(true);
    setError(null);
    setRows([]);
    setImportResult(null);
    setImportError(null);
    setFileName(file.name);
    try {
      const result = await parsePreciosPdf(file);
      setRows(result);
      if (result.length === 0) {
        setError("No se encontraron filas con código y precio en el PDF.");
      }
    } catch (e) {
      console.error(e);
      setError("No se pudo leer el PDF. ¿Es un PDF con texto (no escaneado)?");
    } finally {
      setParsing(false);
    }
  }

  function reset() {
    setFileName(null);
    setRows([]);
    setError(null);
    setImportResult(null);
    setImportError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const canDownload = rows.length > 0 && vigencia.trim() !== "" && nroObraSocial.trim() !== "";

  function downloadCsv() {
    if (!canDownload) return;
    const csv = rowsToCsv(rows, { vigencia: vigencia.trim(), nroObraSocial: nroObraSocial.trim() });
    const base = (fileName ?? "precios").replace(/\.pdf$/i, "");
    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `${base}_OS${nroObraSocial.trim()}_${vigencia.trim()}.csv`,
    );
  }

  async function importToDb() {
    if (!canDownload) return;
    const os = Number(nroObraSocial.trim());
    const vig = vigencia.trim();
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      // Guard: no permitir cargar dos veces la misma OS + vigencia
      const { cantidad } = await contarValoresPorVigencia(os, vig);
      if (cantidad > 0) {
        setImportError(
          `Ya hay ${cantidad} código${cantidad !== 1 ? "s" : ""} cargado${cantidad !== 1 ? "s" : ""} ` +
            `para la obra social ${os} en la vigencia ${vig}. Eliminá esa vigencia antes de volver a cargar.`,
        );
        return;
      }
      const csv = buildComponentCsv(rows, ORIGEN);
      const file = new File([csv], "valores.csv", { type: "text/csv" });
      const res = await importarValoresCsv(file, os, vig);
      setImportResult(res);
    } catch (e) {
      console.error(e);
      setImportError("No se pudo importar. Revisá la conexión y los datos.");
    } finally {
      setImporting(false);
    }
  }

  function openDeleteModal() {
    setDelOS(nroObraSocial.trim());
    setSelectedVigencia("");
    setVigenciasList([]);
    setConfirmingDelete(false);
    setDeleteResult(null);
    setDeleteError(null);
    setDeleteModalOpen(true);
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false);
    setConfirmingDelete(false);
  }

  async function doDelete() {
    const os = Number(delOS.trim());
    if (!os || !selectedVigencia) return;
    setDeleting(true);
    setDeleteError(null);
    setDeleteResult(null);
    try {
      const { eliminados } = await eliminarValoresPorVigencia(os, selectedVigencia);
      setDeleteResult(eliminados);
      // refrescar la lista: la vigencia eliminada ya no debe aparecer
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

  const previewRows = rows.slice(0, PREVIEW_LIMIT);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>
          <FileUp size={20} />
        </span>
        <div className={styles.headerText}>
          <h1 className={styles.title}>Importar Precios desde PDF</h1>
          <p className={styles.subtitle}>
            Lee un PDF de valores del Colegio y genera un CSV con código y precio
          </p>
        </div>
        <button type="button" className={styles.headerDeleteBtn} onClick={openDeleteModal}>
          <Trash2 size={15} />
          Eliminar cargados
        </button>
      </div>

      {/* Upload */}
      <div className={styles.uploadCard}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className={styles.hiddenInput}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {!fileName ? (
          <button
            type="button"
            className={styles.dropZone}
            onClick={() => inputRef.current?.click()}
          >
            <FileUp size={28} />
            <span className={styles.dropTitle}>Seleccionar PDF</span>
            <span className={styles.dropHint}>
              Anexo de valores (PDF con texto, no escaneado)
            </span>
          </button>
        ) : (
          <div className={styles.fileBar}>
            <FileText size={18} className={styles.fileIcon} />
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{fileName}</span>
              {!parsing && !error && (
                <span className={styles.fileMeta}>
                  {rows.length} código{rows.length !== 1 ? "s" : ""} con precio
                </span>
              )}
            </div>

            {parsing ? (
              <Loader2 size={18} className={styles.spin} />
            ) : (
              <div className={styles.fileActions}>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  onClick={downloadCsv}
                  disabled={!canDownload}
                  title={!canDownload ? "Completá vigencia y N° obra social" : undefined}
                >
                  <Download size={15} />
                  Descargar CSV
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={reset}
                  title="Cargar otro PDF"
                >
                  <XIcon size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Datos comunes a todas las filas */}
      <div className={styles.metaCard}>
        <div className={styles.metaGrid}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Vigencia</label>
            <input
              type="date"
              className={styles.fieldInput}
              value={vigencia}
              onChange={(e) => setVigencia(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>N° Obra Social</label>
            <input
              type="number"
              inputMode="numeric"
              className={styles.fieldInput}
              placeholder="Ej: 285"
              value={nroObraSocial}
              onChange={(e) => setNroObraSocial(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Error */}
      {!parsing && error && (
        <div className={styles.errorState}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Preview */}
      {!parsing && rows.length > 0 && (
        <div className={styles.previewCard}>
          <div className={styles.previewHeader}>
            <span className={styles.previewTitle}>Vista previa</span>
            <span className={styles.previewCount}>
              {rows.length > PREVIEW_LIMIT
                ? `Mostrando ${PREVIEW_LIMIT} de ${rows.length}`
                : `${rows.length} fila${rows.length !== 1 ? "s" : ""}`}
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
                    <td className={styles.num}>{r.precio_1}</td>
                    <td className={styles.num}>{r.precio_2}</td>
                    <td className={styles.muted}>{vigencia}</td>
                    <td className={`${styles.num} ${styles.muted}`}>{nroObraSocial}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Paso 2 — importar a la base de datos */}
      {!parsing && rows.length > 0 && (
        <div className={styles.importCard}>
          <div className={styles.importHead}>
            <span className={styles.stepBadge}>Paso 2</span>
            <div>
              <h2 className={styles.importTitle}>Importar a la base de datos</h2>
              <p className={styles.importSub}>
                Crea los valores y precios (nm_valores) para la obra social{" "}
                {nroObraSocial || "…"} con vigencia {vigencia || "…"}.
              </p>
            </div>
          </div>

          <div className={styles.importRow}>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={importToDb}
              disabled={!canDownload || importing}
              title={!canDownload ? "Completá vigencia y N° obra social" : undefined}
            >
              {importing ? (
                <Loader2 size={15} className={styles.spin} />
              ) : (
                <Database size={15} />
              )}
              {importing ? "Importando…" : "Importar a base de datos"}
            </button>
          </div>

          {importError && (
            <div className={styles.errorState}>
              <AlertCircle size={16} />
              {importError}
            </div>
          )}

          {importResult && (
            <div className={styles.importResult}>
              <div className={styles.resultOk}>
                <CheckCircle2 size={15} />
                {importResult.procesados} código{importResult.procesados !== 1 ? "s" : ""} importado
                {importResult.procesados !== 1 ? "s" : ""}
              </div>
              {importResult.errores.length > 0 && (
                <div className={styles.resultErrors}>
                  <div className={styles.resultErrTitle}>
                    <AlertCircle size={14} />
                    {importResult.errores.length} con error
                  </div>
                  <ul>
                    {importResult.errores.slice(0, 20).map((e, i) => (
                      <li key={i}>
                        {e.codigo ? (
                          <>
                            Código <strong>{e.codigo}</strong> (fila {String(e.fila)})
                          </>
                        ) : (
                          <>Fila {String(e.fila)}</>
                        )}
                        : {e.motivo}
                      </li>
                    ))}
                    {importResult.errores.length > 20 && (
                      <li>… y {importResult.errores.length - 20} más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: eliminar códigos de una vigencia */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        title="Eliminar códigos cargados"
        size="small"
      >
        <div className={styles.modalBody}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>N° Obra Social</label>
            <input
              type="number"
              inputMode="numeric"
              className={styles.fieldInput}
              placeholder="Ej: 285"
              value={delOS}
              onChange={(e) => setDelOS(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Vigencia a eliminar</label>
            {loadingVigencias ? (
              <span className={styles.muted}>
                <Loader2 size={14} className={styles.spin} /> Cargando…
              </span>
            ) : !delOS.trim() ? (
              <span className={styles.muted}>Ingresá una obra social.</span>
            ) : vigenciasList.length === 0 ? (
              <span className={styles.muted}>No hay vigencias cargadas para esta obra social.</span>
            ) : (
              <select
                className={styles.fieldInput}
                value={selectedVigencia}
                onChange={(e) => setSelectedVigencia(e.target.value)}
              >
                {vigenciasList.map((v) => (
                  <option key={v.vigencia_desde} value={v.vigencia_desde}>
                    {v.vigencia_desde} — {v.cantidad} código{v.cantidad !== 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {deleteError && (
            <div className={styles.errorState}>
              <AlertCircle size={16} />
              {deleteError}
            </div>
          )}

          {deleteResult !== null && (
            <div className={styles.resultOk}>
              <CheckCircle2 size={15} />
              {deleteResult} código{deleteResult !== 1 ? "s" : ""} eliminado
              {deleteResult !== 1 ? "s" : ""}
            </div>
          )}

          {confirmingDelete ? (
            <div className={styles.confirmRow}>
              <span className={styles.confirmText}>
                ¿Eliminar <strong>todos</strong> los códigos de la obra social {delOS} en la
                vigencia {selectedVigencia}? Es un borrado definitivo, no se puede deshacer.
              </span>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  className={styles.btnDanger}
                  onClick={doDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <Loader2 size={14} className={styles.spin} />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  Sí, eliminar
                </button>
                <button
                  type="button"
                  className={styles.btnGhost}
                  onClick={() => setConfirmingDelete(false)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={() => setConfirmingDelete(true)}
                disabled={!selectedVigencia || deleting}
              >
                <Trash2 size={15} />
                Eliminar
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
