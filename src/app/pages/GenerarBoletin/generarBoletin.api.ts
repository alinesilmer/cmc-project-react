// Lo que el boletín de valores pide al servidor: todo sale de las tablas nm_.

import { fetchGalenosPorOS, hoyISO, type GalenoItem } from "@/app/features/nomenclador/galenos";
import { aNumero } from "@/app/shared/lib/utiles";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import { consultaPorOS } from "../BoletinMedico/boletinMedico.api";

/** Un valor del boletín; en un galeno nivelado van el menor y el mayor de sus niveles. */
export type ValorBoletin = { minimo: number; maximo: number };

/** Qué galeno (slug de `nm_galenos`) alimenta cada renglón del boletín. */
export const GALENOS_BOLETIN = {
  galenoQuirurgico: "galeno_quirurgico",
  gastosQuirurgicos: "gasto_quirurgico",
  galenoPractica: "galeno_practica",
  galenoRadiologico: "galeno_radiologico",
  gastosRadiologicos: "gasto_radiologico",
  gastosBioquimicos: "gasto_bioquimico",
  otrosGastos: "gasto_otros",
  galenoCirugiaAdultos: "galeno_cirugia_adultos",
  galenoCirugiaInfantil: "galeno_cirugia_infantil",
} as const;

export type ClaveGaleno = keyof typeof GALENOS_BOLETIN;

export type FilaBoletin = {
  nro: number;
  nombre: string;
  consulta: number;
  valores: Record<ClaveGaleno, ValorBoletin>;
};

export type BoletinValores = {
  filas: FilaBoletin[];
  /** Vigencia más reciente de lo que trae el boletín (`aaaa-mm-dd`). */
  ultimaVigencia: string | null;
};

/** Consulta común; Swiss Medical factura con su propio código. */
const CODIGO_CONSULTA = "420351";
const CODIGO_CONSULTA_SWISS = "42010100";
const SWISS_MEDICAL_NRO = 256;

const SIN_VALOR: ValorBoletin = { minimo: 0, maximo: 0 };

function valorDeGaleno(galenos: GalenoItem[], codigo: string): ValorBoletin {
  const valores = galenos.filter((g) => g.codigo === codigo).map((g) => g.valor);
  if (valores.length === 0) return SIN_VALOR;
  return { minimo: Math.min(...valores), maximo: Math.max(...valores) };
}

export async function fetchValoresBoletin(): Promise<BoletinValores> {
  const fecha = hoyISO();

  // El boletín del Colegio lleva todos los galenos, también los que se ocultan al médico.
  const [obras, consultas, consultasSwiss, galenos] = await Promise.all([
    listObrasSociales(),
    consultaPorOS(CODIGO_CONSULTA, fecha),
    consultaPorOS(CODIGO_CONSULTA_SWISS, fecha),
    fetchGalenosPorOS(fecha),
  ]);

  const filas: FilaBoletin[] = [];
  let ultimaVigencia: string | null = null;
  const vigente = (v: string | null | undefined) => {
    if (v && (!ultimaVigencia || v > ultimaVigencia)) ultimaVigencia = v;
  };

  for (const os of obras) {
    const nro = os.nro_obra_social;
    if (!nro) continue;

    const item = (nro === SWISS_MEDICAL_NRO ? consultasSwiss : consultas).get(nro);
    const consulta = item ? aNumero(item.precio_total) : 0;
    const deLaOS = galenos.get(nro) ?? [];

    const valores = {} as Record<ClaveGaleno, ValorBoletin>;
    for (const clave of Object.keys(GALENOS_BOLETIN) as ClaveGaleno[]) {
      valores[clave] = valorDeGaleno(deLaOS, GALENOS_BOLETIN[clave]);
    }

    const conDatos = consulta > 0 || Object.values(valores).some((v) => v.maximo > 0);
    if (!conDatos) continue;

    if (consulta > 0) vigente(item?.vigencia_desde);
    for (const g of deLaOS) vigente(g.vigenciaDesde);

    filas.push({
      nro,
      nombre: (os.nombre || os.denominacion || `OS ${nro}`).trim(),
      consulta,
      valores,
    });
  }

  return { filas, ultimaVigencia };
}
