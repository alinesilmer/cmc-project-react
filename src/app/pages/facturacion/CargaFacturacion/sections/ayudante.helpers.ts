import type { PrecioResponse } from "../../types";
import { parseMoney } from "../../money";
import type { AyudanteLinea } from "./AyudanteSection";

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `ay-${Date.now()}-${Math.random()}`;

export const crearAyudanteLinea = (precioAutomatico: string, autorizacion = ""): AyudanteLinea => ({
  id: nuevoId(),
  prestacionId: null,
  codMedico: null,
  medico: null,
  porcentaje: "100",
  tipoCalculo: "A",
  precioManual: precioAutomatico,
  autorizacion,
});

/**
 * El valor de ayudantía del código es el TOTAL de la práctica: se reparte entre los ayudantes del
 * equipo. Mismo criterio que el backend (`reparto_ayudante`): los centavos que no se dividen parejo
 * van al primero, así la suma da siempre el total.
 */
export const repartirAyudante = (total: number, n: number): number[] => {
  const cant = Math.max(Math.floor(n) || 1, 1);
  const centavos = Math.round(total * 100);
  const base = Math.floor(centavos / cant);
  const resto = centavos - base * cant;
  return Array.from({ length: cant }, (_, i) => (i === 0 ? base + resto : base) / 100);
};

/** Lo que cobra la línea `indice` si hay `cantidad` ayudantes cargados (automático: su parte del total). */
export const montoLinea = (
  linea: AyudanteLinea, precio: PrecioResponse, cantidad = 1, indice = 0,
): number => {
  const base = linea.tipoCalculo === "A"
    ? repartirAyudante(parseMoney(precio.ayudante), cantidad)[indice] ?? 0
    : parseMoney(linea.precioManual);
  const porc = parseInt(linea.porcentaje, 10);
  return base * ((Number.isNaN(porc) ? 100 : porc) / 100);
};

export const totalAyudantes = (
  lineas: AyudanteLinea[],
  precio: PrecioResponse | null,
  cantidad = 1,
  sesion = 1,
): number => {
  if (!precio) return 0;
  return lineas.reduce((acc, l, i) => acc + montoLinea(l, precio, lineas.length, i), 0) * cantidad * sesion;
};
