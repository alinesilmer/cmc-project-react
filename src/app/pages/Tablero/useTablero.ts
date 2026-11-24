import { useCallback, useEffect, useRef, useState } from "react";

import { ESTADOS, PRIORIDADES, TOPE_TARJETAS, type Comentario, type Estado, type NuevaTarjeta, type Tarjeta } from "./tablero.types";

// Sin backend todavía: el tablero se guarda en este navegador. Cuando exista la API, cambia sólo este archivo.
const CLAVE = "cmc:tablero";

const esEstado = (v: unknown): v is Estado => ESTADOS.some((e) => e.valor === v);

function leer(): Tarjeta[] {
  try {
    const crudo: unknown = JSON.parse(localStorage.getItem(CLAVE) ?? "[]");
    if (!Array.isArray(crudo)) return [];
    return crudo.flatMap((t): Tarjeta[] => {
      if (typeof t !== "object" || t === null) return [];
      const r = t as Partial<Tarjeta>;
      if (typeof r.id !== "string" || typeof r.titulo !== "string" || !esEstado(r.estado)) return [];
      return [
        {
          id: r.id,
          titulo: r.titulo,
          descripcion: typeof r.descripcion === "string" ? r.descripcion : "",
          estado: r.estado,
          prioridad: PRIORIDADES.some((p) => p.valor === r.prioridad) ? (r.prioridad as Tarjeta["prioridad"]) : "media",
          asignadoId: typeof r.asignadoId === "number" ? r.asignadoId : null,
          asignadoNombre: typeof r.asignadoNombre === "string" ? r.asignadoNombre : "",
          vence: typeof r.vence === "string" ? r.vence : "",
          comentarios: Array.isArray(r.comentarios) ? r.comentarios : [],
        },
      ];
    });
  } catch {
    return [];
  }
}

function guardar(tarjetas: Tarjeta[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(tarjetas));
  } catch {
    // Sin almacenamiento (ventana privada): el tablero sigue andando hasta que se cierre.
  }
}

const nuevoId = () => crypto.randomUUID();

/** Tarjetas del tablero y sus operaciones; el orden de cada columna es el del arreglo. */
export function useTablero() {
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(leer);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    guardar(tarjetas);
  }, [tarjetas]);

  const llena = tarjetas.length >= TOPE_TARJETAS;

  const crear = useCallback((datos: NuevaTarjeta): string => {
    const id = nuevoId();
    setTarjetas((ts) => (ts.length >= TOPE_TARJETAS ? ts : [...ts, { ...datos, id, comentarios: [] }]));
    return id;
  }, []);

  const editar = useCallback((id: string, cambios: Partial<Omit<Tarjeta, "id" | "comentarios">>) => {
    setTarjetas((ts) => ts.map((t) => (t.id === id ? { ...t, ...cambios } : t)));
  }, []);

  const quitar = useCallback((id: string) => {
    setTarjetas((ts) => ts.filter((t) => t.id !== id));
  }, []);

  /** Pone la tarjeta en `estado`, justo antes de `antesDe`; sin ella, al final de la columna. */
  const mover = useCallback((id: string, estado: Estado, antesDe: string | null) => {
    setTarjetas((ts) => {
      const mia = ts.find((t) => t.id === id);
      if (!mia) return ts;
      const resto = ts.filter((t) => t.id !== id);
      const movida = { ...mia, estado };
      const delante = antesDe ? resto.findIndex((t) => t.id === antesDe) : -1;
      if (delante >= 0) return [...resto.slice(0, delante), movida, ...resto.slice(delante)];
      let ultima = -1;
      resto.forEach((t, i) => {
        if (t.estado === estado) ultima = i;
      });
      if (ultima >= 0) return [...resto.slice(0, ultima + 1), movida, ...resto.slice(ultima + 1)];
      return [...resto, movida];
    });
  }, []);

  const comentar = useCallback((id: string, autor: string, texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;
    const comentario: Comentario = { id: nuevoId(), autor, texto: limpio, creado: new Date().toISOString() };
    setTarjetas((ts) => ts.map((t) => (t.id === id ? { ...t, comentarios: [...t.comentarios, comentario] } : t)));
  }, []);

  return { tarjetas, llena, crear, editar, quitar, mover, comentar };
}
