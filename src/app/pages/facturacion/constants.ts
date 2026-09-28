import type { EstadoPrestacion, Tipo, TipoPrestador } from "./types";

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

// Siglas de las tablas de prestaciones (columnas TP y TIPO); el nombre completo va en el `title`.
export const TIPO_PRESTADOR_ABREV: Record<NonNullable<TipoPrestador>, string> = {
  Medico: "M",
  Ayudante: "A",
  Pediatra: "PE",
  Gastos: "C", // línea de la clínica (el sanatorio cobra los gastos)
};

export const TIPO_ABREV: Record<Tipo, string> = {
  Consulta: "C",
  "Honorarios individuales": "HI",
  Practica: "P",
  Sanatorio: "S",
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
export const FACTURACION_AUTORIZACION_POR_INTEGRANTE_KEY = "facturacion:autorizacionPorIntegrante";
