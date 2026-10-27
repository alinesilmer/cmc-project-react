import { useCallback, useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useNotify } from "@/app/hooks/useNotify";
import { hoyISO } from "@/app/shared/lib/fechas";
import { detalleDeError } from "@/app/shared/lib/httpErrors";
import {
  actualizarTarea,
  crearTarea,
  getTareas,
  importarTareas,
  limpiarHechas,
  quitarTarea,
} from "./tareas.api";
import { PRIORIDADES, type Prioridad, type Tarea } from "./tareas.types";

export { PRIORIDADES };
export type { Prioridad, Tarea };

const TAREAS_KEY = ["tareas-del-dia"] as const;

const MAXIMO = 30;
const LARGO_MAXIMO = 140;

// Claves que se están volcando ahora: evita pedirlo dos veces si el efecto corre de nuevo antes de terminar.
const volcando = new Set<string>();

// Lo viejo puede venir de una versión anterior (sin prioridad) o estar roto: se rescata lo que sirve y lo demás se descarta.
function aTarea(x: unknown): Tarea | null {
  if (!x || typeof x !== "object") return null;
  const t = x as Record<string, unknown>;
  if (typeof t.id !== "number" || typeof t.texto !== "string" || typeof t.hecha !== "boolean") return null;
  const prioridad = PRIORIDADES.find((p) => p === t.prioridad) ?? "media";
  return { id: t.id, texto: t.texto, hecha: t.hecha, prioridad };
}

// Cuando las tareas vivían sólo en el navegador. `null` = no hay nada que volcar.
function leerLocal(clave: string): Tarea[] | null {
  try {
    const crudo = window.localStorage.getItem(clave);
    if (!crudo) return null;
    const dato = JSON.parse(crudo) as { fecha?: string; tareas?: unknown } | null;
    const tareas = Array.isArray(dato?.tareas)
      ? dato.tareas.map(aTarea).filter((t): t is Tarea => t !== null)
      : [];
    // Al empezar un día nuevo se iban las tildadas; lo pendiente se arrastra.
    return dato?.fecha === hoyISO() ? tareas : tareas.filter((t) => !t.hecha);
  } catch {
    return null;
  }
}

function borrarLocal(clave: string): void {
  try {
    window.localStorage.removeItem(clave);
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** Lista de tareas del día, guardada en la base y personal de cada usuario. */
export function useTareasDelDia(claveUsuario: string) {
  const queryClient = useQueryClient();
  const notify = useNotify();
  const claveLocal = `cmc:tareas-del-dia:${claveUsuario}`;
  // El usuario va en la clave: nunca se reutiliza la lista de otro en el mismo navegador.
  const key = useMemo(() => [...TAREAS_KEY, claveUsuario], [claveUsuario]);

  const consulta = useQuery({
    queryKey: key,
    queryFn: getTareas,
    enabled: claveUsuario !== "anonimo",
    staleTime: 60_000,
  });

  useEffect(() => {
    if (consulta.isError) {
      notify.error("No se pudieron cargar las tareas", detalleDeError(consulta.error, "Probá de nuevo en un rato."));
    }
  }, [consulta.isError, consulta.error, notify]);

  // Quienes ya usaban el cuaderno tenían todo en el navegador: se sube una vez y recién ahí se borra.
  useEffect(() => {
    if (!consulta.isSuccess || volcando.has(claveLocal)) return;
    const locales = leerLocal(claveLocal);
    if (locales === null) return;
    const subir = locales
      .map(({ texto, hecha, prioridad }) => ({ texto: texto.trim().slice(0, LARGO_MAXIMO), hecha, prioridad }))
      .filter((t) => t.texto)
      .slice(0, MAXIMO);
    if (subir.length === 0) {
      borrarLocal(claveLocal);
      return;
    }
    volcando.add(claveLocal);
    importarTareas(subir)
      .then((filas) => {
        queryClient.setQueryData<Tarea[]>(key, filas);
        borrarLocal(claveLocal);
      })
      .catch(() => {
        // Se conserva lo guardado y se reintenta en la próxima visita.
      })
      .finally(() => volcando.delete(claveLocal));
  }, [consulta.isSuccess, claveLocal, key, queryClient]);

  // Los cambios se ven al instante y viajan en orden, de a uno: con la red lenta, dos clics seguidos no se pisan.
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const enviar = useCallback(<T>(pedido: () => Promise<T>): Promise<T> => {
    const siguiente = cola.current.then(pedido);
    cola.current = siguiente.catch(() => undefined);
    return siguiente;
  }, []);

  const cambiar = useCallback(
    (cambio: (previas: Tarea[]) => Tarea[]) =>
      queryClient.setQueryData<Tarea[]>(key, (previas) => cambio(previas ?? [])),
    [queryClient, key],
  );

  // Si el servidor rechaza el cambio, se vuelve a pedir la lista: lo que se ve es siempre lo guardado.
  const fallo = useCallback(
    (err: unknown, mensaje: string) => {
      notify.error(mensaje, detalleDeError(err, "Probá de nuevo."));
      void queryClient.invalidateQueries({ queryKey: key });
    },
    [notify, queryClient, key],
  );

  // Sin lista cargada no se edita; las recién creadas (id negativo) esperan a que el servidor les dé su id.
  const buscar = useCallback(
    (id: number): Tarea | undefined =>
      id < 0 ? undefined : queryClient.getQueryData<Tarea[]>(key)?.find((t) => t.id === id),
    [queryClient, key],
  );

  const agregar = useCallback(
    (texto: string, prioridad: Prioridad) => {
      const limpio = texto.trim().slice(0, LARGO_MAXIMO);
      const previas = queryClient.getQueryData<Tarea[]>(key);
      if (!limpio || !previas || previas.length >= MAXIMO) return;
      const provisoria = -Date.now();
      cambiar((p) => [...p, { id: provisoria, texto: limpio, hecha: false, prioridad }]);
      enviar(() => crearTarea({ texto: limpio, prioridad }))
        .then((nueva) => cambiar((p) => p.map((t) => (t.id === provisoria ? nueva : t))))
        .catch((err) => {
          cambiar((p) => p.filter((t) => t.id !== provisoria));
          fallo(err, "No se pudo guardar la tarea");
        });
    },
    [queryClient, key, cambiar, enviar, fallo],
  );

  const alternar = useCallback(
    (id: number) => {
      const tarea = buscar(id);
      if (!tarea) return;
      cambiar((p) => p.map((t) => (t.id === id ? { ...t, hecha: !tarea.hecha } : t)));
      enviar(() => actualizarTarea(id, { hecha: !tarea.hecha })).catch((err) =>
        fallo(err, "No se pudo actualizar la tarea"),
      );
    },
    [buscar, cambiar, enviar, fallo],
  );

  const quitar = useCallback(
    (id: number) => {
      if (!buscar(id)) return;
      cambiar((p) => p.filter((t) => t.id !== id));
      enviar(() => quitarTarea(id)).catch((err) => fallo(err, "No se pudo quitar la tarea"));
    },
    [buscar, cambiar, enviar, fallo],
  );

  /** Reescribe una tarea. Dejarla vacía la borra. */
  const editar = useCallback(
    (id: number, texto: string) => {
      if (!buscar(id)) return;
      const limpio = texto.trim().slice(0, LARGO_MAXIMO);
      if (!limpio) {
        quitar(id);
        return;
      }
      cambiar((p) => p.map((t) => (t.id === id ? { ...t, texto: limpio } : t)));
      enviar(() => actualizarTarea(id, { texto: limpio })).catch((err) =>
        fallo(err, "No se pudo actualizar la tarea"),
      );
    },
    [buscar, quitar, cambiar, enviar, fallo],
  );

  /** Pasa a la prioridad siguiente: alta → media → baja → alta. */
  const priorizar = useCallback(
    (id: number) => {
      const tarea = buscar(id);
      if (!tarea) return;
      const prioridad = PRIORIDADES[(PRIORIDADES.indexOf(tarea.prioridad) + 1) % PRIORIDADES.length];
      cambiar((p) => p.map((t) => (t.id === id ? { ...t, prioridad } : t)));
      enviar(() => actualizarTarea(id, { prioridad })).catch((err) =>
        fallo(err, "No se pudo actualizar la tarea"),
      );
    },
    [buscar, cambiar, enviar, fallo],
  );

  /** Saca de la hoja todas las tareas ya tildadas. */
  const limpiar = useCallback(() => {
    cambiar((p) => p.filter((t) => !t.hecha));
    enviar(() => limpiarHechas()).catch((err) => fallo(err, "No se pudo limpiar la hoja"));
  }, [cambiar, enviar, fallo]);

  // Lo urgente arriba. El orden es estable: dentro de una prioridad las tareas quedan como se fueron anotando.
  const tareas = useMemo(
    () =>
      [...(consulta.data ?? [])].sort(
        (a, b) => PRIORIDADES.indexOf(a.prioridad) - PRIORIDADES.indexOf(b.prioridad),
      ),
    [consulta.data],
  );

  const hechas = tareas.filter((t) => t.hecha).length;

  return { tareas, hechas, agregar, alternar, editar, priorizar, quitar, limpiar, llena: tareas.length >= MAXIMO };
}
