import { useEffect, useState } from "react";

import { fetchAutorizacionExistente } from "../../api";
import type { AutorizacionExistente } from "../../types";

const DEBOUNCE_MS = 400;

/**
 * Períodos de la O.S. donde ya está cargado el Nº de autorización que se está
 * tipeando. Sale una sola consulta cuando el operador deja de escribir; sólo avisa,
 * no bloquea el guardado. `excluirId`: la prestación que se está editando.
 */
export function useAutorizacionExistente(
  codObra: string | null, autorizacion: string, excluirId?: number,
): AutorizacionExistente[] {
  const [existentes, setExistentes] = useState<AutorizacionExistente[]>([]);

  useEffect(() => {
    const aut = autorizacion.trim();
    setExistentes([]);
    if (!codObra || !aut) return;
    let vigente = true;
    const t = setTimeout(() => {
      fetchAutorizacionExistente(codObra, aut, excluirId)
        .then((r) => vigente && setExistentes(r))
        .catch(() => vigente && setExistentes([]));
    }, DEBOUNCE_MS);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [codObra, autorizacion, excluirId]);

  return existentes;
}
