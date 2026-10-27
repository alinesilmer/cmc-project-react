// Lo que comparte la pantalla de Retenciones de Ganancias: URLs, tipos y rótulos.

export const RETENCIONES_GANANCIAS_URL = "/api/retenciones/ganancias";
export const ESCALAS_GANANCIAS_URL = "/api/retenciones/ganancias/escalas";

export type TipoSujeto = "persona" | "clinica" | "juridica";

export const tipoSujetoLabel = (t: string) =>
  ({ persona: "Persona", clinica: "Clínica", juridica: "Sociedad" })[t] ?? t;

export type FilaRetencion = {
  medico_id: number;
  nro_socio: number | null;
  nombre: string;
  cuit: string | null;
  tipo_sujeto: TipoSujeto;
  honorarios: number;
  gastos: number;
  /** Monto imponible: lo producido en los pagos del mes, neto de débitos y créditos. */
  base: number;
  /** Lo que correspondía retener. */
  calculado: number;
  /** Lo que de verdad se descontó (va en el comprobante). */
  retenido: number;
};

export type AgenteRetencion = {
  razon_social: string | null;
  cuit: string | null;
  domicilio: string | null;
  localidad: string | null;
  nro_agente_retencion: string | null;
};

export type ListadoRetenciones = {
  anio: number;
  mes: number;
  pagos_incluidos: number[];
  pagos_abiertos: number[];
  agente: AgenteRetencion;
  filas: FilaRetencion[];
  totales: { honorarios: number; gastos: number; base: number; calculado: number; retenido: number };
};

export type EscalaGanancias = {
  id: number;
  tipo_sujeto: TipoSujeto;
  vigente_desde: string;
  minimo_no_imponible: number;
  retencion_minima: number;
  observacion: string | null;
  tramos: { desde: number; hasta: number | null; importe_fijo: number; porcentaje: number }[];
};

/** «20-12345678-9»; si no son 11 dígitos, como venga. */
export function formatCuit(cuit: string | null | undefined): string {
  const d = (cuit ?? "").replace(/\D/g, "");
  if (d.length !== 11 || /^0+$/.test(d)) return cuit && !/^0*$/.test(cuit) ? cuit : "";
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}
