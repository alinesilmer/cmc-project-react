import type { EventoAgenda, OcurrenciaAgenda, TipoEvento } from "./agenda.types";

// Días de la salud que caen igual todos los años; viven en el front, no en la base.
// Casi todos son una tarea del Colegio (saludar a los médicos de la especialidad); sólo el Día del Trabajador es feriado.

/** [mes, día, título] */
const FIJOS: [number, number, string][] = [
  [3, 21, "Día del Dermatólogo"],
  [4, 9, "Día de la Cardiología Argentina"],
  [4, 11, "Día del Médico Clínico"],
  [4, 12, "Día del Ginecólogo y Obstetra"],
  [4, 16, "Día del Endocrinólogo"],
  [5, 1, "Día del Trabajador"],
  [5, 2, "Día del Urólogo"],
  [5, 6, "Día del Neurocirujano Argentino"],
  [5, 8, "Día del Traumatólogo"],
  [5, 17, "Día del Infectólogo"],
  [5, 19, "Día Mundial del Médico de Familia"],
  [5, 27, "Día de la Medicina de Urgencias y Emergencias / Emergentólogo"],
  [5, 31, "Día del Reumatólogo"],
  [6, 10, "Día del Médico Neonatólogo"],
  [6, 15, "Día del Bioquímico"],
  [6, 25, "Día del Otorrinolaringólogo"],
  [6, 26, "Día del Hematólogo"],
  [6, 27, "Día del Alergista"],
  [7, 4, "Día Nacional del Médico Rural"],
  [8, 11, "Día del Nutricionista"],
  [8, 31, "Día de la Obstetricia y del Obstetra"],
  [9, 4, "Día de la Secretaria"],
  [9, 15, "Día del Médico Nefrólogo"],
  [9, 21, "Día de la Sanidad"],
  [9, 25, "Día del Neumonólogo"],
  [9, 26, "Día del Cirujano"],
  [10, 4, "Día del Médico Laboral"],
  [10, 16, "Día del Anestesiólogo"],
  [10, 20, "Día del Pediatra"],
  [10, 30, "Día del Gastroenterólogo"],
  [11, 7, "Día del Oncólogo / Día Nacional de la Oncología"],
  [11, 8, "Día del Radiólogo"],
  [11, 22, "Día del Psiquiatra"],
  [11, 29, "Día del Neurólogo"],
  [12, 3, "Día del Médico"],
  [12, 13, "Día del Oftalmólogo"],
];

/** Feriados de 2027: fecha exacta, con los trasladados ya en su día. El Día del Trabajador ya sale de la lista anual. */
const FERIADOS_2027: [string, string, string | null][] = [
  ["2027-01-01", "Año Nuevo", null],
  ["2027-03-24", "Día de la Memoria", null],
  ["2027-04-02", "Día del Veterano de Malvinas", null],
  ["2027-05-25", "Revolución de Mayo", null],
  ["2027-06-20", "Día de la Bandera", null],
  ["2027-06-21", "Fallecimiento de Güemes", "Trasladado desde el 17/6"],
  ["2027-07-09", "Día de la Independencia", null],
  ["2027-08-16", "Fallecimiento del General San Martín", "Trasladado desde el 17/8"],
  ["2027-10-11", "Día del Respeto a la Diversidad Cultural", "Trasladado desde el 12/10"],
  ["2027-11-20", "Día de la Soberanía Nacional", null],
  ["2027-12-08", "Inmaculada Concepción", null],
  ["2027-12-25", "Navidad", null],
];

/** Los que son feriados de verdad. */
const FERIADOS = new Set(["Día del Trabajador"]);

/** Ids negativos: nunca chocan con los de la base y delatan que la fila no se edita. */
const SALUD: EventoAgenda[] = FIJOS.map(([mes, dia, titulo], i) => {
  const feriado = FERIADOS.has(titulo);
  return {
    id: -(i + 1),
    tipo: feriado ? "feriado" : "tarea",
    titulo,
    descripcion: feriado ? null : "Saludar a los médicos",
    recurrencia: "anual",
    dia,
    mes,
    activo: true,
  };
});

const FERIADOS_DE_FECHA: EventoAgenda[] = FERIADOS_2027.map(([fecha, titulo, descripcion], i) => ({
  id: -(FIJOS.length + i + 1),
  tipo: "feriado",
  titulo,
  descripcion,
  recurrencia: "unica",
  fecha,
  activo: true,
}));

export const DIAS_FIJOS: EventoAgenda[] = [...SALUD, ...FERIADOS_DE_FECHA];

/** Una fecha única se repite sólo si es el mismo día: el «Día de la Independencia» de 2026 no tapa el de 2027. */
const clave = (e: { titulo: string; fecha?: string | null; recurrencia?: string }) =>
  `${e.titulo.trim().toLowerCase()}|${e.recurrencia === "unica" ? (e.fecha ?? "") : ""}`;

/** Los fijos de un calendario que no estén ya cargados a mano con el mismo título. */
export function fijosSinRepetir(cargados: EventoAgenda[], tipo: TipoEvento): EventoAgenda[] {
  const propios = new Set(cargados.map(clave));
  return DIAS_FIJOS.filter((e) => e.tipo === tipo && !propios.has(clave(e)));
}

/** Los fijos de un mes ya ubicados en su día, listos para mezclar con lo que trae el backend; `filtro` deja sólo un calendario. */
export function fijosDelMes(
  anio: number,
  mes: number,
  cargados: OcurrenciaAgenda[],
  filtro: TipoEvento | null
): OcurrenciaAgenda[] {
  // Lo que viene del backend ya trae la fecha del día en que ocurre.
  const propios = new Set(cargados.map((o) => clave({ ...o, fecha: o.ocurre_el, recurrencia: o.recurrencia })));
  const mm = String(mes).padStart(2, "0");
  const anuales = DIAS_FIJOS.filter((e) => e.recurrencia === "anual" && e.mes === mes).map((e) => ({
    ...e,
    ocurre_el: `${anio}-${mm}-${String(e.dia).padStart(2, "0")}`,
  }));
  const dePuntuales = DIAS_FIJOS.filter((e) => e.recurrencia === "unica" && e.fecha?.startsWith(`${anio}-${mm}`)).map((e) => ({
    ...e,
    ocurre_el: e.fecha as string,
  }));
  return [...anuales, ...dePuntuales].filter(
    (o) => (!filtro || o.tipo === filtro) && !propios.has(clave({ ...o, fecha: o.ocurre_el }))
  );
}
