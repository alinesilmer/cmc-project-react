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
    const filas = arr.filter((p) => p.tipo === tipo);
    return { tipo, cantidad: filas.length, total: sumarTotales(filas).totalSubtotal };
  })
  .filter((t) => t.cantidad > 0);
