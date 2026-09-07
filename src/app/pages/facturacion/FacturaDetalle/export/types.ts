// Espejo de `app/modules/facturacion/export/schemas.py` en el backend — los
// literals tienen que coincidir carácter por carácter con los que acepta la API.
import type { Tipo } from "../../types";

export type OrdenExport =
  | "nombre_socio" | "nro_socio" | "fecha_practica" | "codigo"
  | "importe_desc" | "nombre_afiliado" | "especialidad";

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

export const OPCIONES_ORDEN: { value: OrdenExport; label: string }[] = [
  { value: "nombre_socio", label: "Nombre del socio (A-Z)" },
  { value: "nro_socio", label: "Número de socio" },
  { value: "fecha_practica", label: "Fecha de práctica" },
  { value: "codigo", label: "Código" },
  { value: "importe_desc", label: "Importe (mayor a menor)" },
  { value: "nombre_afiliado", label: "Nombre del afiliado" },
  { value: "especialidad", label: "Especialidad" },
];

export const OPCIONES_AGRUPACION: { value: AgrupacionExport; label: string; ayuda: string }[] = [
  { value: "todo_junto", label: "Todo junto", ayuda: "Una sola lista, con resumen por socio" },
  { value: "por_tipo", label: "Separado por tipo", ayuda: "Consultas, prácticas, honorarios y sanatorios aparte" },
  { value: "por_socio", label: "Separado por socio", ayuda: "Una hoja o sección por prestador" },
  { value: "plana", label: "Planilla plana", ayuda: "Sin cortes ni resúmenes — para pivotear en Excel" },
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
  agrupacion: AgrupacionExport;
  columnas: ColumnaExport[];
}

export const OPCIONES_DEFAULT: ExportOpciones = {
  orden: "nombre_socio",
  agrupacion: "todo_junto",
  columnas: COLUMNAS_DEFAULT,
};

export type TipoDocumentoPreset = "detalle" | "caratula";

export interface ExportPreset {
  id: number;
  nombre: string;
  tipo_documento: TipoDocumentoPreset;
  opciones: ExportOpciones;
  created_at: string;
}
