// Tipos del módulo de Validaciones (integraciones con obras sociales).

import { formatoPesos } from "@/app/shared/lib/formatos";

// ─── Formularios dinámicos ────────────────────────────────────────────────────

/** Tipo de control que se renderiza para un campo del formulario de carga. */
type CampoTipo =
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
  /** Segundo input pegado al principal, separado por "/". */
  sufijo?: {
    name: string;
    maxLength: number;
    placeholder?: string;
    label?: string;
  };
  /** Si está seteado, el campo consulta en vivo mientras el prestador tipea. */
  consultaEnVivo?: {
    /** Dígitos mínimos antes de disparar la consulta (Nobis: 6, como el legacy). */
    minLength: number;
    consultar: (valor: string) => Promise<ConsultaEnVivoResultado>;
  };
}

/** Resultado de una `consultaEnVivo`, ya traducido al cartel a mostrar. */
export interface ConsultaEnVivoResultado {
  /** `true` = cartel verde, `false` = cartel rojo. */
  ok: boolean;
  texto: string;
}

/** Valores del formulario: cada campo guarda un string (se normaliza al enviar). */
export type PrestacionFormValues = Record<string, string>;

export type PrestacionFormErrors = Record<string, string | undefined>;

// ─── Catálogo de obras sociales ───────────────────────────────────────────────

/** `integrada` → el Colegio valida contra el servicio de la obra social desde este panel. */
type ModoIntegracion = "integrada" | "externa";

type EstadoIntegracion = "operativa" | "mantenimiento" | "restringida";

/** `online` → el servicio de la obra social responde la autorización en el acto. */
type TipoValidacion = "online" | "manual";

/** Guía de acceso al portal de la obra social. */
/** Documentación que el médico tiene que presentar sí o sí; se avisa antes de abrir el portal. */
interface RequisitosPortal {
  titulo: string;
  items: string[];
  /** Qué pasa si falta alguno. */
  motivo: string;
}

interface GuiaPortal {
  /** Texto del botón que abre la guía en la tarjeta. */
  chip: string;
  titulo: string;
  /** La guía lleva usuario y clave compartidos. */
  credencialesRemotas?: boolean;
  /** Aviso destacado arriba de los pasos. */
  aviso?: string;
  intro?: string;
  pasos: string[];
  /** Enlace final de la guía (PDF o portal). */
  enlace?: { href: string; texto: string };
  /** Nota al pie, para lo que el Colegio no puede resolver desde el panel. */
  pie?: string;
}

export interface ObraSocialConfig {
  slug: string;
  nombre: string;
  /** NRO_OBRA_SOCIAL del sistema del Colegio. */
  codigo: number | null;
  /** Otros NRO_OBRA_SOCIAL que son la misma obra social (complementarias, planes); no van a «Otros». */
  otrosCodigos?: number[];
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
  /** Ruta dentro del sitio del Colegio, cuando la obra social tiene su propia página institucional (por ejemplo Prevención Salud). */
  sitioCmc?: string;
  /** Pantalla propia dentro del panel para una obra social que no usa el formulario genérico (hoy Prevención Salud, que se carga por archivo). */
  rutaPanel?: string;
  campos?: CampoConfig[];
  /** Cantidad de códigos de prestación que admite una misma autorización. */
  maxCodigos?: number;
  /** Permite adjuntar la orden/receta en PDF (hoy sólo Boreal). */
  permiteAdjuntarOrden?: boolean;
  /** `true` cuando el backend ya sabe grabar prestaciones de esta obra social (`POST /api/validaciones/prestaciones`). */
  cargaImplementada?: boolean;
  /** Aviso que se muestra arriba del formulario. */
  nota?: string;
  /** Códigos que la obra social no acepta por esta vía. */
  codigosBloqueados?: string[];
  /** Guía de usuario/clave y pasos del portal (Swiss Medical, Unión Personal). */
  guia?: GuiaPortal;
  requisitos?: RequisitosPortal;
}

// ─── Prestaciones ─────────────────────────────────────────────────────────────

/** Cada obra social contesta texto libre; el backend lo normaliza a estos cuatro casos y lo guarda en `detalle_facturacion.validacion_estado`. */
export type EstadoPrestacion = "autorizada" | "rechazada" | "pendiente" | "cargada";

// Nobis grada el `P-Pendiente` como `rechazada` a propósito —importe 0, fuera de factura, igual que un rechazo real.
const PREFIJO_PENDIENTE_OBRA_SOCIAL = "Pendiente de autorización de la obra social.";

/** `true` si el detalle es el de una `rechazada` que en realidad quedó pendiente de gestión en la obra social (hoy, sólo Nobis). */
export const esPendienteDeObraSocial = (detalle?: string | null): boolean =>
  !!detalle && detalle.startsWith(PREFIJO_PENDIENTE_OBRA_SOCIAL);

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
  /** Ruta del primer documento adjunto (el front anterior mostraba sólo la orden). */
  orden?: string | null;
  /** Documentación digital de la prestación. */
  documentos: DocumentoDigital[];
  /** `falta` = la obra social y el código la exigen y no tiene ningún archivo. */
  documentacion: "no_aplica" | "falta" | "completa";
}

/** Un archivo de la documentación digital de una prestación. */
export interface DocumentoDigital {
  id: number;
  nombre: string;
  /** Ruta de la API: pide token, se abre con `abrirAdjunto()`. */
  url: string | null;
  contentType: string;
  size: number;
  origen: "medico" | "colegio";
  posicion: number;
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
  /** "Revisá los datos del afiliado y el código" al pie del rechazo. */
  mostrarAyuda?: boolean;
}

export interface CodigoNomenclador {
  codigo: string;
  descripcion: string;
  honorarios: number;
  gastos: number;
  /** Coseguro sugerido para este código — informativo; lo que factura es lo que el médico tipea en el campo "Coseguro" del formulario. */
  coseguro: number;
  /** `false` cuando el médico no tiene habilitación por especialidad para el código, o no hay precio vigente para esa obra social. */
  admitido: boolean;
  motivo?: string | null;
  /** El código exige documentación digital en esta obra social: el formulario pide los archivos. */
  requiereDocumentacion?: boolean;
}

// ─── Helpers de presentación ──────────────────────────────────────────────────

const MESES = [
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

export const formatMoneda = (valor: number) => formatoPesos.format(valor ?? 0);

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
