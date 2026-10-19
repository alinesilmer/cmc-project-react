import { useCallback, useEffect, useMemo, useState } from "react";

export type Prioridad = "alta" | "media" | "baja";

export type Tarea = { id: number; texto: string; hecha: boolean; prioridad: Prioridad };

type Guardado = { fecha: string; tareas: Tarea[] };

const MAXIMO = 30;
const LARGO_MAXIMO = 140;

/** De la más urgente a la menos: es el orden de la lista y el del botón que las rota. */
export const PRIORIDADES: Prioridad[] = ["alta", "media", "baja"];

function hoyIso(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

// Lo guardado puede venir de una versión anterior (sin prioridad) o estar roto: se rescata lo que sirve y lo demás se descarta.
function aTarea(x: unknown): Tarea | null {
  if (!x || typeof x !== "object") return null;
  const t = x as Record<string, unknown>;
  if (typeof t.id !== "number" || typeof t.texto !== "string" || typeof t.hecha !== "boolean") return null;
  const prioridad = PRIORIDADES.find((p) => p === t.prioridad) ?? "media";
  return { id: t.id, texto: t.texto, hecha: t.hecha, prioridad };
}

// El almacenamiento puede fallar (modo privado, cuota): la lista es una comodidad, nunca tiene que romper el Inicio.
function leer(clave: string): Tarea[] {
  try {
    const crudo = window.localStorage.getItem(clave);
    if (!crudo) return [];
    const dato = JSON.parse(crudo) as Partial<Guardado> | null;
    const tareas = Array.isArray(dato?.tareas)
      ? dato.tareas.map(aTarea).filter((t): t is Tarea => t !== null)
      : [];
    // Al empezar un día nuevo se van las tildadas; lo pendiente se arrastra.
    return dato?.fecha === hoyIso() ? tareas : tareas.filter((t) => !t.hecha);
  } catch {
    return [];
  }
}

function guardar(clave: string, tareas: Tarea[]): void {
  try {
    const dato: Guardado = { fecha: hoyIso(), tareas };
    window.localStorage.setItem(clave, JSON.stringify(dato));
  } catch {
    // Sin almacenamiento la lista dura lo que dura la pestaña.
  }
}

/** Lista de tareas del día. */
export function useTareasDelDia(claveUsuario: string) {
  const clave = `cmc:tareas-del-dia:${claveUsuario}`;
  const [guardadas, setGuardadas] = useState<Tarea[]>(() => leer(clave));

  useEffect(() => {
    setGuardadas(leer(clave));
  }, [clave]);

  const cambiar = useCallback(
    (cambio: (previas: Tarea[]) => Tarea[]) => {
      setGuardadas((previas) => {
        const siguientes = cambio(previas);
        guardar(clave, siguientes);
        return siguientes;
      });
    },
    [clave],
  );

  const agregar = useCallback(
    (texto: string, prioridad: Prioridad) => {
      const limpio = texto.trim();
      if (!limpio) return;
      cambiar((previas) =>
        previas.length >= MAXIMO
          ? previas
          : [...previas, { id: Date.now(), texto: limpio.slice(0, LARGO_MAXIMO), hecha: false, prioridad }],
      );
    },
    [cambiar],
  );

  const alternar = useCallback(
    (id: number) => cambiar((previas) => previas.map((t) => (t.id === id ? { ...t, hecha: !t.hecha } : t))),
    [cambiar],
  );

  /** Reescribe una tarea. Dejarla vacía la borra. */
  const editar = useCallback(
    (id: number, texto: string) => {
      const limpio = texto.trim().slice(0, LARGO_MAXIMO);
      cambiar((previas) =>
        limpio ? previas.map((t) => (t.id === id ? { ...t, texto: limpio } : t)) : previas.filter((t) => t.id !== id),
      );
    },
    [cambiar],
  );

  /** Pasa a la prioridad siguiente: alta → media → baja → alta. */
  const priorizar = useCallback(
    (id: number) =>
      cambiar((previas) =>
        previas.map((t) =>
          t.id === id
            ? { ...t, prioridad: PRIORIDADES[(PRIORIDADES.indexOf(t.prioridad) + 1) % PRIORIDADES.length] }
            : t,
        ),
      ),
    [cambiar],
  );

  const quitar = useCallback(
    (id: number) => cambiar((previas) => previas.filter((t) => t.id !== id)),
    [cambiar],
  );

  /** Saca de la hoja todas las tareas ya tildadas. */
  const limpiar = useCallback(() => cambiar((previas) => previas.filter((t) => !t.hecha)), [cambiar]);

  // Lo urgente arriba. El orden es estable: dentro de una prioridad las tareas quedan como se fueron anotando.
  const tareas = useMemo(
    () => [...guardadas].sort((a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad)),
    [guardadas],
  );

  const hechas = tareas.filter((t) => t.hecha).length;

  return { tareas, hechas, agregar, alternar, editar, priorizar, quitar, limpiar, llena: tareas.length >= MAXIMO };
}
