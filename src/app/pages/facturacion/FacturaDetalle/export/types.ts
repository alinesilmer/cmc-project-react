// Espejo de `app/modules/facturacion/export/schemas.py` en el backend — los
// literals tienen que coincidir carácter por carácter con los que acepta la API.
import type { Tipo } from "../../types";
import type { ColumnaVista, OrdenVista, VistaOpciones } from "../vista/types";

export type OrdenExport =
  | "nombre_socio" | "nro_socio" | "fecha_practica" | "fecha_carga" | "codigo"
  | "importe" | "importe_desc" | "nombre_afiliado" | "especialidad";

export type DireccionExport = "asc" | "desc";

export type AgrupacionExport = "todo_junto" | "por_tipo" | "por_socio" | "plana";

export type ColumnaExport =
  | "prestador" | "matricula" | "autorizacion" | "fecha" | "codigo"
  | "nro_afiliado" | "afiliado" | "cantidad" | "porcentaje"
  | "honorarios" | "gastos" | "coseguro" | "diagnostico" | "via" | "especialidad"
  | "estado_validacion";

export const COLUMNAS_DEFAULT: ColumnaExport[] = [
  "prestador", "matricula", "autorizacion", "fecha", "codigo",
  "nro_afiliado", "afiliado", "cantidad", "porcentaje", "honorarios", "gastos",
];

export const COLUMNAS_DISPONIBLES: { key: ColumnaExport; label: string }[] = [
  { key: "prestador", label: "Prestador" },
  { key: "matricula", label: "Matrícula" },
  { key: "autorizacion", label: "Autorización" },
  { key: "fecha", label: "Fecha" },
  { key: "codigo", label: "Código" },
  { key: "nro_afiliado", label: "Nro. afiliado" },
  { key: "afiliado", label: "Afiliado" },
  { key: "cantidad", label: "Cantidad" },
  { key: "porcentaje", label: "%" },
  { key: "honorarios", label: "Honorarios" },
  { key: "gastos", label: "Gastos" },
  { key: "coseguro", label: "Coseguro" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "via", label: "Vía" },
  { key: "especialidad", label: "Especialidad" },
  { key: "estado_validacion", label: "Estado validación" },
];

export interface ExportFiltros {
  fecha_desde?: string;
  fecha_hasta?: string;
  id_especialidad?: number;
  cod_medicos?: string[];
  revisado?: boolean;
  tipos?: Tipo[];
}

export interface ExportOpciones extends ExportFiltros {
  orden: OrdenExport;
  direccion: DireccionExport;
  agrupacion: AgrupacionExport;
  // Como "Agrupar equipo quirúrgico" de la vista: el equipo se repite, de referencia
  // (sin sumar), bajo la cabeza.
  agrupar_equipo: boolean;
  columnas: ColumnaExport[];
}

// Columnas de la vista que existen en el export. El socio (nombre y matrícula) siempre
// se ve en la vista, así que va siempre; "TP" y "Valor unitario" no tienen equivalente.
const COLUMNA_VISTA_A_EXPORT: Partial<Record<ColumnaVista, ColumnaExport>> = {
  autorizacion: "autorizacion", fecha: "fecha", codigo: "codigo", via: "via",
  nro_afiliado: "nro_afiliado", paciente: "afiliado", cantidad: "cantidad", porcentaje: "porcentaje",
  honorarios: "honorarios", gastos: "gastos", coseguro: "coseguro",
};

const ORDEN_VISTA_A_EXPORT: Record<OrdenVista, OrdenExport> = {
  fecha: "fecha_practica", fecha_carga: "fecha_carga", codigo: "codigo",
  importe: "importe", nombre_socio: "nombre_socio",
};

// Lo que se exporta es lo que se está viendo: misma agrupación, orden, dirección, filtros,
// equipo y columnas. En el panel de exportar sólo se pueden cambiar las columnas.
export const opcionesDesdeVista = (v: VistaOpciones): ExportOpciones => {
  const out: ExportOpciones = {
    orden: ORDEN_VISTA_A_EXPORT[v.orden],
    direccion: v.direccion,
    agrupacion: v.agrupacion,
    agrupar_equipo: v.agruparEquipo,
    columnas: [
      "prestador", "matricula",
      ...v.columnas.flatMap((c) => COLUMNA_VISTA_A_EXPORT[c] ?? []),
    ],
  };
  if (v.fecha_desde) out.fecha_desde = v.fecha_desde;
  if (v.fecha_hasta) out.fecha_hasta = v.fecha_hasta;
  if (v.id_especialidad !== undefined) out.id_especialidad = v.id_especialidad;
  if (v.cod_medicos && v.cod_medicos.length > 0) out.cod_medicos = v.cod_medicos;
  if (v.revisado !== undefined) out.revisado = v.revisado;
  if (v.tipos && v.tipos.length > 0) out.tipos = v.tipos;
  return out;
};
