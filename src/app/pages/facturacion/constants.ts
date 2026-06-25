import type { EstadoPrestacion, Tipo } from "./types";

export const MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

export const ESTADO_LABEL: Record<EstadoPrestacion, string> = {
  A: "Abierto",
  C: "Cerrado",
  X: "Anulado",
  L: "Legacy",
};

export const TIPO_LABEL: Record<Tipo, string> = {
  "Consulta": "Consulta",
  "Practica": "Práctica",
  "Honorarios individuales": "Honorarios individuales",
  "Sanatorio": "Sanatorio",
};

export const CODIGOS_BLOQUEADOS = ["5000", "6000"];

export const FACTURACION_ULTIMA_OS_KEY = "facturacion:ultimaOS";
export const FACTURACION_FILTROS_KEY = "facturacion:listado:filtros";
