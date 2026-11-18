// Datos del boletín tal como los ve el socio.

import { getJSON } from "@/app/shared/lib/http";
import {
  fetchGalenosPorOS,
  hoyISO,
  type GalenoItem,
} from "@/app/features/nomenclador/galenos";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import {
  codigoViejo,
  CODIGOS_CON_PRECIO_PEDIATRICO,
  codigosPediatria,
  ESPECIALIDAD_PEDIATRIA,
  NOMBRE_CODIGO,
} from "./boletinPediatria";
import { aNumero } from "@/app/shared/lib/utiles";

;

/** Un valor del boletín de pediatría: un código con su precio. */
interface ValorPediatria {
  codigo: string;
  nombre: string;
  valor: number;
}

/** El código de consulta del boletín. Swiss Medical y UNNE usan el suyo. */
const CODIGO_CONSULTA = "420351";
const CODIGO_CONSULTA_SWISS = "42010100";
const SWISS_MEDICAL_NRO = 256;
const CODIGO_CONSULTA_UNNE = "420101";
const UNNE_NRO = 81;

/** Una obra social del boletín. */
export interface ItemBoletin {
  nro: number;
  nombre: string;
  /** Precio de la consulta. `null` si la obra social no tiene uno vigente. */
  consulta: number | null;
  galenos: GalenoItem[];
  /** Las condiciones que pone la obra social, una por renglón: si pide bono, si hay que cobrar el coseguro, si las prácticas llevan autorización previa. */
  observaciones: string[];
  /** Sólo para pediatras: los códigos de pediatría que reconoce la obra social, con su precio. */
  pediatria: ValorPediatria[];
}

interface ApiObservacion {
  nro_obrasocial: number;
  texto: string;
}

interface ApiObservacionesOut {
  items: ApiObservacion[];
}

interface ApiBoletinItem {
  obra_social_nro: number;
  codigo: string;
  precio_total: number | string;
  vigencia_desde: string | null;
  por_presupuesto?: boolean;
  /** De qué especialidad es el precio; `null` = general. */
  especialidad_id_colegio?: number | null;
}

interface ApiBoletinOut {
  fecha: string;
  items: ApiBoletinItem[];
}
/** Consulta por obra social a una fecha. */
export async function consultaPorOS(
  codigo: string,
  fecha: string,
  especialidad?: number
): Promise<Map<number, ApiBoletinItem>> {
  const porOS = new Map<number, ApiBoletinItem>();
  try {
    const params = especialidad ? { fecha, codigo, especialidad } : { fecha, codigo };
    const res = await getJSON<ApiBoletinOut>("/api/reportes_nm/boletin", params);
    for (const item of res.items ?? []) {
      if (!item.obra_social_nro) continue;

      const previo = porOS.get(item.obra_social_nro);
      if (!previo || esMejor(item, previo, especialidad)) {
        porOS.set(item.obra_social_nro, item);
      }
    }
  } catch {
    // Código inexistente o sin vigencia: no hay consulta que mostrar.
  }
  return porOS;
}

/** Las observaciones de cada obra social, ya partidas en renglones. */
export async function observacionesPorOS(): Promise<Map<number, string[]>> {
  const porOS = new Map<number, string[]>();
  try {
    const res = await getJSON<ApiObservacionesOut>("/api/boletin/observaciones");
    for (const o of res.items ?? []) {
      if (!o.nro_obrasocial) continue;
      const lineas = (o.texto ?? "")
        .split(/\r?\n/)
        .map((l) => l.replace(/^[\s\-–—•*?]+/, "").trim())
        .filter(Boolean);
      if (lineas.length > 0) porOS.set(o.nro_obrasocial, lineas);
    }
  } catch {
    // Sin observaciones el boletín igual se muestra.
  }
  return porOS;
}

/** Gana la vigencia más reciente; si empatan, el precio más alto. */
function esMasReciente(item: ApiBoletinItem, previo: ApiBoletinItem): boolean {
  const nueva = item.vigencia_desde ?? "";
  const vieja = previo.vigencia_desde ?? "";
  if (nueva !== vieja) return nueva > vieja;
  return aNumero(item.precio_total) > aNumero(previo.precio_total);
}

/** El precio de la especialidad le gana al general; entre iguales, el más reciente. */
function esMejor(item: ApiBoletinItem, previo: ApiBoletinItem, especialidad?: number): boolean {
  if (especialidad !== undefined) {
    const esDeLaEspecialidad = item.especialidad_id_colegio === especialidad;
    if (esDeLaEspecialidad !== (previo.especialidad_id_colegio === especialidad)) {
      return esDeLaEspecialidad;
    }
  }
  return esMasReciente(item, previo);
}

/** Los precios de pediatría de cada código, por obra social. */
async function preciosPediatria(fecha: string): Promise<Map<string, Map<number, ApiBoletinItem>>> {
  const porCodigo = await Promise.all(
    CODIGOS_CON_PRECIO_PEDIATRICO.map(
      async (codigo) => [codigo, await consultaPorOS(codigo, fecha, ESPECIALIDAD_PEDIATRIA)] as const
    )
  );
  return new Map(porCodigo);
}

/** Los valores de pediatría de una obra social, en el orden de la lista del Colegio. */
function valoresPediatria(
  nro: number,
  precios: Map<string, Map<number, ApiBoletinItem>>
): ValorPediatria[] {
  const valores: ValorPediatria[] = [];
  for (const codigo of codigosPediatria(nro)) {
    const propio = aNumero(precios.get(codigo)?.get(nro)?.precio_total);
    const viejo = codigoViejo(codigo);
    // Si el código nuevo no tiene precio cargado, se muestra con el precio del número viejo.
    const valor =
      propio && propio > 0
        ? propio
        : viejo
          ? aNumero(precios.get(viejo)?.get(nro)?.precio_total)
          : 0;
    if (valor && valor > 0) {
      valores.push({ codigo, nombre: NOMBRE_CODIGO[codigo] ?? codigo, valor });
    }
  }
  return valores;
}

export async function fetchBoletinMedico(
  { pediatria = false }: { pediatria?: boolean } = {}
): Promise<ItemBoletin[]> {
  const fecha = hoyISO();

  const [obras, consultas, consultasSwiss, consultasUnne, galenos, observaciones, precios] =
    await Promise.all([
      // Sin filtro: el catálogo entero, ya ordenado alfabéticamente por el backend.
      listObrasSociales(),
      consultaPorOS(CODIGO_CONSULTA, fecha),
      consultaPorOS(CODIGO_CONSULTA_SWISS, fecha),
      consultaPorOS(CODIGO_CONSULTA_UNNE, fecha),
      // Sin los galenos ocultados para el médico desde "Actualizar Unidades".
      fetchGalenosPorOS(fecha, { soloVisibles: true }),
      observacionesPorOS(),
      // Sólo los pediatras piden los cinco códigos de pediatría.
      pediatria ? preciosPediatria(fecha) : Promise.resolve(null),
    ]);

  const items: ItemBoletin[] = [];

  for (const os of obras) {
    const nro = os.nro_obra_social;
    if (!nro) continue;

    // Swiss Medical y UNNE facturan la consulta con su propio código.
    const fuente =
      nro === SWISS_MEDICAL_NRO ? consultasSwiss : nro === UNNE_NRO ? consultasUnne : consultas;
    const item = fuente.get(nro);
    const galenosDeOS = galenos.get(nro) ?? [];
    const obsDeOS = observaciones.get(nro) ?? [];

    // Sin precio, sin galenos y sin condiciones no hay nada que mostrar.
    const crudo = item ? aNumero(item.precio_total) : null;
    const consulta = crudo && crudo > 0 ? crudo : null;
    const pediatriaDeOS = precios ? valoresPediatria(nro, precios) : [];
    if (
      consulta === null &&
      galenosDeOS.length === 0 &&
      obsDeOS.length === 0 &&
      pediatriaDeOS.length === 0
    ) {
      continue;
    }

    items.push({
      nro,
      nombre: (os.nombre || os.denominacion || `OS ${nro}`).trim(),
      consulta,
      galenos: galenosDeOS,
      observaciones: obsDeOS,
      pediatria: pediatriaDeOS,
    });
  }

  return items.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" })
  );
}
