import { useCallback, useMemo, useState } from "react";
import {
  CAMPOS, CAMPOS_POR_KEY, CAMPOS_POR_DEFECTO,
  camposSeleccionados, contarSensibles, requiereFichaMedico,
} from "./exportFields";
import type { FieldGroup } from "./types";

/** Versionado: si el catálogo cambia, la preferencia vieja se descarta sola. */
const STORAGE_KEY = "cmc_padron_export_campos_v1";

function leerGuardado(): Set<string> | null {
  try {
    const crudo = localStorage.getItem(STORAGE_KEY);
    if (!crudo) return null;
    const arr = JSON.parse(crudo);
    if (!Array.isArray(arr)) return null;
    // Filtrar contra el catálogo evita que una clave retirada resucite como
    // columna fantasma en el PDF.
    const validas = arr.filter((k) => typeof k === "string" && CAMPOS_POR_KEY.has(k));
    return validas.length ? new Set<string>(validas) : null;
  } catch {
    return null;
  }
}

function guardar(keys: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys]));
  } catch {
    // Modo privado o cuota llena: la selección igual funciona en esta sesión.
  }
}

export function useExportFields() {
  const [keys, setKeys] = useState<Set<string>>(
    () => leerGuardado() ?? new Set(CAMPOS_POR_DEFECTO)
  );


  const alternar = useCallback((key: string) => {
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // Un archivo sin columnas no es un archivo: se ignora el último apagado.
      if (next.size === 0) return prev;
      guardar(next);
      return next;
    });
  }, []);

  const alternarGrupo = useCallback((grupo: FieldGroup) => {
    setKeys((prev) => {
      const delGrupo = CAMPOS.filter((c) => c.group === grupo);
      const todosPuestos = delGrupo.every((c) => prev.has(c.key));
      const next = new Set(prev);
      for (const c of delGrupo) {
        if (todosPuestos) next.delete(c.key);
        else next.add(c.key);
      }
      if (next.size === 0) return prev;
      guardar(next);
      return next;
    });
  }, []);


  const seleccionados = useMemo(() => camposSeleccionados(keys), [keys]);
  const sensibles = useMemo(() => contarSensibles(keys), [keys]);
  const necesitaFicha = useMemo(() => requiereFichaMedico(keys), [keys]);

  return {
    keys,
    seleccionados,
    /** Cuántas columnas personales entran en el archivo. */
    sensibles,
    /** Si hace falta descargar la ficha completa de los médicos. */
    necesitaFicha,
    alternar,
    alternarGrupo,
  };
}
