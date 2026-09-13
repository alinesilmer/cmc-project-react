// Carga de la tabla de aranceles de una obra social.
//
// Dos fuentes, una por cada cosa que hace falta saber:
//
//  1. `/api/nomenclador/` — QUÉ códigos puede ver este usuario. Con rol `medico`
//     el backend ya recorta por especialidad (sus NRO_ESPECIALIDAD* + los
//     universales `sin_restriccion_especialidad` + habilitaciones individuales,
//     menos las inhabilitaciones). No se replica esa regla acá: se toma la lista
//     que devuelve el servidor. Para operador/admin devuelve el catálogo completo
//     de la OS, así que la pantalla no cambia para ellos.
//  2. `/api/reportes_nm/tabla_valores` — CUÁNTO vale cada código en esa OS, ya
//     colapsado a una fila por código con sus componentes.
//
// El cruce (solo se muestran los códigos que están en 1) es lo que evita que un
// ginecólogo vea prácticas de urología: `tabla_valores` no filtra por
// especialidad, solo la usa para elegir la variante NE que corresponde.

import { paginar } from "../../../lib/paginar";
import { listNomenclador, getTablaValores } from "../nomenclador.api";
import type { TablaValorItem, ViaPractica } from "../nomenclador.types";

/** Tope del backend para cada endpoint. */
const NOM_PAGE = 200;
const TABLA_PAGE = 500;

/** Una OS real ronda los cientos de códigos; con estos `size` sobra de lejos. */
const MAX_PAGINAS = 12;

/** Códigos que el servidor habilita para el usuario logueado en esa obra social. */
export async function fetchCodigosVisibles(
  obraSocialNro: number,
): Promise<Set<string>> {
  const codigos = await paginar(
    (page) =>
      listNomenclador({
        obra_social_nro: obraSocialNro,
        activo: true,
        page,
        size: NOM_PAGE,
      }),
    { size: NOM_PAGE, maxPaginas: MAX_PAGINAS },
  );
  return new Set(codigos.map((n) => n.codigo.toUpperCase()));
}

/** Todas las filas con precio vigente de la obra social. */
export const fetchTablaValores = (params: {
  obraSocialNro: number;
  especialidades: number[];
  via: ViaPractica;
}): Promise<TablaValorItem[]> =>
  paginar(
    (page) =>
      getTablaValores({
        obra_social_nro: params.obraSocialNro,
        especialidades: params.especialidades.length ? params.especialidades : undefined,
        via: params.via,
        orden: "codigo",
        page,
        size: TABLA_PAGE,
      }),
    { size: TABLA_PAGE, maxPaginas: MAX_PAGINAS },
  );
