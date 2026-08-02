// Tipos del módulo de Validaciones (integraciones con obras sociales).
//
// El modelo replica lo que hoy hace el sistema PHP legacy: cada obra social
// tiene un formulario propio y se valida contra el servicio de la obra social
// (o se carga manualmente el número de validación obtenido por fuera). Lo que
// cambia respecto del legacy es dónde termina: la prestación se guarda en
// `detalle_facturacion` (`origen_carga='medico'`), en el período que marca
// `periodo_medico_actual` para esa obra social — no en tablas propias.

// ─── Formularios dinámicos ────────────────────────────────────────────────────

/** Tipo de control que se renderiza para un campo del formulario de carga. */
export type CampoTipo =
  | "numerico" // solo dígitos, con maxLength
  | "texto" // texto libre
  | "moneda" // importe en $
  | "entero" // number con min/max
  | "codigo"; // buscador de códigos del nomenclador

export interface CampoConfig {
  name: string;
  label: string;
  tipo: CampoTipo;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  /** Texto de ayuda debajo del input. */
  hint?: string;
  /** Fuerza mayúsculas mientras se escribe (nombres de afiliado). */
  uppercase?: boolean;
  /**
   * Segundo input pegado al principal, separado por "/".
   * En el legacy son los pares `nro_afiliado_1` / `nro_afiliado_2`
   * (número de afiliado + dígito verificador / orden familiar).
   */
  sufijo?: {
    name: string;
    maxLength: number;
    placeholder?: string;
    label?: string;
  };
}

/** Valores del formulario: cada campo guarda un string (se normaliza al enviar). */
export type PrestacionFormValues = Record<string, string>;

export type PrestacionFormErrors = Record<string, string | undefined>;

// ─── Catálogo de obras sociales ───────────────────────────────────────────────

/**
 * `integrada` → el Colegio valida contra el servicio de la obra social desde
 * este panel. `externa` → la validación se hace en el portal de la obra social
 * y acá sólo dejamos el acceso directo.
 */
export type ModoIntegracion = "integrada" | "externa";

export type EstadoIntegracion = "operativa" | "mantenimiento" | "restringida";

/**
 * `online`  → el servicio de la obra social responde la autorización en el acto.
 * `manual`  → el prestador autoriza por fuera y acá carga el número obtenido.
 */
export type TipoValidacion = "online" | "manual";

export interface ObraSocialConfig {
  slug: string;
  nombre: string;
  /** NRO_OBRA_SOCIAL del sistema del Colegio. */
  codigo: number | null;
  modo: ModoIntegracion;
  estado: EstadoIntegracion;
  validacion?: TipoValidacion;
  /** Protocolo del servicio, para que la mesa de ayuda sepa qué mirar. */
  protocolo?: string;
  /** Color de marca, usado en el avatar y el borde de la tarjeta. */
  color: string;
  /** Logo de la obra social. Si falta, se muestran las iniciales. */
  logo?: string;
  descripcion: string;
  /** Portal externo (modo `externa`). */
  url?: string;
  /**
   * Ruta dentro del sitio del Colegio, cuando la obra social tiene su propia
   * página institucional (por ejemplo Prevención Salud). Tiene prioridad
   * sobre `url` a la hora de ofrecer el acceso.
   */
  sitioCmc?: string;
  campos?: CampoConfig[];
  /** Cantidad de códigos de prestación que admite una misma autorización. */
  maxCodigos?: number;
  /** Permite adjuntar la orden/receta en PDF (hoy sólo Boreal). */
  permiteAdjuntarOrden?: boolean;
  /**
   * `true` cuando el backend ya sabe grabar prestaciones de esta obra social
   * (`POST /api/validaciones/prestaciones`). Las lecturas funcionan para todas.
   */
  cargaImplementada?: boolean;
  /** Aviso que se muestra arriba del formulario. */
  nota?: string;
  /** Códigos que la obra social no acepta por esta vía. */
  codigosBloqueados?: string[];
}

// ─── Prestaciones ─────────────────────────────────────────────────────────────

/**
 * Cada obra social contesta texto libre; el backend lo normaliza a estos cuatro
 * casos y lo guarda en `detalle_facturacion.validacion_estado`. `cargada` es el
 * caso de las obras sociales de carga manual, donde el Colegio no autorizó nada:
 * sólo registró lo que autorizó la obra social.
 *
 * `autorizada` y `cargada` facturan. `rechazada` y `pendiente` se muestran en el
 * listado con importe 0 y quedan fuera de la factura.
 */
export type EstadoPrestacion = "autorizada" | "rechazada" | "pendiente" | "cargada";

export interface Prestacion {
  id: string;
  fecha: string; // ISO (YYYY-MM-DD)
  codigo: string;
  descripcion: string;
  nroAfiliado: string;
  nombreAfiliado: string;
  nroValidacion: string | null;
  estado: EstadoPrestacion;
  /** Texto tal cual lo devuelve la obra social. */
  estadoDetalle: string;
  cantidad: number;
  honorarios: number;
  gastos: number;
  coseguro: number;
  total: number;
  mes: number;
  anio: number;
  obraSocial: number;
  /** Nombre del archivo de la orden adjunta, si tiene. */
  orden?: string | null;
}

export interface Periodo {
  mes: number;
  anio: number;
  cantidad: number;
  total: number;
  /** El Colegio cerró el período: no se puede cargar ni eliminar. */
  cerrado?: boolean;
}

/** Respuesta del validador de la obra social. */
export interface ResultadoValidacion {
  estado: EstadoPrestacion;
  mensaje: string;
  prestacion?: Prestacion;
}

export interface CodigoNomenclador {
  codigo: string;
  descripcion: string;
  honorarios: number;
  gastos: number;
  /**
   * `false` cuando el médico no tiene habilitación por especialidad para el
   * código, o no hay precio vigente para esa obra social. `motivo` lo explica.
   */
  admitido: boolean;
  motivo?: string | null;
}

export interface PrestadorInfo {
  nroSocio: number;
  nombre: string;
  matricula: string;
  especialidad: string;
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const nombreMes = (mes: number) => MESES[mes - 1] ?? String(mes);

export const formatMoneda = (valor: number) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(valor ?? 0);

export const formatFecha = (iso: string) => {
  const [anio, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${anio}`;
};

/** Iniciales para el avatar de la obra social. */
export const iniciales = (nombre: string) =>
  nombre
    .replace(/[^A-Za-zÁÉÍÓÚÑ ]/g, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
