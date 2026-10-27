// Cliente de /api/importaciones/planilla.
//
// El archivo lo lee el front (`planilla.parser.ts`) y acá se mandan las filas tal como
// están en las celdas. El backend no confía en ellas: las valida una por una con las
// mismas reglas que la carga manual. Ver `cmc_api/app/modules/importaciones/planilla`.

import { getBlobLong, getJSON, postJSON } from "@/app/shared/lib/http";

const BASE = "/api/importaciones/planilla";

// ── Lo que sale del archivo ──────────────────────────────────────────────────

/** Una fila de la planilla: todo texto, como está en la celda. La fecha de una celda de
 * Excel ya viene en ISO; el resto lo interpreta el backend. */
export interface FilaPlanilla {
  /** Número de fila en el Excel, para ubicarla. */
  fila: number;
  tipo: string;
  nroSocio: string;
  matricula: string;
  clinica: string;
  fecha: string;
  autorizacion: string;
  codigo: string;
  via: string;
  cantidad: string;
  sesion: string;
  porcentaje: string;
  nroAfiliado: string;
  afiliado: string;
  calculo: string;
  honorarios: string;
  gastos: string;
  ayudante: string;
  coseguro: string;
  equipo: string;
  rol: string;
  comentarios: string;
}

/** Lo que decide el operador sobre una fila en la previsualización. */
export interface Decision {
  nroSocioElegido?: number;
  descartada?: boolean;
}

// ── Lo que devuelve el backend ───────────────────────────────────────────────

type ResultadoFila =
  | "grabable"
  | "grabada"
  | "duplicada"
  | "omitida"
  | "elegir_socio"
  | "descartada";

interface CandidatoSocio {
  nroSocio: number;
  nombre: string;
}

export interface FilaResultado {
  indice: number;
  /** Fila del Excel. */
  fila: number;
  resultado: ResultadoFila;
  motivo: string;
  aviso: string;
  candidatos: CandidatoSocio[];
  tipo: string;
  equipo: string;
  rol: string;
  nroSocio: number | null;
  medico: string;
  matricula: string;
  codigo: string;
  descripcion: string;
  fecha: string | null;
  afiliado: string;
  cantidad: number;
  importeTotal: number;
  comentarios: string;
  idDetalle: number | null;
}

export interface ResumenPlanilla {
  obraSocial: number;
  obraSocialNombre: string;
  periodo: string;
  total: number;
  grabables: number;
  duplicadas: number;
  omitidas: number;
  descartadas: number;
  porElegir: number;
  conAviso: number;
  equipos: number;
  importeTotal: number;
  /** Pacientes que no estaban en el padrón y se registran al importar. */
  afiliadosNuevos: number;
  /** De lo que entra: filas sin autorización, y de ésas las que tampoco tienen fecha. */
  sinAutorizacion: number;
  noVerificables: number;
}

export interface PlanillaOut {
  resumen: ResumenPlanilla;
  filas: FilaResultado[];
}

export type FaseLote =
  | "validando"
  | "grabando"
  | "guardando"
  | "grabada"
  | "cancelada"
  | "error"
  | "desconocido";

export interface LoteOut {
  lote: string;
  estado: FaseLote;
  hecho: number;
  total: number;
  grabadas: number;
  importeTotal: number;
}

export interface PeriodoOpcion {
  periodo: string;
  cerrado: boolean;
  sugerido: boolean;
}

export interface PeriodosOut {
  sugerido: string;
  periodos: PeriodoOpcion[];
  /** Primer período en el que se puede cargar (último cerrado + 1); null si aún no hay ninguno cerrado. */
  minimo: string | null;
}

// ── Traducción snake_case ↔ camelCase ────────────────────────────────────────

interface ApiFila {
  indice: number;
  fila: number;
  resultado: ResultadoFila;
  motivo: string;
  aviso: string;
  candidatos: { nro_socio: number; nombre: string }[];
  tipo: string;
  equipo: string;
  rol: string;
  nro_socio: number | null;
  medico: string;
  matricula: string;
  codigo: string;
  descripcion: string;
  fecha: string | null;
  afiliado: string;
  cantidad: number;
  importe_total: number | string;
  comentarios: string;
  id_detalle: number | null;
}

interface ApiOut {
  resumen: {
    obra_social: number;
    obra_social_nombre: string;
    periodo: string;
    total: number;
    grabables: number;
    duplicadas: number;
    omitidas: number;
    descartadas: number;
    por_elegir: number;
    con_aviso: number;
    equipos: number;
    importe_total: number | string;
    afiliados_nuevos: number;
    sin_autorizacion: number;
    no_verificables: number;
  };
  filas: ApiFila[];
}

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const aSalida = (r: ApiOut): PlanillaOut => ({
  resumen: {
    obraSocial: r.resumen.obra_social,
    obraSocialNombre: r.resumen.obra_social_nombre,
    periodo: r.resumen.periodo,
    total: r.resumen.total,
    grabables: r.resumen.grabables,
    duplicadas: r.resumen.duplicadas,
    omitidas: r.resumen.omitidas,
    descartadas: r.resumen.descartadas,
    porElegir: r.resumen.por_elegir,
    conAviso: r.resumen.con_aviso,
    equipos: r.resumen.equipos,
    importeTotal: num(r.resumen.importe_total),
    afiliadosNuevos: r.resumen.afiliados_nuevos ?? 0,
    sinAutorizacion: r.resumen.sin_autorizacion ?? 0,
    noVerificables: r.resumen.no_verificables ?? 0,
  },
  filas: r.filas.map((f) => ({
    indice: f.indice,
    fila: f.fila,
    resultado: f.resultado,
    motivo: f.motivo,
    aviso: f.aviso,
    candidatos: (f.candidatos ?? []).map((c) => ({ nroSocio: c.nro_socio, nombre: c.nombre })),
    tipo: f.tipo,
    equipo: f.equipo,
    rol: f.rol,
    nroSocio: f.nro_socio,
    medico: f.medico,
    matricula: f.matricula,
    codigo: f.codigo,
    descripcion: f.descripcion,
    fecha: f.fecha,
    afiliado: f.afiliado,
    cantidad: f.cantidad,
    importeTotal: num(f.importe_total),
    comentarios: f.comentarios,
    idDetalle: f.id_detalle,
  })),
});

/** Sólo viajan las celdas con datos: una planilla de miles de filas llena de columnas
 * vacías se acercaría al tope de tamaño de la API. */
function aCuerpo(
  obraSocial: number,
  periodo: string,
  archivo: string,
  filas: FilaPlanilla[],
  decisiones: Record<number, Decision>,
  lote?: string
) {
  return {
    obra_social: obraSocial,
    periodo,
    archivo,
    ...(lote ? { lote } : {}),
    filas: filas.map((f, i) => {
      const d = decisiones[i] ?? {};
      const fila: Record<string, string | number | boolean> = { fila: f.fila };
      const celdas: [string, string][] = [
        ["tipo", f.tipo], ["nro_socio", f.nroSocio], ["matricula", f.matricula], ["clinica", f.clinica],
        ["fecha", f.fecha], ["autorizacion", f.autorizacion], ["codigo", f.codigo], ["via", f.via],
        ["cantidad", f.cantidad], ["sesion", f.sesion], ["porcentaje", f.porcentaje],
        ["nro_afiliado", f.nroAfiliado], ["afiliado", f.afiliado], ["calculo", f.calculo],
        ["honorarios", f.honorarios], ["gastos", f.gastos], ["ayudante", f.ayudante],
        ["coseguro", f.coseguro], ["equipo", f.equipo], ["rol", f.rol], ["comentarios", f.comentarios],
      ];
      for (const [k, v] of celdas) if (v !== "") fila[k] = v;
      if (d.nroSocioElegido) fila.nro_socio_elegido = d.nroSocioElegido;
      if (d.descartada) fila.descartada = true;
      return fila;
    }),
  };
}

// La previsualización y la confirmación procesan la planilla entera, fila por fila: con
// los 15 s por defecto una planilla grande cortaría del lado del navegador mientras el
// servidor sigue (y, en «confirmar», sigue hasta grabar).
const LARGO = { timeout: 600_000 };

// ── Llamadas ─────────────────────────────────────────────────────────────────

export const fetchPeriodosPlanilla = (obraSocial: number): Promise<PeriodosOut> =>
  getJSON<PeriodosOut>(`${BASE}/periodos`, { obra_social: obraSocial });

export async function previsualizarPlanilla(
  obraSocial: number,
  periodo: string,
  archivo: string,
  filas: FilaPlanilla[],
  decisiones: Record<number, Decision>
): Promise<PlanillaOut> {
  return aSalida(
    await postJSON<ApiOut>(
      `${BASE}/previsualizar`,
      aCuerpo(obraSocial, periodo, archivo, filas, decisiones),
      LARGO
    )
  );
}

export async function confirmarPlanilla(
  obraSocial: number,
  periodo: string,
  archivo: string,
  filas: FilaPlanilla[],
  decisiones: Record<number, Decision>,
  lote: string
): Promise<PlanillaOut> {
  return aSalida(
    await postJSON<ApiOut>(
      `${BASE}/confirmar`,
      aCuerpo(obraSocial, periodo, archivo, filas, decisiones, lote),
      LARGO
    )
  );
}

/** Pide cancelar. Responde enseguida; el desenlace lo da la propia confirmación. */
export const pedirCancelacion = (lote: string) =>
  postJSON<{ lote: string; pedida: boolean }>(`${BASE}/lotes/${lote}/cancelar`);

interface ApiLote {
  lote: string;
  estado: FaseLote;
  hecho: number;
  total: number;
  grabadas: number;
  importe_total: number | string;
}

export async function fetchLote(lote: string, obraSocial: number, periodo: string): Promise<LoteOut> {
  const r = await getJSON<ApiLote>(`${BASE}/lotes/${lote}`, { obra_social: obraSocial, periodo });
  return {
    lote: r.lote,
    estado: r.estado,
    hecho: r.hecho,
    total: r.total,
    grabadas: r.grabadas,
    importeTotal: num(r.importe_total),
  };
}

export const descargarPlantilla = () => getBlobLong(`${BASE}/plantilla`);
