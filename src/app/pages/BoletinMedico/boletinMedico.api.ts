// Datos del boletín tal como los ve el socio.
//
// **Todo sale del nomenclador nuevo (`nm_*`).** El sistema viejo lo armaba con
// `valores_boletin` y `valor_prestacion`; acá no se tocan:
//
//   consulta 420351   → GET /api/reportes_nm/boletin   (nm_historial_precio_codigo)
//   galenos           → GET /api/galenos/              (nm_galenos)
//   nombre de la O.S. → GET /api/obras_social/         (catálogo)
//   observaciones     → GET /api/boletin/observaciones (boletin_observacion)
//   pediatría         → GET /api/reportes_nm/boletin?especialidad=39, un pedido
//                       por código (sólo si el médico es pediatra; ver
//                       boletinPediatria.ts)
//
// Los cuatro piden permisos que el socio ya usa en su Consulta de Precios:
// `nomenclador:leer` y `catalogo:leer`.
//
// Dos diferencias de fondo con el boletín viejo, que vienen del modelo nuevo y
// no son decisiones de esta pantalla:
//
//  * El precio de la consulta ya viene resuelto (`precio_total`), calculado por
//    el backend desde los componentes. No se recalcula nada acá.
//  * Los galenos dejaron de ser nueve columnas fijas: cada obra social tiene
//    los que tenga, con su nombre y su nivel. La pantalla muestra lo que haya.

import { getJSON } from "@/app/shared/lib/http";
import {
  fetchGalenosPorOS,
  hoyISO,
  type GalenoItem,
} from "@/app/features/nomenclador/galenos";
import { listObrasSociales } from "../ObrasSociales/obrasSociales.api";
import {
  CODIGO_CONSULTA_COMUN,
  CODIGOS_CON_PRECIO_PEDIATRICO,
  CODIGOS_PEDIATRIA,
  ESPECIALIDAD_PEDIATRIA,
  NOMBRE_CODIGO,
} from "./boletinPediatria";

export type { GalenoItem };

/** Un valor del boletín de pediatría: un código con su precio. */
export interface ValorPediatria {
  codigo: string;
  nombre: string;
  valor: number;
}

/** El código de consulta del boletín. Swiss Medical usa el suyo. */
export const CODIGO_CONSULTA = "420351";
export const CODIGO_CONSULTA_SWISS = "42010100";
export const SWISS_MEDICAL_NRO = 256;

/** Una obra social del boletín. */
export interface ItemBoletin {
  nro: number;
  nombre: string;
  /** Precio de la consulta. `null` si la obra social no tiene uno vigente. */
  consulta: number | null;
  galenos: GalenoItem[];
  /**
   * Las condiciones que pone la obra social, una por renglón: si pide bono, si
   * hay que cobrar el coseguro, si las prácticas llevan autorización previa.
   * Es lo que el Colegio carga en su boletín, y para el socio pesa tanto como
   * el precio — cobrar sin el bono que la obra social exige es no cobrar.
   */
  observaciones: string[];
  /**
   * Sólo para pediatras: los códigos de pediatría que reconoce la obra social,
   * con su precio. Vacío para el resto de los médicos.
   */
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

const aNumero = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Consulta por obra social a una fecha.
 *
 * El endpoint filtra por rango de vigencia, no por identidad, y muchas filas
 * viejas quedaron con `vigencia_hasta` en NULL: hoy el 420351 devuelve más de
 * dos mil filas para cincuenta y tres obras sociales, con hasta cuarenta
 * vigencias solapadas por obra social y precios distintos entre sí. El orden en
 * que llegan no es el cronológico, así que quedarse con la última de la lista
 * sería quedarse con una cualquiera: se toma la de `vigencia_desde` más
 * reciente, que es el precio en curso.
 *
 * Un 404 significa que el código no existe en el nomenclador, que es un estado
 * posible y no un error: se devuelve vacío y la pantalla muestra las obras
 * sociales sin valor de consulta.
 *
 * Con `especialidad` el backend devuelve sólo los precios de esa especialidad y
 * los generales, y el de la especialidad gana: un mismo código puede tener
 * vigentes a la vez el precio de pediatría y uno general más bajo.
 */
async function consultaPorOS(
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

/**
 * Las observaciones de cada obra social, ya partidas en renglones.
 *
 * El texto se guarda como un bloque con saltos de línea reales, y cada renglón
 * arranca con un guion o un bullet que es decoración del editor, no contenido:
 * se quita para que la pantalla los muestre como lista y no como texto suelto
 * con guiones adentro.
 *
 * Si el endpoint falla se devuelve vacío en vez de tumbar el boletín entero:
 * sin observaciones la pantalla sigue sirviendo, sin precios no.
 */
async function observacionesPorOS(): Promise<Map<number, string[]>> {
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

/**
 * Los valores de pediatría de una obra social, en el orden de la lista del
 * Colegio. La consulta común no tiene precio pediátrico propio: va la misma
 * del boletín general (que para Swiss Medical ya es su código propio).
 */
function valoresPediatria(
  nro: number,
  precios: Map<string, Map<number, ApiBoletinItem>>,
  consulta: number | null
): ValorPediatria[] {
  const valores: ValorPediatria[] = [];
  for (const codigo of CODIGOS_PEDIATRIA[nro] ?? []) {
    const valor =
      codigo === CODIGO_CONSULTA_COMUN
        ? consulta
        : aNumero(precios.get(codigo)?.get(nro)?.precio_total);
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

  const [obras, consultas, consultasSwiss, galenos, observaciones, precios] =
    await Promise.all([
      // Sin filtro: el catálogo entero, ya ordenado alfabéticamente por el backend.
      listObrasSociales(),
      consultaPorOS(CODIGO_CONSULTA, fecha),
      consultaPorOS(CODIGO_CONSULTA_SWISS, fecha),
      fetchGalenosPorOS(fecha),
      observacionesPorOS(),
      // Sólo los pediatras piden los cinco códigos de pediatría.
      pediatria ? preciosPediatria(fecha) : Promise.resolve(null),
    ]);

  const items: ItemBoletin[] = [];

  for (const os of obras) {
    const nro = os.nro_obra_social;
    if (!nro) continue;

    // Swiss Medical factura la consulta con su propio código.
    const fuente = nro === SWISS_MEDICAL_NRO ? consultasSwiss : consultas;
    const item = fuente.get(nro);
    const galenosDeOS = galenos.get(nro) ?? [];
    const obsDeOS = observaciones.get(nro) ?? [];

    // Sin precio, sin galenos y sin condiciones no hay nada que mostrar. Una
    // obra social que sólo tiene observaciones sí entra: son las que exigen
    // bono o autorización, justo lo que el socio necesita saber antes de
    // atender aunque el precio todavía no esté cargado.
    const crudo = item ? aNumero(item.precio_total) : null;
    const consulta = crudo && crudo > 0 ? crudo : null;
    const pediatriaDeOS = precios ? valoresPediatria(nro, precios, consulta) : [];
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
