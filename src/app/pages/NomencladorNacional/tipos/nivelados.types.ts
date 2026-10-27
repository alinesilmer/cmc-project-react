// ─── Nomencladores nivelados (Cirugía adulto 7/10, Cirugía infantil, FASGO, Urología…) ──

export type NomencladorNiveladoOut = {
  id: number;
  slug: string;
  nombre: string;
  galeno_grupo: string;
  galeno_codigo: string | null;
  galeno_nombre: string | null;
  galeno_gastos_codigo: string | null;
  /** `nacional`: el Nomenclador Nacional (sin escala por nivel; no se aplica a una OS). */
  tipo: "nivelado" | "nacional";
  niveles: number;
  /** ID_COLEGIO_ESPE a las que se aplica el nomenclador; vacío = todas las del código. */
  especialidades: number[];
  total_codigos: number;
  /** nivel → cantidad de códigos (las claves llegan como texto en el JSON). */
  por_nivel: Record<string, number>;
  con_unidades: number;
};

export type NiveladoCodigoOut = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  activo: boolean;
  nivel: number | null;
  /** "N unidades" fijas en vez de nivel (Honorarios = N × galeno de nivel 1). */
  unidades: string | null;
  observacion: string | null;
};

export type NiveladoCodigosOut = {
  items: NiveladoCodigoOut[];
  total: number;
  page: number;
  size: number;
};

/** Nivel o unidades fijas: exactamente uno. */
export type NiveladoCodigoIn = {
  nivel: number | null;
  unidades: number | null;
  observacion?: string | null;
};

export type EstadoAplicarNivelado =
  | "crear" | "creado" | "reemplazar" | "reemplazado" | "sin_quien_factura" | "fuera_de_especialidad"
  | "suspendido" | "omitido";

type AplicarNiveladoFila = {
  nomenclador_id: number;
  codigo: string;
  descripcion: string | null;
  nivel: number | null;
  unidades: string | null;
  estado: EstadoAplicarNivelado;
  precios: number;
  precio: string | null;
  motivo: string | null;
  /** Vigencias NE desde la fecha cargada en adelante que se borran de la base. */
  vigencias_borradas: number;
};

/** Unidades de un nivel PARA ESTA obra social (pisan la escala del nomenclador). */
export type AplicarNiveladoAjuste = {
  nivel: number;
  unidades_honorarios?: number | null;
  unidades_ayudante?: number | null;
};

/** Cómo se crea el galeno de la OS si no lo tiene o cambia de nomenclador (7 ↔ 10 niveles). */
export type AplicarNiveladoGaleno = {
  /** `false`: calculado (unidades × `valor_unitario`). `true`: precio fijo por nivel. */
  precio_por_nivel: boolean;
  valor_unitario?: number | null;
  precios_por_nivel?: Record<number, number> | null;
  ajustes?: AplicarNiveladoAjuste[];
};

export type AplicarNiveladoPayload = {
  obra_social_nro: number;
  vigencia_desde: string;
  dry_run: boolean;
  galeno?: AplicarNiveladoGaleno | null;
};

/** La OS usa otro nomenclador con el mismo galeno: al aplicar se eliminan sus valores y se
 * crean los del nuevo. */
type AplicarNiveladoCambio = {
  desde_slug: string;
  desde_nombre: string;
  niveles_desde: number;
  valores_eliminados: number;
  codigos_sin_reemplazo: number;
  valores_a_crear: number;
};

type NiveladoGalenoNivel = {
  nivel: number;
  valor_unitario: string;
  unidades_honorarios: string;
  unidades_ayudante: string;
  ajustado: boolean;
};

export type NiveladoEstadoOsOut = {
  obra_social_nro: number;
  obra_social: string;
  niveles_nomenclador: number;
  /** ok: tiene el galeno · falta: no lo tiene · otros_niveles: lo tiene con otra cantidad de niveles. */
  galeno_estado: "ok" | "falta" | "otros_niveles";
  niveles_os: number | null;
  precio_por_nivel: boolean | null;
  niveles: NiveladoGalenoNivel[];
  cambio: AplicarNiveladoCambio | null;
};

type NiveladoEscalaNivel = {
  nivel: number;
  unidades_honorarios: string | number;
  /** `null`: el 25 % de las de honorarios. */
  unidades_ayudante: string | number | null;
};

export type NiveladoEscalaOut = {
  slug: string;
  nombre: string;
  galeno_codigo: string | null;
  galeno_gastos_codigo: string | null;
  niveles: NiveladoEscalaNivel[];
  obras_sociales: number;
};

export type RecalcularNiveladoResult = {
  dry_run: boolean;
  obras_sociales: number;
  valores: number;
  detalle: { obra_social_nro: number; valores: number; crear: number; reemplazar: number }[];
  errores: { obra_social_nro: number; motivo: string }[];
};

export type NomencladorDeCodigoOut = {
  id: number;
  slug: string;
  nombre: string;
  tipo: "nivelado" | "nacional";
  niveles: number;
  nivel_del_codigo: number | null;
  unidades_del_codigo: string | null;
};

export type GalenoResumenOut = {
  codigo: string;
  nomencladores: string[];
  modo: "calculado" | "por_nivel";
  niveles: NiveladoGalenoNivel[];
};

export type AplicarNiveladoOut = {
  dry_run: boolean;
  obra_social_nro: number;
  nomenclador: string;
  galeno_nombre: string;
  galeno_creado: boolean;
  cambio: AplicarNiveladoCambio | null;
  resumen: {
    total: number;
    crear: number;
    /** Ya tenían precio NE: se les carga la vigencia igual. */
    reemplazar: number;
    vigencias_borradas: number;
    sin_quien_factura: number;
    /** Ninguna de sus especialidades en la O.S. es del nomenclador: no se les carga precio. */
    fuera_de_especialidad: number;
    suspendido: number;
    omitido: number;
    precios: number;
    altas: number;
  };
  filas: AplicarNiveladoFila[];
};
