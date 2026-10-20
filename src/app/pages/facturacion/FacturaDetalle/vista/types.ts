// Parámetros de visualización de la tabla de listado — análogo a `../export/types.ts`.
import type { Tipo } from "../../types";

export type OrdenVista = "fecha" | "fecha_carga" | "codigo" | "importe" | "nombre_socio";

// Sentido del criterio de arriba — separado del criterio en sí (antes "monto_desc" mezclaba las dos cosas en una sola opción.
export type OrdenDireccion = "asc" | "desc";

export type AgrupacionVista = "por_socio" | "por_tipo" | "plana";

// "Por tipo", en Honorarios individuales y Sanatorios: cómo se ordena dentro de cada médico (y, en Sanatorios, dentro de cada clínica).
export type OrdenAlfabetico = "medico" | "paciente";

export const OPCIONES_ORDEN_VISTA: { value: OrdenVista; label: string }[] = [
  { value: "fecha", label: "Fecha de práctica" },
  { value: "fecha_carga", label: "Fecha de carga" },
  { value: "codigo", label: "Código" },
  { value: "importe", label: "Importe" },
  { value: "nombre_socio", label: "Nombre del socio" },
];

export const OPCIONES_AGRUPACION_VISTA: { value: AgrupacionVista; label: string; ayuda: string }[] = [
  { value: "por_socio", label: "Por socio", ayuda: "Cada médico con sus consultas, prácticas y honorarios, y su resumen; al final los sanatorios por clínica, paciente y socio (orden fijo)" },
  { value: "por_tipo", label: "Por tipo", ayuda: "Consultas, prácticas, honorarios y sanatorios separados, con subtotal por médico" },
  { value: "plana", label: "Planilla plana", ayuda: "Sin cortes ni resúmenes, para revisar todo junto" },
];

// Orden fijo en el que se muestran las secciones cuando `agrupacion === "por_tipo"".
export const ORDEN_TIPOS: Tipo[] = ["Consulta", "Practica", "Honorarios individuales", "Sanatorio"];

export interface FiltrosVista {
  fecha_desde?: string;
  fecha_hasta?: string;
  id_especialidad?: number;
  cod_medicos?: string[];
  revisado?: boolean;
  tipos?: Tipo[];
  /** Documentación digital: con documentos, falta (la exige y no la tiene) o no la requiere. */
  documentacion?: FiltroDocumentacion;
}

export type FiltroDocumentacion = "con" | "falta" | "no_requiere";

export type ColumnaVista =
  | "id" | "autorizacion" | "fecha" | "codigo" | "via" | "nro_afiliado" | "paciente"
  | "cantidad" | "porcentaje" | "honorarios" | "gastos" | "coseguro" | "tipo_prestador"
  | "valor_unitario" | "subtotal" | "tipo" | "documentos";

/** Columnas que sólo existen si la obra social tiene la documentación digital habilitada. */
export const COLUMNAS_SOLO_CON_DOCUMENTACION: ColumnaVista[] = ["documentos"];

// Mismo orden que las columnas de la tabla (Socio y Acciones no se pueden ocultar, por eso no están acá) .
export const COLUMNAS_VISTA_DISPONIBLES: { key: ColumnaVista; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "autorizacion", label: "Autorización" },
  { key: "fecha", label: "Fecha" },
  { key: "codigo", label: "Código" },
  { key: "via", label: "Vía" },
  { key: "nro_afiliado", label: "Nro Afiliado" },
  { key: "paciente", label: "Paciente" },
  { key: "cantidad", label: "Cantidad" },
  { key: "porcentaje", label: "%" },
  { key: "honorarios", label: "Honorarios" },
  { key: "gastos", label: "Gastos" },
  { key: "coseguro", label: "Coseguro" },
  { key: "tipo_prestador", label: "TP" },
  { key: "valor_unitario", label: "Valor unitario" },
  { key: "subtotal", label: "Total" },
  { key: "tipo", label: "Tipo" },
  { key: "documentos", label: "Documentos" },
];

const COLUMNAS_VISTA_DEFAULT: ColumnaVista[] = COLUMNAS_VISTA_DISPONIBLES.map((c) => c.key);

// Pesos relativos de ancho de columna — los mismos números que tenía cada `th:nth-child` fijo en FacturaDetalle.module.scss cuando las 16 columnas estaban siempre visibles.
export const PESO_COLUMNA: Record<"socio" | ColumnaVista | "acciones", number> = {
  id: 4, socio: 9, autorizacion: 7, fecha: 6, codigo: 6, via: 4, nro_afiliado: 6,
  paciente: 9, cantidad: 6, porcentaje: 4, honorarios: 6, gastos: 6, coseguro: 6,
  tipo_prestador: 3, valor_unitario: 7, subtotal: 7, tipo: 3, documentos: 6, acciones: 8,
};

export interface VistaOpciones extends FiltrosVista {
  orden: OrdenVista;
  direccion: OrdenDireccion;
  agrupacion: AgrupacionVista;
  ordenHonorarios: OrdenAlfabetico;
  ordenSanatorio: OrdenAlfabetico;
  columnas: ColumnaVista[];
  /** Versión de la lista de columnas: 2 = ya incluye «ID» y «Documentos» como columnas elegibles. */
  columnasV?: number;
}

export const VISTA_OPCIONES_DEFAULT: VistaOpciones = {
  orden: "nombre_socio",
  direccion: "asc",
  agrupacion: "por_socio",
  ordenHonorarios: "medico",
  ordenSanatorio: "medico",
  columnas: COLUMNAS_VISTA_DEFAULT,
  columnasV: 2,
};

/**
 * Las columnas de una vista guardada. Antes de la versión 2 el ID se mostraba siempre y «Documentos» no
 * existía: una vista (o un preset) viejo no las trae en su lista y, sin esto, las perdería sin que el
 * usuario las haya ocultado. Desde la versión 2, lo que no está en la lista está oculto.
 */
export function migrarColumnas(columnas: unknown, version: unknown): ColumnaVista[] {
  if (!Array.isArray(columnas)) return COLUMNAS_VISTA_DEFAULT;
  const nuevas: ColumnaVista[] = version === 2 ? [] : ["id", "documentos"];
  return COLUMNAS_VISTA_DEFAULT.filter((c) => columnas.includes(c) || nuevas.includes(c));
}

// ── Vista de la sesión ──────────────────────────────────────────────────────
// La vista elegida (orden, agrupación, filtros, columnas) se recuerda mientras dure la
// sesión del navegador: al editar o replicar una prestación se sale de esta pantalla y al
// volver —de la misma factura o de otra— tiene que estar como se dejó. Los presets
// guardados con nombre viven en el servidor y no dependen de esto.
const CLAVE_VISTA_SESION = "facturacion:vista-detalle";

const ORDENES: OrdenVista[] = OPCIONES_ORDEN_VISTA.map((o) => o.value);
const AGRUPACIONES: AgrupacionVista[] = OPCIONES_AGRUPACION_VISTA.map((o) => o.value);
const ALFABETICOS: OrdenAlfabetico[] = ["medico", "paciente"];

/** La vista guardada en la sesión, o la de por defecto. Lo guardado se valida: una
 *  columna u opción que ya no existe no puede romper la pantalla. */
export function cargarVistaSesion(): VistaOpciones {
  try {
    const crudo = sessionStorage.getItem(CLAVE_VISTA_SESION);
    if (!crudo) return VISTA_OPCIONES_DEFAULT;
    const g = JSON.parse(crudo) as Partial<VistaOpciones>;
    const columnas = migrarColumnas(g.columnas, g.columnasV);
    return {
      ...VISTA_OPCIONES_DEFAULT,
      ...g,
      orden: ORDENES.includes(g.orden as OrdenVista) ? g.orden! : VISTA_OPCIONES_DEFAULT.orden,
      direccion: g.direccion === "desc" ? "desc" : "asc",
      agrupacion: AGRUPACIONES.includes(g.agrupacion as AgrupacionVista) ? g.agrupacion! : VISTA_OPCIONES_DEFAULT.agrupacion,
      ordenHonorarios: ALFABETICOS.includes(g.ordenHonorarios as OrdenAlfabetico) ? g.ordenHonorarios! : "medico",
      ordenSanatorio: ALFABETICOS.includes(g.ordenSanatorio as OrdenAlfabetico) ? g.ordenSanatorio! : "medico",
      columnas,
      columnasV: 2,
    };
  } catch {
    return VISTA_OPCIONES_DEFAULT;
  }
}

export function guardarVistaSesion(opciones: VistaOpciones): void {
  try {
    sessionStorage.setItem(CLAVE_VISTA_SESION, JSON.stringify(opciones));
  } catch {
    // sin storage (modo privado, cuota): la vista simplemente no se recuerda
  }
}

// Configuración de la vista guardada con un nombre (personal de cada usuario).
export interface VistaPreset {
  id: number;
  nombre: string;
  tipo_documento: "vista";
  opciones: Partial<VistaOpciones>;
  created_at: string;
}
