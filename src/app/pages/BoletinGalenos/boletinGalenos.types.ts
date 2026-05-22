export type GalenoLevel = 0 | 7 | 10;

export const GALENO_FIELDS = [
  // ── Galenos ──
  { key: "galeno_quirurgico",      label: "Galeno Quirúrgico",      group: "galenos" },
  { key: "galeno_practica",        label: "Galeno Práctica",        group: "galenos" },
  { key: "galeno_radiologico",     label: "Galeno Radiológico",     group: "galenos" },
  { key: "galeno_cirugia_adultos", label: "Galeno Cirugía Adultos", group: "galenos" },
  { key: "galeno_cirugia_infantil",label: "Galeno Cirugía Infantil",group: "galenos" },
  { key: "galeno_ginecologia",     label: "Galeno Ginecología",     group: "galenos" },
  { key: "galeno_urologia",        label: "Galeno Urología",        group: "galenos" },
  // ── Gastos ──
  { key: "gastos_quirurgicos",     label: "Gastos Quirúrgicos",     group: "gastos"  },
  { key: "gastos_radiologico",     label: "Gastos Radiológico",     group: "gastos"  },
  { key: "gastos_bioquimicos",     label: "Gastos Bioquímicos",     group: "gastos"  },
  { key: "otros_gastos",           label: "Otros Gastos",           group: "gastos"  },
] as const;

export type GalenoFieldKey = (typeof GALENO_FIELDS)[number]["key"];

export type GalenoValues = Record<GalenoFieldKey, string>;

export type GalenoFormState = GalenoValues & {
  nro_obra_social: string;
  fecha_vigencia:  string;
  nivel:           GalenoLevel;
};

export type CodigoAfectado = {
  id:          number;
  codigo:      string;
  descripcion: string;
  campo:       string;
  honorarios:  number;
  gastos:      number;
  ayudante:    number;
};

export const EMPTY_GALENO_VALUES: GalenoValues = Object.fromEntries(
  GALENO_FIELDS.map((f) => [f.key, ""])
) as GalenoValues;
