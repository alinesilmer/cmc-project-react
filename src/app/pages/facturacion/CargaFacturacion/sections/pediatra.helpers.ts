import type { PrecioResponse } from "../../types";
import { parseMoney } from "../../money";
import type { PediatraLinea } from "./PediatraSection";

const nuevoId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pe-${Date.now()}-${Math.random()}`;

export const crearPediatraLinea = (autorizacion = ""): PediatraLinea => ({
  id: nuevoId(),
  prestacionId: null,
  codMedico: null,
  medico: null,
  codNomenclador: null,
  codigoPreset: null,
  porcentaje: "100",
  tipoCalculo: "A",
  precioManual: "0",
  autorizacion,
});

// El pediatra cobra en HONORARIOS (de su propio código) — a diferencia de totalAyudantes, que lee `precio.ayudante` del código PRINCIPAL.
export const montoPediatra = (linea: PediatraLinea, precioPediatra: PrecioResponse | null): number => {
  if (!precioPediatra) return 0;
  const base = linea.tipoCalculo === "A" ? parseMoney(precioPediatra.honorarios) : parseMoney(linea.precioManual);
  const porc = parseInt(linea.porcentaje, 10);
  return base * ((Number.isNaN(porc) ? 100 : porc) / 100);
};
