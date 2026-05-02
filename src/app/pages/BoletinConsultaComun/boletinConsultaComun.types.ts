export type ApiBoletinRow = {
  id: number;
  codigos: string;
  nro_obrasocial: number;
  obra_social: string | null;
  honorarios_a: number;
  honorarios_b: number;
  honorarios_c: number;
  gastos: number;
  ayudante_a: number;
  ayudante_b: number;
  ayudante_c: number;
  c_p_h_s: string;
  fecha_cambio: string | null;
};

export type GalenoValues = {
  quirurgico: number;
  practica: number;
  radiologico: number;
  cirugiaAdultos: number;
  cirugiaInfantil: number;
  gastosQuirurgicos: number;
  /** Legacy DB column name: gastos_radiologico (singular). */
  gastosRadiologico: number;
  gastosBioquimicos: number;
  otrosGastos: number;
};

export type ConsultaComunItem = {
  nro: number;
  nombre: string;
  valor: number;
  fechaCambio: string | null;
  observaciones: string[];
  /** Populated from backend but not rendered in the UI table — export only. */
  galeno: GalenoValues;
};

/** One text observation per obra social, keyed by nro_obrasocial. */
export type ObservacionesMap = Record<number, string>;