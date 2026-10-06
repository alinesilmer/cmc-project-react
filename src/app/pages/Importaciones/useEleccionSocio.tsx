// Socios elegidos a mano en la previsualización (matrícula repetida o sin socio).
//
// La elección es POR FILA: elegir el socio de una práctica no toca las demás de
// la misma matrícula (una matrícula repetida puede ser de socios distintos en
// prácticas distintas). Lo mismo descartar.
//
// Las elecciones viven aparte de las prestaciones y se aplican recién al
// mandarlas: así elegir no cambia la lista de filas, y `useImportador` no borra
// la previsualización que se está mirando. Elegir o descartar deja la pantalla
// "sin revisar" hasta volver a previsualizar, para que lo que se confirma sea
// exactamente lo que se vio.
//
// Cada fila se identifica por su posición en el ARCHIVO. El backend numera las
// que recibe (`FilaResultado.indice`), y esas no son las mismas una vez que se
// descartó alguna: `enviadas` guarda, para la última previsualización, qué fila
// del archivo es cada una.

import { useCallback, useEffect, useRef, useState } from "react";

import ElegirSocio from "./components/ElegirSocio";
import type { FilaResultado, ImportacionOut } from "./importaciones.api";

export type ConSocioElegido<T> = T & { nroSocioElegido?: number | null };

export function useEleccionSocio<T extends object>(prestaciones: T[]) {
  const [elecciones, setElecciones] = useState<Record<number, number>>({});
  const [descartadas, setDescartadas] = useState<Set<number>>(new Set());
  const [sinRevisar, setSinRevisar] = useState(false);
  const decisiones = useRef({ elecciones, descartadas });
  decisiones.current = { elecciones, descartadas };
  /** Posición en el archivo de cada fila mandada en la última previsualización. */
  const enviadas = useRef<number[]>([]);

  // Otro archivo: las decisiones del anterior no valen.
  useEffect(() => {
    setElecciones({});
    setDescartadas(new Set());
    setSinRevisar(false);
    enviadas.current = [];
  }, [prestaciones]);

  /** Las filas a mandar: sin las descartadas y con el socio elegido. Estable. */
  const aplicar = useCallback((filas: T[]): ConSocioElegido<T>[] => {
    const { elecciones: e, descartadas: d } = decisiones.current;
    const posiciones: number[] = [];
    const out: ConSocioElegido<T>[] = [];
    filas.forEach((p, i) => {
      if (d.has(i)) return;
      posiciones.push(i);
      out.push(e[i] ? { ...p, nroSocioElegido: e[i] } : (p as ConSocioElegido<T>));
    });
    enviadas.current = posiciones;
    return out;
  }, []);

  /** Llamar después de previsualizar: lo elegido ya está aplicado. */
  const revisado = useCallback(() => setSinRevisar(false), []);

  const posicion = (f: FilaResultado) => enviadas.current[f.indice] ?? f.indice;

  const elegir = (fila: number, nro: number | null) => {
    setElecciones((prev) => {
      const next = { ...prev };
      if (nro == null) delete next[fila];
      else next[fila] = nro;
      return next;
    });
    setSinRevisar(true);
  };
  const descartar = (fila: number) => {
    setDescartadas((prev) => new Set(prev).add(fila));
    setSinRevisar(true);
  };

  const elegirSocio = (f: FilaResultado) => {
    const fila = posicion(f);
    return (
      <ElegirSocio
        fila={f}
        valor={elecciones[fila] ?? null}
        descartada={descartadas.has(fila)}
        onElegir={(n) => elegir(fila, n)}
        onDescartar={() => descartar(fila)}
      />
    );
  };

  /** Por qué todavía no se puede confirmar, o `undefined`. */
  const bloqueo = (salida: ImportacionOut | null): string | undefined =>
    sinRevisar
      ? "Volvé a previsualizar para aplicar los socios elegidos."
      : salida && salida.resumen.porElegir > 0
        ? `Elegí el socio de ${salida.resumen.porElegir} filas, o descartalas, y volvé a previsualizar.`
        : undefined;

  return { aplicar, revisado, elegirSocio, bloqueo };
}
