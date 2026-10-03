// Parámetros de visualización de la tabla de listado — análogo a
// `../export/types.ts`, pero todo se aplica en el cliente sobre datos que ya
// están en memoria (el endpoint `/facturas/{id}/detalle` no tiene filtros ni
// orden propios): no hay ida y vuelta al servidor al cambiar una opción acá.
import type { Tipo } from "../../types";

export type OrdenVista = "fecha" | "codigo" | "importe" | "nombre_socio";

// Sentido del criterio de arriba — separado del criterio en sí (antes "monto_desc"
// mezclaba las dos cosas en una sola opción, sin forma de pedir importe ascendente).
export type OrdenDireccion = "asc" | "desc";

export type AgrupacionVista = "por_socio" | "por_tipo" | "plana";

export const OPCIONES_ORDEN_VISTA: { value: OrdenVista; label: string }[] = [
  { value: "fecha", label: "Fecha de práctica" },
  { value: "codigo", label: "Código" },
  { value: "importe", label: "Importe" },
  { value: "nombre_socio", label: "Nombre del socio" },
];

export const OPCIONES_AGRUPACION_VISTA: { value: AgrupacionVista; label: string; ayuda: string }[] = [
  { value: "por_socio", label: "Por socio", ayuda: "Médicos y después clínicas, cada uno con su resumen (orden fijo)" },
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
  | "cantidad" | "porcentaje" | "honorarios" | "gastos" | "coseguro" | "tipo_prestador"
  | "valor_unitario" | "subtotal" | "tipo";

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
  { key: "coseguro", label: "Coseguro" },
  { key: "tipo_prestador", label: "TP" },
  { key: "valor_unitario", label: "Valor unitario" },
  { key: "subtotal", label: "Total" },
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
  paciente: 9, cantidad: 6, porcentaje: 4, honorarios: 6, gastos: 6, coseguro: 6,
  tipo_prestador: 3, valor_unitario: 7, subtotal: 7, tipo: 3, acciones: 8,
};

export interface VistaOpciones extends FiltrosVista {
  orden: OrdenVista;
  direccion: OrdenDireccion;
  agrupacion: AgrupacionVista;
  // Muestra, indentadas debajo de la fila del cirujano, las de sus compañeros
  // de equipo (ayudante/gastos) — sin sumarlas a su subtotal. Independiente
  // del modo de agrupación: combina con cualquiera de los tres de arriba.
  agruparEquipo: boolean;
  columnas: ColumnaVista[];
}

export const VISTA_OPCIONES_DEFAULT: VistaOpciones = {
  orden: "nombre_socio",
  direccion: "asc",
  agrupacion: "por_socio",
  agruparEquipo: true,
  columnas: COLUMNAS_VISTA_DEFAULT,
};
