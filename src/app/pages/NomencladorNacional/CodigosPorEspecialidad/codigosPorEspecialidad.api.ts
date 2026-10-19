// Carga de la tabla "códigos por especialidad" de una obra social.

import { paginar } from "@/app/shared/lib/paginar";
import {
  listNomenclador,
  listCodigosPorEspecialidad,
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

/** Códigos habilitados para una especialidad, EN ESTA OS (mapeo activo), en MAYÚSCULAS. */
export async function fetchCodigosDeEspecialidad(
  obraSocialNro: number,
  especialidadIdColegio: number,
): Promise<Set<string>> {
  const filas = await paginar(
    (page) =>
      listCodigosPorEspecialidad({
        obra_social_nro: obraSocialNro,
        especialidad_id_colegio: especialidadIdColegio,
        page,
        size: ESP_PAGE,
      }),
    { size: ESP_PAGE, maxPaginas: MAX_PAGINAS },
  );
  return new Set(filas.map((f) => f.codigo.toUpperCase()));
}

/** Descripción + "sin restricción" de cada código CON PRECIO vigente en la OS, sin filtrar por especialidad — dato de la variante ganadora. */
export async function fetchDescripcionesOS(
  obraSocialNro: number,
): Promise<Map<string, { descripcion: string; universal: boolean }>> {
  const filas = await paginar(
    (page) =>
      getTablaValores({ obra_social_nro: obraSocialNro, orden: "codigo", page, size: TABLA_PAGE }),
    { size: TABLA_PAGE, maxPaginas: MAX_PAGINAS },
  );
  const map = new Map<string, { descripcion: string; universal: boolean }>();
  for (const f of filas) {
    map.set(f.codigo.toUpperCase(), {
      descripcion: f.descripcion ?? "",
      universal: f.sin_restriccion_especialidad,
    });
  }
  return map;
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
