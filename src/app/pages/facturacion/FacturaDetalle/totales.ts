// Totales de un conjunto de prestaciones, compartidos por la pantalla y los grupos.
import type { Tipo } from "../types";
import { parseMoney } from "../money";
import { ORDEN_TIPOS } from "./vista/types";
import type { PrestacionConSocio } from "./FilaPrestacion";

// Unidades facturadas de una fila (cantidad × sesión): lo que cuenta como "prestaciones", no la fila.
const unidadesDe = (p: PrestacionConSocio): number => (p.cantidad || 1) * (p.sesion || 1);

// Cantidad de prestaciones (unidades) de un conjunto de filas.
export const sumarUnidades = (arr: PrestacionConSocio[]): number => arr.reduce((n, p) => n + unidadesDe(p), 0);

// Prestaciones (unidades) auditadas sobre el total de un conjunto de filas, para el "(12/20) prest. auditadas".
export const textoAuditadas = (arr: PrestacionConSocio[]): string => {
  const auditadas = sumarUnidades(arr.filter((p) => p.revisado));
  return `(${auditadas}/${sumarUnidades(arr)}) prest. auditadas`;
};

export const sumarTotales = (arr: PrestacionConSocio[]) => arr.reduce(
  (acc, p) => {
    acc.totalHonorarios += parseMoney(p.honorarios);
    acc.totalGastos += parseMoney(p.gastos);
    acc.totalSubtotal += parseMoney(p.subtotal);
    // El coseguro se descuenta por unidad: el total es el de la fila × cantidad × sesión.
    acc.totalCoseguro += parseMoney(p.coseguro) * unidadesDe(p);
    return acc;
  },
  { totalHonorarios: 0, totalGastos: 0, totalSubtotal: 0, totalCoseguro: 0 },
);

// El equipo (ayudante/pediatra/gastos) de una cirugía de Honorarios individuales o Sanatorio se muestra bajo su cabeza pero NO suma al total del médico.
export const sumaEquipo = (cabeza: PrestacionConSocio): boolean =>
  cabeza.tipo !== "Honorarios individuales" && cabeza.tipo !== "Sanatorio";

// Tipo con el que cuenta una fila en los resúmenes por tipo: el equipo cuenta con el de su cabeza
// (el ayudante de una cirugía de Sanatorio suma en Sanatorios). Igual que el exportable.
const tipoParaTotales = (p: PrestacionConSocio) => p.tipoCabeza ?? p.tipo;

export const RESUMEN_TIPO_LABEL: Record<Tipo, string> = {
  Consulta: "Consultas",
  Practica: "Prácticas",
  "Honorarios individuales": "Honorarios ind.",
  Sanatorio: "Sanatorios",
};

// Total en dinero (honorarios + gastos de cada fila, ya con % y cantidad) por tipo, solo los tipos que el grupo tiene.
export const totalesPorTipo = (arr: PrestacionConSocio[]) => ORDEN_TIPOS
  .map((tipo) => {
    const filas = arr.filter((p) => tipoParaTotales(p) === tipo);
    return { tipo, cantidad: sumarUnidades(filas), total: sumarTotales(filas).totalSubtotal };
  })
  .filter((t) => t.cantidad > 0);
