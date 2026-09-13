// Carga de la tabla "códigos por especialidad" de una obra social.
//
// Tres fuentes, ninguna nueva: las tres rutas ya existen y ya están declaradas
// en `authz.py` (`nomenclador:leer` las tres; el catálogo de especialidades del
// Colegio pide `catalogo:leer`). No hace falta tocar el backend.
//
//  1. `/api/nomenclador/?obra_social_nro=N` — QUÉ códigos existen para esa OS
//     (propios + compartidos del Colegio) y de dónde salen `complejidad` y
//     `sin_restriccion_especialidad`. Con rol `medico` el backend ya recorta la
//     lista a lo que ese médico tiene habilitado, así que esta fuente es la que
//     mantiene el cerco: elegir otra especialidad en el combo NO amplía lo que
//     ve, porque el cruce siempre se hace contra esta lista.
//  2. `/api/nomenclador/especialidades?especialidad_id_colegio=E` — QUÉ códigos
//     están mapeados a la especialidad elegida (nm_nomenclador_especialidad).
//     El endpoint no filtra por obra social; el recorte por OS lo da (1).
//  3. `/api/reportes_nm/tabla_valores` — CUÁNTO vale cada código en esa OS, ya
//     colapsado a una fila por código, con `origen` (NE > NNE > NN), `nivel` y
//     los componentes. `especialidades` acá no filtra: solo elige qué variante
//     de precio gana, por eso hay que cruzar igual con (1) y (2).

import { paginar } from "../../../lib/paginar";
import {
  listNomenclador,
  listNomencladorEspecialidadesResumen,
  getTablaValores,
} from "../nomenclador.api";
import type { NomencladorOut, TablaValorItem, ViaPractica } from "../nomenclador.types";

/** Tope de `size` que acepta cada endpoint (ge=1, le=... en el backend). */
const NOM_PAGE = 200;
const ESP_PAGE = 200;
const TABLA_PAGE = 500;

/** Una OS real ronda los cientos de códigos; con estos `size` sobra de lejos. */
const MAX_PAGINAS = 12;

/** Códigos que el servidor habilita para el usuario logueado en esa obra social. */
export const fetchCatalogoOS = (obraSocialNro: number): Promise<NomencladorOut[]> =>
  paginar(
    (page) =>
      listNomenclador({
        obra_social_nro: obraSocialNro,
        activo: true,
        page,
        size: NOM_PAGE,
      }),
    { size: NOM_PAGE, maxPaginas: MAX_PAGINAS },
  );

/** Códigos mapeados a una especialidad (mapeo activo), en MAYÚSCULAS. */
export async function fetchCodigosDeEspecialidad(
  especialidadIdColegio: number,
): Promise<Set<string>> {
  const filas = await paginar(
    (page) =>
      listNomencladorEspecialidadesResumen({
        especialidad_id_colegio: especialidadIdColegio,
        activo: true,
        page,
        size: ESP_PAGE,
      }),
    { size: ESP_PAGE, maxPaginas: MAX_PAGINAS },
  );
  return new Set(filas.map((f) => f.codigo.toUpperCase()));
}

/** Filas con precio vigente de la obra social, con la variante NE de la especialidad. */
export const fetchTablaValores = (params: {
  obraSocialNro: number;
  especialidadIdColegio: number;
  via: ViaPractica;
}): Promise<TablaValorItem[]> =>
  paginar(
    (page) =>
      getTablaValores({
        obra_social_nro: params.obraSocialNro,
        especialidades: [params.especialidadIdColegio],
        via: params.via,
        orden: "codigo",
        page,
        size: TABLA_PAGE,
      }),
    { size: TABLA_PAGE, maxPaginas: MAX_PAGINAS },
  );
