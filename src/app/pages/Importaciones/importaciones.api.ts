// Cliente de /api/importaciones.
//
// El archivo lo parsea el front (`prevencion.parser.ts`, el mismo lector que
// usa la pantalla de Validaciones) y acá se mandan las filas ya leídas. El
// backend no confía en ellas: vuelve a resolver médico, código y precio contra
// la base. Del reporte sólo toma lo que únicamente él sabe — autorización,
// fecha, paciente y estado.

import { getJSON, postJSON } from "@/app/shared/lib/http";
import type { PrestacionPrevencion } from "@/app/pages/Validaciones/prevencion.parser";
import type { PrestacionSwiss } from "@/app/pages/Validaciones/swissMedical.parser";
import type { PrestacionUnne } from "./unne.parser";

export interface PeriodoOpcion {
  periodo: string;
  /** El Colegio ya cerró o liquidó: no admite carga. */
  cerrado: boolean;
  /** El que apunta `periodo_medico_actual`. */
  sugerido: boolean;
}

export interface PeriodosOut {
  sugerido: string;
  periodos: PeriodoOpcion[];
}

/** Lo que el backend decidió para cada fila. */
export type ResultadoFila = "grabable" | "grabada" | "duplicada" | "omitida" | "elegir_socio";

/** Socio posible para una matrícula repetida o sin socio. */
export interface CandidatoSocio {
  nroSocio: number;
  nombre: string;
}

export interface FilaResultado {
  indice: number;
  resultado: ResultadoFila;
  motivo: string;
  /** Advertencia que no impide grabar (ej. importe distinto al nomenclador). */
  aviso: string;
  /** Socios posibles cuando la matrícula está repetida o no cae en ninguno. */
  candidatos: CandidatoSocio[];

  nroAutorizacion: string;
  fecha: string | null;
  codigo: string;
  descripcion: string;
  afiliado: string;
  estadoReporte: string;

  matricula: string;
  nroSocio: number | null;
  medico: string;

  honorarios: number;
  gastos: number;
  importeTotal: number;
  /** 'A' entra a la factura, 'X' queda fuera. */
  estadoDetalle: string;

  idDetalle: number | null;
}

export interface ResumenImportacion {
  periodo: string;
  total: number;
  grabables: number;
  duplicadas: number;
  omitidas: number;
  sinMedico: number;
  rechazadas: number;
  importeTotal: number;
  /** Filas esperando que se elija el socio, y filas con aviso (UNNE y Prevención). */
  porElegir: number;
  conAviso: number;
}

export interface ImportacionOut {
  resumen: ResumenImportacion;
  filas: FilaResultado[];
}

// El backend habla snake_case; el front, camelCase. La traducción va acá y no
// desparramada por la pantalla.

interface ApiFila {
  indice: number;
  resultado: ResultadoFila;
  motivo: string;
  aviso?: string;
  candidatos?: { nro_socio: number; nombre: string }[];
  nro_autorizacion: string;
  fecha: string | null;
  codigo: string;
  descripcion: string;
  afiliado: string;
  estado_reporte: string;
  matricula: string;
  nro_socio: number | null;
  medico: string;
  honorarios: number | string;
  gastos: number | string;
  importe_total: number | string;
  estado_detalle: string;
  id_detalle: number | null;
}

interface ApiOut {
  resumen: {
    periodo: string;
    total: number;
    grabables: number;
    duplicadas: number;
    omitidas: number;
    sin_medico: number;
    rechazadas: number;
    importe_total: number | string;
    por_elegir?: number;
    con_aviso?: number;
  };
  filas: ApiFila[];
}

/**
 * Previsualizar y confirmar procesan el reporte entero: cientos de filas, cada
 * una con su médico, su código y su precio. Con los 15 s por defecto un mes
 * grande puede cortar del lado del navegador mientras el backend sigue, y en
 * «confirmar» eso es grave: la importación queda grabada y la pantalla dice
 * que falló. (El reporte de agosto, 581 prácticas, tarda ~2 s en local.)
 */
const LARGO = { timeout: 120_000 };

const num = (v: number | string): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const aFila = (f: ApiFila): FilaResultado => ({
  indice: f.indice,
  resultado: f.resultado,
  motivo: f.motivo,
  aviso: f.aviso ?? "",
  candidatos: (f.candidatos ?? []).map((c) => ({ nroSocio: c.nro_socio, nombre: c.nombre })),
  nroAutorizacion: f.nro_autorizacion,
  fecha: f.fecha,
  codigo: f.codigo,
  descripcion: f.descripcion,
  afiliado: f.afiliado,
  estadoReporte: f.estado_reporte,
  matricula: f.matricula,
  nroSocio: f.nro_socio,
  medico: f.medico,
  honorarios: num(f.honorarios),
  gastos: num(f.gastos),
  importeTotal: num(f.importe_total),
  estadoDetalle: f.estado_detalle,
  idDetalle: f.id_detalle,
});

const aSalida = (res: ApiOut): ImportacionOut => ({
  resumen: {
    periodo: res.resumen.periodo,
    total: res.resumen.total,
    grabables: res.resumen.grabables,
    duplicadas: res.resumen.duplicadas,
    omitidas: res.resumen.omitidas,
    sinMedico: res.resumen.sin_medico,
    rechazadas: res.resumen.rechazadas,
    importeTotal: num(res.resumen.importe_total),
    porElegir: res.resumen.por_elegir ?? 0,
    conAviso: res.resumen.con_aviso ?? 0,
  },
  filas: (res.filas ?? []).map(aFila),
});

/** Obras sociales en las que se carga el reporte de Prevención. La 888 es de
 * prueba: tiene el mismo nomenclador y sirve para ensayar sin tocar la 103. */
export const OBRAS_PREVENCION = [
  { nro: 103, nombre: "Prevención Salud" },
  { nro: 888, nombre: "Prueba Prevención" },
] as const;

/** Una práctica del reporte, con el socio elegido a mano si hizo falta. */
export type PrestacionPrevencionElegida = PrestacionPrevencion & { nroSocioElegido?: number | null };

/** Las prácticas del reporte, en el formato que espera la API. */
function aCuerpo(
  prestaciones: PrestacionPrevencionElegida[],
  periodo: string,
  archivo: string,
  obraSocial: number
) {
  return {
    periodo: periodo || null,
    archivo,
    obra_social: obraSocial,
    filas: prestaciones.map((p) => ({
      nro_autorizacion: p.nroAutorizacion,
      // `fechaISO` es "" cuando la celda no era una fecha: el backend lo
      // rechaza como fila sin fecha, que es lo correcto.
      fecha: p.fechaISO || null,
      afiliado: p.afiliado,
      // Sólo lo que se graba o se usa para resolver: el médico sale de la
      // matrícula, así que «Profesional Efector» y «Conformidad» no viajan.
      matricula: p.matricula,
      codigo: p.codigo,
      descripcion: p.descripcion,
      estado: p.estado,
      nro_socio_elegido: p.nroSocioElegido ?? null,
    })),
  };
}

export const fetchPeriodosPrevencion = (obraSocial: number): Promise<PeriodosOut> =>
  getJSON<PeriodosOut>("/api/importaciones/prevencion/periodos", { obra_social: obraSocial });

export async function previsualizarPrevencion(
  prestaciones: PrestacionPrevencionElegida[],
  periodo: string,
  archivo: string,
  obraSocial: number
): Promise<ImportacionOut> {
  const res = await postJSON<ApiOut>(
    "/api/importaciones/prevencion/previsualizar",
    aCuerpo(prestaciones, periodo, archivo, obraSocial),
    LARGO
  );
  return aSalida(res);
}

export async function confirmarPrevencion(
  prestaciones: PrestacionPrevencionElegida[],
  periodo: string,
  archivo: string,
  obraSocial: number
): Promise<ImportacionOut> {
  const res = await postJSON<ApiOut>(
    "/api/importaciones/prevencion/confirmar",
    aCuerpo(prestaciones, periodo, archivo, obraSocial),
    LARGO
  );
  return aSalida(res);
}

// ─── Swiss Medical ────────────────────────────────────────────────────────────

/** El reporte de Swiss trae datos que el de Prevención no: número de afiliado
 * (la credencial), cantidad real y copago ya cobrado al paciente. */
function aCuerpoSwiss(
  prestaciones: PrestacionSwiss[],
  periodo: string,
  archivo: string
) {
  return {
    periodo: periodo || null,
    archivo,
    filas: prestaciones.map((p) => ({
      // El `transacción_item` identifica la práctica en el sistema de Swiss y
      // es único en todo el reporte; la columna `autorización` viene vacía en
      // el 99% de las filas, así que sola no sirve para detectar duplicados.
      nro_autorizacion: p.item || p.autorizacion,
      fecha: p.fechaISO || null,
      afiliado: p.afiliado,
      profesional: p.efectorNombre,
      // Va con la letra de provincia ("W-3972"): el backend la necesita para
      // descartar las matrículas que no son de Corrientes.
      matricula: p.matricula,
      conformidad: "",
      codigo: p.codigo,
      descripcion: p.descripcion,
      estado: "",
      nro_afiliado: p.credencial,
      cantidad: p.cantidad,
      coseguro: p.copago,
    })),
  };
}

export const fetchPeriodosSwiss = (): Promise<PeriodosOut> =>
  getJSON<PeriodosOut>("/api/importaciones/swiss/periodos");

export async function previsualizarSwiss(
  prestaciones: PrestacionSwiss[],
  periodo: string,
  archivo: string
): Promise<ImportacionOut> {
  return aSalida(
    await postJSON<ApiOut>(
      "/api/importaciones/swiss/previsualizar",
      aCuerpoSwiss(prestaciones, periodo, archivo),
      LARGO
    )
  );
}

export async function confirmarSwiss(
  prestaciones: PrestacionSwiss[],
  periodo: string,
  archivo: string
): Promise<ImportacionOut> {
  return aSalida(
    await postJSON<ApiOut>(
      "/api/importaciones/swiss/confirmar",
      aCuerpoSwiss(prestaciones, periodo, archivo),
      LARGO
    )
  );
}

// ─── UNNE ─────────────────────────────────────────────────────────────────────

/** Una fila del Excel de UNNE, con el socio elegido a mano si hizo falta. */
export type PrestacionUnneElegida = PrestacionUnne & { nroSocioElegido?: number | null };

function aCuerpoUnne(prestaciones: PrestacionUnneElegida[], periodo: string, archivo: string) {
  return {
    periodo: periodo || null,
    archivo,
    filas: prestaciones.map((p) => ({
      referencia: p.referencia,
      orden: p.orden,
      reg: p.reg,
      matricula: p.matricula,
      prestador: p.prestador,
      periodo_archivo: p.periodo,
      provincia: p.provincia,
      fecha: p.fechaISO || null,
      cantidad: p.cantidad,
      codigo: p.codigo,
      descripcion: p.descripcion,
      funcion: p.funcion,
      porcentaje: p.porcentaje,
      dni: p.dni,
      paciente: p.paciente,
      importe: p.importe,
      nro_socio_elegido: p.nroSocioElegido ?? null,
    })),
  };
}

export const fetchPeriodosUnne = (): Promise<PeriodosOut> =>
  getJSON<PeriodosOut>("/api/importaciones/unne/periodos");

export async function previsualizarUnne(
  prestaciones: PrestacionUnneElegida[],
  periodo: string,
  archivo: string
): Promise<ImportacionOut> {
  return aSalida(
    await postJSON<ApiOut>(
      "/api/importaciones/unne/previsualizar",
      aCuerpoUnne(prestaciones, periodo, archivo),
      LARGO
    )
  );
}

export async function confirmarUnne(
  prestaciones: PrestacionUnneElegida[],
  periodo: string,
  archivo: string
): Promise<ImportacionOut> {
  return aSalida(
    await postJSON<ApiOut>(
      "/api/importaciones/unne/confirmar",
      aCuerpoUnne(prestaciones, periodo, archivo),
      LARGO
    )
  );
}
