import { useCallback, useEffect, useRef, useState } from "react";
import { saveAs } from "@/app/lib/fileSaver";

import type { ExportField, ExportRow, ExportingPdfMode, ObraSocial, Prestador } from "./types";
import { buildOsCode, fmtDate, safeStr } from "./helpers";
import { adosarFichas, getMedicosIndex } from "./medicosDirectory";
import { buildPdfByEspecialidad, buildSimplePdf } from "./pdfBuilder";
import { buildExcel } from "./excelBuilder";

/** Columnas del padrón que a veces llegan vacías y la ficha completa sí tiene. */
const CONTACTO = ["dom", "mail", "cuit", "cp"];

type Args = {
  selectedOS: ObraSocial | null;
  rows: Prestador[];
  campos: ExportField[];
  necesitaFicha: boolean;
};

/**
 * Prepara las filas y dispara la descarga.
 *
 * La ficha completa (`/api/medicos/all`) se pide sólo cuando hace falta: porque
 * el usuario eligió una columna que el padrón no trae, o porque una columna de
 * contacto que sí trae vino vacía en alguna fila. Con la selección por defecto
 * no se pide nada y la exportación es instantánea.
 */
export function useExportar({ selectedOS, rows, campos, necesitaFicha }: Args) {
  const [exportingPdf, setExportingPdf] = useState<ExportingPdfMode>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const preparar = useCallback(async (signal: AbortSignal): Promise<ExportRow[]> => {
    const claves = new Set(campos.map((c) => c.key));
    const faltaContacto = CONTACTO.some(
      (k) => claves.has(k) &&
        rows.some((r) => {
          const campo = campos.find((c) => c.key === k);
          return campo ? !safeStr(campo.get(r)).trim() : false;
        })
    );

    if (!necesitaFicha && !faltaContacto) return rows;

    const idx = await getMedicosIndex(signal);
    return adosarFichas(rows, idx) as ExportRow[];
  }, [campos, necesitaFicha, rows]);

  const correr = useCallback(async (
    marcarOcupado: () => void,
    construir: (filas: ExportRow[], os: ObraSocial, signal: AbortSignal) => Promise<Blob>,
    nombreArchivo: (codigo: string) => string,
    mensajeError: string
  ) => {
    if (!selectedOS || rows.length === 0) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    marcarOcupado();
    try {
      const filas = await preparar(ctrl.signal);
      if (ctrl.signal.aborted) return;
      const blob = await construir(filas, selectedOS, ctrl.signal);
      if (ctrl.signal.aborted) return;
      saveAs(blob, nombreArchivo(buildOsCode(selectedOS)));
    } catch (e: unknown) {
      const err = e as { name?: string; response?: { status?: number } };
      if (ctrl.signal.aborted || err?.name === "AbortError") return;
      // 403 = tiene padron:leer pero no medicos:leer. Es un caso real y el
      // mensaje genérico no ayudaría a entender qué destildar.
      if (err?.response?.status === 403) {
        setError(
          "No tenés permiso para leer las fichas de los médicos. " +
          "Quitá las columnas marcadas con el ícono de base de datos y volvé a intentar."
        );
      } else {
        console.error(e);
        setError(mensajeError);
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
      setExportingPdf(null);
      setExportingExcel(false);
    }
  }, [preparar, rows.length, selectedOS]);

  const descargarPdf = useCallback(() => correr(
    () => setExportingPdf("pdf"),
    (filas, os, signal) => buildSimplePdf(filas, os, campos, signal),
    (cod) => `prestadores_${cod}_${fmtDate(new Date())}.pdf`,
    "No se pudo generar el PDF. Probá con menos columnas o exportá en Excel."
  ), [campos, correr]);

  const descargarPdfPorEspecialidad = useCallback(() => correr(
    () => setExportingPdf("pdf_by_especialidad"),
    (filas, os, signal) => buildPdfByEspecialidad(filas, os, campos, signal),
    (cod) => `prestadores_${cod}_por_especialidad_${fmtDate(new Date())}.pdf`,
    "No se pudo generar el PDF por especialidad."
  ), [campos, correr]);

  const descargarExcel = useCallback(() => correr(
    () => setExportingExcel(true),
    (filas, os) => buildExcel(filas, os, campos),
    (cod) => `prestadores_${cod}_${fmtDate(new Date())}.xlsx`,
    "No se pudo generar el Excel."
  ), [campos, correr]);

  return {
    exportingPdf,
    exportingExcel,
    ocupado: exportingPdf !== null || exportingExcel,
    error,
    limpiarError: useCallback(() => setError(null), []),
    descargarPdf,
    descargarPdfPorEspecialidad,
    descargarExcel,
  };
}
