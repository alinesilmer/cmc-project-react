// Parámetros de visualización de la tabla de listado — análogo a
// `../export/types.ts`, pero todo se aplica en el cliente sobre datos que ya
// están en memoria (el endpoint `/facturas/{id}/detalle` no tiene filtros ni
// orden propios): no hay ida y vuelta al servidor al cambiar una opción acá.
import type { Tipo } from "../../types";

export type OrdenVista = "fecha" | "codigo" | "monto_desc" | "nombre_socio";

export type AgrupacionVista = "por_socio" | "por_tipo" | "plana";

export const OPCIONES_ORDEN_VISTA: { value: OrdenVista; label: string }[] = [
  { value: "fecha", label: "Fecha de práctica" },
  { value: "codigo", label: "Código" },
  { value: "monto_desc", label: "Importe (mayor a menor)" },
  { value: "nombre_socio", label: "Nombre del socio (A-Z)" },
];

export const OPCIONES_AGRUPACION_VISTA: { value: AgrupacionVista; label: string; ayuda: string }[] = [
  { value: "por_socio", label: "Por socio", ayuda: "Una sección por prestador, con su resumen (como hoy)" },
  { value: "por_tipo", label: "Por tipo", ayuda: "Consultas, prácticas, honorarios y sanatorios separados" },
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
}

export const FILTROS_VISTA_VACIOS: FiltrosVista = {};

export type ColumnaVista =
  | "autorizacion" | "fecha" | "codigo" | "via" | "nro_afiliado" | "paciente"
  | "cantidad" | "porcentaje" | "honorarios" | "gastos" | "tipo_prestador"
  | "subtotal" | "tipo";

// Mismo orden que las columnas fijas de la tabla (ID/Socio/Acciones no se
// pueden ocultar, por eso no están acá) — `ColumnasVistaSection` y el thead
// dinámico de `FacturaDetalle.tsx` iteran esta lista, nunca `opciones.columnas`
// directamente, así el orden en pantalla no depende del orden en que se tildó
// cada checkbox.
export const COLUMNAS_VISTA_DISPONIBLES: { key: ColumnaVista; label: string }[] = [
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
  { key: "tipo_prestador", label: "TP" },
  { key: "subtotal", label: "Sub total" },
  { key: "tipo", label: "Tipo" },
];

export const COLUMNAS_VISTA_DEFAULT: ColumnaVista[] = COLUMNAS_VISTA_DISPONIBLES.map((c) => c.key);

// Pesos relativos de ancho de columna — los mismos números que tenía cada
// `th:nth-child` fijo en FacturaDetalle.module.scss cuando las 16 columnas
// estaban siempre visibles. Con columnas que se pueden ocultar, el ancho ya
// no puede depender de la posición (nth-child) — se recalcula en
// `FacturaDetalle.tsx` como `peso / sumaDePesosVisibles * 100`, así la tabla
// sigue ocupando el 100% del ancho sin importar cuántas columnas se muestren.
export const PESO_COLUMNA: Record<"id" | "socio" | ColumnaVista | "acciones", number> = {
  id: 4, socio: 9, autorizacion: 6, fecha: 6, codigo: 6, via: 4, nro_afiliado: 6,
  paciente: 9, cantidad: 6, porcentaje: 4, honorarios: 6, gastos: 6,
  tipo_prestador: 5, subtotal: 7, tipo: 8, acciones: 8,
};

export interface VistaOpciones extends FiltrosVista {
  orden: OrdenVista;
  agrupacion: AgrupacionVista;
  // Muestra, indentadas debajo de la fila del cirujano, las de sus compañeros
  // de equipo (ayudante/gastos) — sin sumarlas a su subtotal. Independiente
  // del modo de agrupación: combina con cualquiera de los tres de arriba.
  agruparEquipo: boolean;
  columnas: ColumnaVista[];
}

export const VISTA_OPCIONES_DEFAULT: VistaOpciones = {
  orden: "fecha",
  agrupacion: "por_socio",
  agruparEquipo: true,
  columnas: COLUMNAS_VISTA_DEFAULT,
};
