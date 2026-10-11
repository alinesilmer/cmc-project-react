// Totales de un conjunto de prestaciones, compartidos por la pantalla y los grupos.
import type { Tipo } from "../types";
import { parseMoney } from "../money";
import { ORDEN_TIPOS } from "./vista/types";
import type { PrestacionConSocio } from "./FilaPrestacion";

export const sumarTotales = (arr: PrestacionConSocio[]) => arr.reduce(
  (acc, p) => {
    acc.totalHonorarios += parseMoney(p.honorarios);
    acc.totalGastos += parseMoney(p.gastos);
    acc.totalSubtotal += parseMoney(p.subtotal);
    acc.totalCoseguro += parseMoney(p.coseguro);
    return acc;
  },
  { totalHonorarios: 0, totalGastos: 0, totalSubtotal: 0, totalCoseguro: 0 },
);

// El equipo (ayudante/pediatra/gastos) de una cirugía de Honorarios individuales o Sanatorio
// se muestra bajo su cabeza pero NO suma al total del médico; en el resto sí.
export const sumaEquipo = (cabeza: PrestacionConSocio): boolean =>
  cabeza.tipo !== "Honorarios individuales" && cabeza.tipo !== "Sanatorio";

// Tipo con el que cuenta una fila en los resúmenes por tipo: el equipo cuenta con el de su cabeza
// (el ayudante de una cirugía de Sanatorio suma en Sanatorios). Igual que el exportable.
export const tipoParaTotales = (p: PrestacionConSocio) => p.tipoCabeza ?? p.tipo;

export const RESUMEN_TIPO_LABEL: Record<Tipo, string> = {
  Consulta: "Consultas",
  Practica: "Prácticas",
  "Honorarios individuales": "Honorarios ind.",
  Sanatorio: "Sanatorios",
};

// Total en dinero (honorarios + gastos de cada fila, ya con % y cantidad) por tipo,
// solo los tipos que el grupo tiene, en el orden fijo de `ORDEN_TIPOS`.
export const totalesPorTipo = (arr: PrestacionConSocio[]) => ORDEN_TIPOS
  .map((tipo) => {
    const filas = arr.filter((p) => tipoParaTotales(p) === tipo);
    return { tipo, cantidad: filas.length, total: sumarTotales(filas).totalSubtotal };
  })
  .filter((t) => t.cantidad > 0);
