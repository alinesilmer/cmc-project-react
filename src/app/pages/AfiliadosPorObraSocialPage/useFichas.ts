import { useEffect, useMemo, useState } from "react";

import type { ExportRow, Prestador } from "./types";
import { adosarFichas, getMedicosIndex, type MedicosIndex } from "./medicosDirectory";

/** Las filas del padrón con la ficha completa adosada, para mostrar en la tabla las columnas que el padrón no trae. */
export function useFichas(filas: Prestador[], necesitaFicha: boolean) {
  const [indice, setIndice] = useState<MedicosIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!necesitaFicha || indice) return;
    let vivo = true;
    setError(null);
    getMedicosIndex()
      .then((i) => {
        if (vivo) setIndice(i);
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        const status = (e as { response?: { status?: number } } | null)?.response?.status;
        // 403 = tiene padron:leer pero no medicos:leer; es un caso real.
        setError(
          status === 403
            ? "No tenés permiso para leer las fichas de los médicos: las columnas con el ícono de base de datos quedan vacías."
            : "No se pudieron leer las fichas de los médicos: algunas columnas quedan vacías.",
        );
      });
    return () => {
      vivo = false;
    };
  }, [necesitaFicha, indice]);

  const conFicha: ExportRow[] = useMemo(
    () => (necesitaFicha && indice ? adosarFichas(filas, indice) : filas),
    [filas, indice, necesitaFicha],
  );

  return {
    filas: conFicha,
    /** Se están leyendo las fichas: las columnas que dependen de ellas todavía no tienen dato. */
    cargando: necesitaFicha && !indice && !error,
    error,
  };
}
