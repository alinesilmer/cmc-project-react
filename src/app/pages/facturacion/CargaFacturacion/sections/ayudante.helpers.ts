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

export const montoLinea = (linea: AyudanteLinea, precio: PrecioResponse): number => {
  const base = linea.tipoCalculo === "A" ? parseMoney(precio.ayudante) : parseMoney(linea.precioManual);
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
  return lineas.reduce((acc, l) => acc + montoLinea(l, precio), 0) * cantidad * sesion;
};
