// Lo que comparte la pantalla de Compensaciones: URLs, tipos y rótulos.

// La raíz lleva barra final: sin ella FastAPI responde 307 hacia una URL absoluta y, con el proxy
// de desarrollo, el navegador descarta el Authorization.
export const COMPENSACIONES_RAIZ = "/api/compensaciones/";
export const COMPENSACIONES_LISTA_URL = "/api/compensaciones/lista";
export const COMPENSACION_URL = (id: number) => `/api/compensaciones/${id}`;
export const COMPENSACION_ESTADO_URL = (id: number) => `/api/compensaciones/${id}/estado`;
export const COMPENSACION_ANULAR_URL = (id: number) => `/api/compensaciones/${id}/anular`;

export type EstadoCompensacion = "pendiente" | "en_pago" | "pagada" | "en_caja" | "anulada";

export const estadoCompensacionLabel = (e: string) =>
  ({
    pendiente: "Pendiente",
    en_pago: "En el pago",
    pagada: "Pagada",
    en_caja: "Pagada en caja",
    anulada: "Anulada",
  })[e] ?? e;

export type Compensacion = {
  id: number;
  medico_id: number;
  medico_nombre: string | null;
  medico_nro_socio: number | null;
  importe: string;
  leyenda: string;
  nota_interna: string | null;
  estado: EstadoCompensacion;
  pago_id: number | null;
  fecha_caja: string | null;
  motivo_anulacion: string | null;
  created_at: string | null;
  creada_por: string | null;
};

export type CompensacionesLista = {
  items: Compensacion[];
  totales: { a_favor: string; en_contra: string; pendientes: number };
};

const moneda = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** «+$50.000,00» o «−$14.000,00»: el sentido se ve en el signo y en el color. */
export const importeConSigno = (n: number | string | null | undefined): string => {
  const v = Number(n ?? 0);
  return `${v < 0 ? "−" : "+"}$${moneda.format(Math.abs(v))}`;
};

/** «27/08/2026» desde una fecha ISO (con o sin hora). */
export const fechaCorta = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
