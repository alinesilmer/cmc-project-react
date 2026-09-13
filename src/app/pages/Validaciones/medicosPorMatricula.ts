// Índice de `listado_medico` por matrícula provincial.
//
// El reporte de Prevención Salud identifica al efector sólo por su "Matrícula
// MP" y por un nombre escrito a mano por la obra social ("Dr. LIOTTI  ACEVEDO
// NICOLAS L.D.", con doble espacio incluido). El nombre no sirve para atar la
// fila a nadie; la matrícula sí, contra `listado_medico.MATRICULA_PROV`.
//
// Se trae el padrón entero una vez y se indexa en memoria, en lugar de pedir
// `GET /api/medicos?q=<matrícula>` por fila: el reporte de agosto trae 147
// matrículas distintas en 529 filas, así que serían 147 viajes contra los ~23
// que cuesta paginar la lista completa (y `q` busca por LIKE, o sea que
// devuelve la matrícula 5863 pero también la 15863 y la 58630).

import { getJSON } from "../../lib/http";
import { paginar } from "../../lib/paginar";

/** El máximo que acepta `GET /api/medicos` (`limit: int = Query(50, le=200)`). */
const PAGINA = 200;

interface MedicoListRow {
  id: number;
  nro_socio: number | null;
  nombre: string | null;
  matricula_prov: number | null;
  activo: number;
}

export interface MedicoPadron {
  id: number;
  nroSocio: number | null;
  nombre: string;
  matricula: string;
  activo: boolean;
}

/** Matrícula comparable: sólo dígitos y sin ceros a la izquierda, porque el
 * reporte la manda como texto ("05863", "5863 ", "NO INFORMADO") y el padrón
 * como entero. Devuelve "" para lo que no tenga ningún dígito. */
export const claveMatricula = (valor: unknown): string =>
  String(valor ?? "")
    .replace(/\D/g, "")
    .replace(/^0+/, "");

/** Varios médicos pueden compartir matrícula (registros duplicados en el
 * padrón), así que el índice guarda todos y quien lo use decide qué hacer. */
export type IndiceMatriculas = Map<string, MedicoPadron[]>;

let cache: IndiceMatriculas | null = null;
let enVuelo: Promise<IndiceMatriculas> | null = null;

const aMedico = (f: MedicoListRow): MedicoPadron => ({
  id: f.id,
  nroSocio: f.nro_socio && f.nro_socio !== 0 ? f.nro_socio : null,
  nombre: (f.nombre ?? "").trim(),
  matricula: f.matricula_prov == null ? "" : String(f.matricula_prov),
  activo: Number(f.activo) === 1,
});

function indexar(filas: MedicoListRow[]): IndiceMatriculas {
  const idx: IndiceMatriculas = new Map();
  for (const fila of filas) {
    const clave = claveMatricula(fila?.matricula_prov);
    if (!clave) continue;
    const medico = aMedico(fila);
    const previos = idx.get(clave);
    if (previos) previos.push(medico);
    else idx.set(clave, [medico]);
  }
  // Con matrícula repetida, el activo va primero: es el que corresponde
  // facturar cuando el duplicado es una ficha vieja dada de baja.
  for (const lista of idx.values()) {
    lista.sort((a, b) => Number(b.activo) - Number(a.activo));
  }
  return idx;
}

/** Trae (o reutiliza) el índice. Lanza si el usuario no tiene `medico:leer`. */
export async function getIndiceMatriculas(): Promise<IndiceMatriculas> {
  if (cache) return cache;
  // Sin esto, dos lecturas seguidas paginan el padrón dos veces.
  if (enVuelo) return enVuelo;

  enVuelo = (async () => {
    const filas = await paginar<MedicoListRow>(
      (page) =>
        getJSON<MedicoListRow[]>("/api/medicos", {
          skip: (page - 1) * PAGINA,
          limit: PAGINA,
          estado: "todos",
        }),
      { size: PAGINA }
    );
    cache = indexar(filas);
    return cache;
  })();

  try {
    return await enVuelo;
  } finally {
    enVuelo = null;
  }
}

/** Para tests y para forzar una relectura si el padrón cambió. */
export function limpiarCacheMatriculas(): void {
  cache = null;
}

export type ResultadoMatricula =
  /** La matrícula no vino en el reporte (viene "NO INFORMADO" o vacía). */
  | { tipo: "sin-matricula" }
  /** La matrícula no está en `listado_medico`. */
  | { tipo: "no-encontrado" }
  | { tipo: "encontrado"; medico: MedicoPadron }
  /** Más de una ficha con la misma matrícula: hay que resolverlo a mano. */
  | { tipo: "ambiguo"; medico: MedicoPadron; total: number };

export function buscarPorMatricula(
  idx: IndiceMatriculas,
  matricula: string
): ResultadoMatricula {
  const clave = claveMatricula(matricula);
  if (!clave) return { tipo: "sin-matricula" };

  const encontrados = idx.get(clave);
  if (!encontrados?.length) return { tipo: "no-encontrado" };
  if (encontrados.length > 1)
    return { tipo: "ambiguo", medico: encontrados[0], total: encontrados.length };
  return { tipo: "encontrado", medico: encontrados[0] };
}
