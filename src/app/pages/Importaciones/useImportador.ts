// El estado de una pantalla de importación.
//
// Los dos pasos —previsualizar y confirmar— son iguales para cualquier obra
// social: sólo cambian el parser, los endpoints y las columnas de la tabla.
// Eso queda acá, y cada pantalla aporta lo suyo.

import { useEffect, useMemo, useState } from "react";

import type { ImportacionOut, PeriodoOpcion } from "./importaciones.api";

export type Filtro = "todas" | "problemas";

export interface ApiImportador<T> {
  periodos: () => Promise<{ sugerido: string; periodos: PeriodoOpcion[] }>;
  previsualizar: (filas: T[], periodo: string, archivo: string) => Promise<ImportacionOut>;
  confirmar: (filas: T[], periodo: string, archivo: string) => Promise<ImportacionOut>;
}

export function useImportador<T>(
  api: ApiImportador<T>,
  prestaciones: T[],
  archivo: string | null
) {
  const [periodos, setPeriodos] = useState<PeriodoOpcion[]>([]);
  const [periodo, setPeriodo] = useState("");
  const [salida, setSalida] = useState<ImportacionOut | null>(null);
  const [confirmado, setConfirmado] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todas");

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const res = await api.periodos();
        if (!vigente) return;
        setPeriodos(res.periodos);
        setPeriodo(res.sugerido);
      } catch {
        if (vigente) setError("No pudimos leer los períodos disponibles.");
      }
    })();
    return () => {
      vigente = false;
    };
    // `api` es un objeto literal en el llamador: incluirlo relanzaría el
    // pedido en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambiar de archivo o de período invalida lo previsualizado: lo que se
  // confirma tiene que ser exactamente lo que se vio.
  useEffect(() => {
    setSalida(null);
    setConfirmado(false);
  }, [archivo, periodo]);

  const cerrado = periodos.find((p) => p.periodo === periodo)?.cerrado ?? false;

  const correr = async (grabar: boolean) => {
    setTrabajando(true);
    setError("");
    try {
      const fn = grabar ? api.confirmar : api.previsualizar;
      const res = await fn(prestaciones, periodo, archivo ?? "");
      setSalida(res);
      setConfirmado(grabar);
      // Si algo no entra, se muestra primero: es lo que hay que resolver.
      if (!grabar && res.resumen.grabables < res.resumen.total) {
        setFiltro("problemas");
      }
    } catch (e) {
      console.error("Importación:", e);
      setError(
        e instanceof Error
          ? e.message
          : "No pudimos procesar el reporte en este momento."
      );
    } finally {
      setTrabajando(false);
    }
  };

  const visibles = useMemo(() => {
    if (!salida) return [];
    return filtro === "problemas"
      ? salida.filas.filter(
          (f) => f.resultado !== "grabable" && f.resultado !== "grabada"
        )
      : salida.filas;
  }, [salida, filtro]);

  const conProblemas = salida
    ? salida.resumen.total - salida.resumen.grabables
    : 0;

  return {
    periodos,
    periodo,
    setPeriodo,
    cerrado,
    salida,
    confirmado,
    trabajando,
    error,
    filtro,
    setFiltro,
    visibles,
    conProblemas,
    correr,
  };
}
