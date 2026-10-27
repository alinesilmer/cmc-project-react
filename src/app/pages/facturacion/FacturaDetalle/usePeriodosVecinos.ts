import { useEffect, useMemo, useState } from "react";

import { listarFacturas } from "../api";

export interface PeriodoVecino {
  /** `id_prestaciones` de la factura original de ese período. */
  idFactura: number;
  periodo: string;
  label: string;
}

/**
 * Períodos de la misma obra social (factura original de cada uno) que están justo antes y
 * justo después de `periodoActual`, para moverse entre ellos desde el listado.
 * `periodo` es YYYYMM, así que ordenar el texto es ordenar por fecha.
 */
export function usePeriodosVecinos(codObra: string | undefined, periodoActual: string | undefined) {
  const [periodos, setPeriodos] = useState<PeriodoVecino[]>([]);

  useEffect(() => {
    if (!codObra) { setPeriodos([]); return; }
    let vigente = true;
    listarFacturas({ cod_obra: codObra, solo_complementos: false, limit: 200 })
      .then(({ data }) => {
        if (!vigente) return;
        setPeriodos(
          data
            .map((f) => ({ idFactura: f.id_prestaciones, periodo: f.periodo, label: f.periodo_label || f.periodo }))
            .sort((a, b) => a.periodo.localeCompare(b.periodo)),
        );
      })
      .catch(() => { if (vigente) setPeriodos([]); });
    return () => { vigente = false; };
  }, [codObra]);

  return useMemo(() => {
    const i = periodos.findIndex((p) => p.periodo === periodoActual);
    return {
      anterior: i > 0 ? periodos[i - 1] : null,
      siguiente: i >= 0 && i < periodos.length - 1 ? periodos[i + 1] : null,
    };
  }, [periodos, periodoActual]);
}
