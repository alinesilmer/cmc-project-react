// Lo que comparten las pantallas de Adelantos: URLs, tipos y rótulos.

// La raíz lleva barra final: sin ella FastAPI responde 307 hacia una URL absoluta y, con el proxy
// de desarrollo, el navegador descarta el Authorization.
export const ADELANTOS_RAIZ = "/api/adelantos/";
export const ADELANTOS_LISTA_URL = "/api/adelantos/lista";
export const ADELANTOS_FACTURAS_URL = (osId: number) =>
  `/api/adelantos/facturas_disponibles?obra_social_id=${osId}`;
export const ADELANTO_URL = (id: number) => `/api/adelantos/${id}`;
export const ADELANTO_ESTADO_URL = (id: number) => `/api/adelantos/${id}/estado`;
export const ADELANTO_ITEMS_URL = (id: number) => `/api/adelantos/${id}/items`;
export const ADELANTO_ITEM_URL = (id: number, itemId: number) => `/api/adelantos/${id}/items/${itemId}`;
export const ADELANTO_PRESTACIONES_URL = (id: number) => `/api/adelantos/${id}/prestaciones`;

export type EstadoAdelanto = "A" | "C" | "L" | "AP";

export const estadoAdelantoLabel = (e: string) =>
  ({ A: "Abierto", C: "Cerrado", L: "En el pago", AP: "Pagado" })[e] ?? e;

export type AdelantoListaRow = {
  id: number;
  estado: EstadoAdelanto;
  pago_id: number | null;
  factura_id: number;
  nro_factura: string | null;
  factura_version: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  mes_periodo: number;
  anio_periodo: number;
  medico_nombre: string | null;
  medico_nro_socio: number | null;
  medicos: number;
  prestaciones: number;
  importe: string;
  observacion: string | null;
  created_at: string | null;
};

export type AdelantoItem = {
  id: number;
  detalle_id: number;
  fecha_practica: string | null;
  codigo: string | null;
  descripcion: string | null;
  medico_id: number;
  medico_nro_socio: number | null;
  medico_nombre: string | null;
  funcion: string | null;
  honorarios: string;
  gastos: string;
  importe_total: string;
};

export type Adelanto = {
  id: number;
  estado: EstadoAdelanto;
  pago_id: number | null;
  factura_id: number;
  nro_factura: string | null;
  factura_version: number | null;
  obra_social_id: number;
  obra_social_nombre: string;
  mes_periodo: number;
  anio_periodo: number;
  observacion: string | null;
  created_at: string | null;
  medicos: number;
  prestaciones: number;
  importe: string;
  items: AdelantoItem[];
  pago_abierto_id: number | null;
};

export type FacturaParaAdelanto = {
  FACTURA_ID: number;
  ANIO: number;
  MES: number;
  NRO_FACTURA: string | null;
  TIPO_FACTURA: string | null;
  VERSION: number;
  PERIODO: string;
  MEDICOS: number;
  DISPONIBLES: number;
  IMPORTE_DISPONIBLE: string | number;
  RESERVADAS: number;
};

export type EstadoPrestacion =
  | "disponible"
  | "en_este"
  | "en_otro"
  | "en_pago"
  | "pagada"
  | "sin_medico"
  | "sin_importe";

export type PrestacionFactura = {
  id: number;
  fecha_practica: string | null;
  codigo: string | null;
  descripcion: string | null;
  nro_orden: string | null;
  paciente: string | null;
  medico_id: number | null;
  medico_nro_socio: number | null;
  medico_nombre: string | null;
  funcion: string | null;
  equipo: string | null;
  importe_total: string;
  estado: EstadoPrestacion;
  adelanto_id: number | null;
  pago_id: number | null;
};

export type PrestacionesPage = {
  items: PrestacionFactura[];
  total: number;
  disponibles: number;
  total_factura: number;
};

export const etiquetaEstadoPrestacion = (p: PrestacionFactura): string => {
  switch (p.estado) {
    case "disponible": return "Disponible";
    case "en_este": return "En este adelanto";
    case "en_otro": return `En el adelanto #${p.adelanto_id}`;
    case "en_pago": return p.pago_id ? `En el pago #${p.pago_id}` : "En un pago";
    case "pagada": return p.pago_id ? `Pagada · pago #${p.pago_id}` : "Pagada";
    case "sin_medico": return "Médico fuera del padrón";
    case "sin_importe": return "Importe en cero";
  }
};

/** «27/08/2026» desde una fecha ISO (con o sin hora). */
export const fechaCorta = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
