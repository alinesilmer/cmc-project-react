// Estado de una pantalla que lee un reporte de facturación de una obra social
// y lo cruza contra el padrón de médicos.
//
// Es lo único que comparten Prevención Salud y Swiss Medical a nivel lógica: el
// archivo lo lee un parser distinto en cada caso, pero el ciclo —leer, traer el
// padrón, resolver la matrícula de cada fila, poder limpiar y volver a
// empezar— es el mismo. El índice de matrículas se pide en paralelo con el
// archivo porque no depende de lo que traiga la planilla.

import { useCallback, useState } from "react";

import { getIndiceMatriculas } from "../../medicosPorMatricula";
import type { IndiceMatriculas } from "../../medicosPorMatricula";

const AVISO_PADRON =
  "No pudimos leer el padrón de médicos, así que las filas quedan sin " +
  "identificar. Hace falta el permiso de lectura de médicos.";

export interface EstadoReporte<T> {
  /** Nombre del archivo cargado, o `null` si todavía no hay ninguno. */
  archivo: string | null;
  reporte: T | null;
  indice: IndiceMatriculas | null;
  error: string;
  /** Por qué no se pudo cruzar contra el padrón, si pasó. */
  avisoPadron: string;
  leyendo: boolean;
  cargar: (file: File) => Promise<void>;
  limpiar: () => void;
}

export interface OpcionesReporte<T> {
  /** Cuántas filas útiles trajo el archivo; 0 se avisa como error. */
  contar: (reporte: T) => number;
  /** Qué decirle a quien subió un archivo del formato correcto pero vacío. */
  mensajeVacio: string;
}

export function useReporteConPadron<T>(
  leer: (file: File) => Promise<T>,
  { contar, mensajeVacio }: OpcionesReporte<T>
): EstadoReporte<T> {
  const [archivo, setArchivo] = useState<string | null>(null);
  const [reporte, setReporte] = useState<T | null>(null);
  const [indice, setIndice] = useState<IndiceMatriculas | null>(null);
  const [error, setError] = useState("");
  const [avisoPadron, setAvisoPadron] = useState("");
  const [leyendo, setLeyendo] = useState(false);

  const limpiar = useCallback(() => {
    setArchivo(null);
    setReporte(null);
    setIndice(null);
    setError("");
    setAvisoPadron("");
  }, []);

  const cargar = useCallback(
    async (file: File) => {
      setLeyendo(true);
      setError("");
      setAvisoPadron("");
      try {
        const [leido, idx] = await Promise.all([
          leer(file),
          getIndiceMatriculas().catch((e) => {
            // Sin `medico:leer` no se puede mapear, pero el reporte se muestra
            // igual: es preferible ver las filas sin médico que no ver nada.
            setAvisoPadron(AVISO_PADRON);
            console.error("Padrón de matrículas:", e);
            return null;
          }),
        ]);

        setArchivo(file.name);
        setReporte(leido);
        setIndice(idx);
        if (contar(leido) === 0) setError(mensajeVacio);
      } catch (e) {
        limpiar();
        setError(e instanceof Error ? e.message : "No pudimos leer el archivo.");
      } finally {
        setLeyendo(false);
      }
    },
    [leer, contar, mensajeVacio, limpiar]
  );

  return { archivo, reporte, indice, error, avisoPadron, leyendo, cargar, limpiar };
}
