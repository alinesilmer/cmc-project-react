import type { Origen } from "../nomenclador.types";

// ─── Local types ──────────────────────────────────────────────────────────────

export type ModalidadValor = "calculable" | "fijo";

export type ModalKind = "create" | "edit" | null;

/** Cómo se factura un valor NE: por un nomenclador (escala + galeno de la OS), por un importe
 * fijo o armado a mano (galeno × cantidad libres). */
export type ComoFactura = "nomenclador" | "fijo" | "manual";

export type ComponenteForm = {
  concepto: "Honorarios" | "Ayudante" | "Gastos";
  galeno_id: number | null;
  cantidad: string;
  valor_unitario: string;
  opcional: boolean;
};

/** Lo que se cotiza: tipo de valor, componentes y coseguro. */
export type PrecioForm = {
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
  coseguro: string;
  /** Sólo al editar un valor NE: cómo se factura (y con qué nomenclador). */
  comoFactura?: ComoFactura;
  nomencladorId?: number | null;
};

/** Precios activos que el código ya tiene en la O.S. (para no duplicarlos). */
export type PreciosExistentes = {
  nn: boolean;
  /** NE sin especialidad (par sin restricción). */
  sinEspecialidad: boolean;
  especialidades: Set<number>;
};

export type ValorForm = {
  nomencladorId: number | null;
  nomencladorLabel: string;
  /** Descripción por defecto del catálogo, sólo para mostrar el código elegido. */
  nomencladorDesc: string;
  origen: Origen;
  modalidad: ModalidadValor;
  comoFactura: ComoFactura;
  /** Nomenclador elegido cuando `comoFactura` es "nomenclador". */
  nomencladorSlug: string;
  vigencia_desde: string;
  /** Obligatoria: cómo nombra esta obra social al código. */
  descripcion: string;
  porPresupuesto: boolean;
  nivel: string;
  complejidad: string;
  /** Máximo de ayudantes admitidos — vacío = no lleva. */
  cantidad_ayudantes: string;
  coseguro: string;
  observacion: string;
  /** Especialidades tildadas para la variante NE a crear — una fila por cada una (ver POST /valores_nm/multi). */
  especialidadesChecked: Set<number>;
  /** NE "sin restricción por especialidad": una sola fila, sin lista de especialidades. */
  sinRestriccion: boolean;
  componentes: ComponenteForm[];
  /** NE con varias especialidades: un solo precio para todas (default) o uno por cada una. */
  mismoPrecio: boolean;
  /** Precio de cada especialidad cuando `mismoPrecio` está destildado. */
  precios: Record<number, PrecioForm>;
};

export type EditMode = "nucleo" | "variante";

export type EditMetaForm = {
  descripcion: string;
  /** Dato del par (obra_social_nro, código) — se propaga en el back a todas las variantes activas del mismo par (incluida la NN) al guardar. */
  sin_restriccion_especialidad: boolean;
  /** Especialidades habilitadas HOY para el par. */
  especialidades: number[];
  nivel: string;
  complejidad: string;
  cantidad_ayudantes: string;
  observacion: string;
};

export type EditEcuForm = {
  vigencia_desde: string;
  modalidad: ModalidadValor;
  componentes: ComponenteForm[];
  coseguro: string;
  /** Propaga la nueva vigencia+ecuación a las demás variantes NE del mismo código+OS. */
  aplicarAVariantes: boolean;
  comoFactura?: ComoFactura;
  nomencladorId?: number | null;
};
