// Galenos vigentes por obra social, leídos de `nm_galenos`.
//
// El boletín viejo los guardaba como nueve columnas fijas en `valores_boletin`
// (galeno_quirurgico, gastos_radiologico, …). El nomenclador nuevo los modela
// como filas: cada obra social tiene los galenos que pactó, con nombre propio y
// —cuando corresponde— un precio por nivel.
//
// La diferencia no es cosmética. Hoy conviven galenos que no tienen casillero
// en el formato viejo (Ginecología, FASO, Urología, NUNOT, TAC) y otros que sí
// lo tienen pero con hasta diez niveles distintos (Cirugía Adultos). Volcarlos
// a las nueve columnas perdería los primeros y aplastaría los segundos en un
// solo número, así que las dos pantallas del boletín —la del Colegio y la del
// socio— consumen la lista tal cual viene.
//
// `GET /api/galenos/` NO pagina: no declara `page` ni `size`, así que devuelve
// la tabla entera (~1.800 filas vigentes) en una sola respuesta y hay que
// pedirla una sola vez. Mandarle `page`/`size` es peor que inútil: FastAPI los
// ignora, cada "página" vuelve completa, y un recorrido paginado no encuentra
// nunca la página corta que lo haría terminar.

import { getJSON } from "@/app/shared/lib/http";

/** Un galeno de una obra social, ya listo para mostrar. */
export interface GalenoItem {
  codigo: string;
  nombre: string;
  /** `null` cuando el galeno no está nivelado (un único precio). */
  nivel: number | null;
  valor: number;
  observacion: string;
}

/** Los galenos de cada obra social, por número de obra social. */
export type GalenosPorOS = Map<number, GalenoItem[]>;

interface ApiGaleno {
  obra_social_nro: number;
  codigo: string;
  nombre: string;
  nivel: number | null;
  valor_unitario: number | string;
  vigencia_desde: string | null;
  observacion: string | null;
  activo: boolean;
  visible?: boolean;
}

const aNumero = (v: number | string | null | undefined): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Hoy en formato `aaaa-mm-dd`, que es lo que espera `vigente_a`. */
export const hoyISO = (): string => {
  const d = new Date();
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
};

/**
 * Etiqueta del galeno para una tabla o un export: el nombre y, si está
 * nivelado, el nivel. Sin esto dos filas de Cirugía Adultos serían idénticas.
 */
export const etiquetaGaleno = (g: GalenoItem): string =>
  g.nivel === null ? g.nombre : `${g.nombre} N${g.nivel}`;

/** Un galeno es uno por obra social, código y nivel. */
const clave = (g: ApiGaleno): string =>
  `${g.obra_social_nro}|${g.codigo}|${g.nivel ?? -1}`;

/** Gana la vigencia más reciente; si empatan, el precio más alto. */
const esMasReciente = (g: ApiGaleno, previo: ApiGaleno): boolean => {
  const nueva = g.vigencia_desde ?? "";
  const vieja = previo.vigencia_desde ?? "";
  if (nueva !== vieja) return nueva > vieja;
  return aNumero(g.valor_unitario) > aNumero(previo.valor_unitario);
};

/**
 * Todos los galenos vigentes a una fecha, agrupados por obra social.
 *
 * `vigente_a` filtra por rango de vigencia, no por identidad: si una obra
 * social tiene varias vigencias que cubren la fecha para el mismo código y
 * nivel, las devuelve a todas. Vale la última, que es el precio en curso; las
 * anteriores quedaron abiertas por no habérseles cerrado `vigencia_hasta`.
 *
 * `soloVisibles` descarta los galenos ocultados desde "Actualizar Unidades"
 * (`visible = false`). Lo usa SOLO el boletín del médico; el del Colegio los
 * sigue mostrando todos.
 */
export async function fetchGalenosPorOS(
  fecha: string = hoyISO(),
  { soloVisibles = false }: { soloVisibles?: boolean } = {}
): Promise<GalenosPorOS> {
  const filas = await getJSON<ApiGaleno[]>("/api/galenos/", { vigente_a: fecha });

  const mejor = new Map<string, ApiGaleno>();
  for (const g of filas) {
    if (!g.obra_social_nro || g.activo === false) continue;
    if (soloVisibles && g.visible === false) continue;
    if (aNumero(g.valor_unitario) <= 0) continue;

    const k = clave(g);
    const previo = mejor.get(k);
    if (!previo || esMasReciente(g, previo)) mejor.set(k, g);
  }

  const porOS: GalenosPorOS = new Map();
  for (const g of mejor.values()) {
    const lista = porOS.get(g.obra_social_nro) ?? [];
    lista.push({
      codigo: g.codigo,
      nombre: g.nombre,
      nivel: g.nivel,
      valor: aNumero(g.valor_unitario),
      observacion: g.observacion ?? "",
    });
    porOS.set(g.obra_social_nro, lista);
  }

  // Dentro de cada obra social: por nombre y, en los nivelados, por nivel.
  for (const lista of porOS.values()) {
    lista.sort((a, b) => {
      const porNombre = a.nombre.localeCompare(b.nombre, "es", {
        sensitivity: "base",
      });
      if (porNombre !== 0) return porNombre;
      return (a.nivel ?? 0) - (b.nivel ?? 0);
    });
  }

  return porOS;
}

/** Un galeno con todos sus niveles juntos. */
export interface GrupoGaleno {
  codigo: string;
  nombre: string;
  /** Uno solo si el galeno no está nivelado; si no, uno por nivel, ordenados. */
  niveles: GalenoItem[];
  minimo: number;
  maximo: number;
}

/**
 * Junta los niveles de cada galeno.
 *
 * Sin esto, una obra social con Ginecología de trece niveles y Cirugía Adultos
 * de diez muestra veintitrés renglones casi iguales; agrupados son dos, y el
 * detalle se abre sólo si hace falta.
 */
export function agruparPorCodigo(galenos: GalenoItem[]): GrupoGaleno[] {
  const grupos = new Map<string, GalenoItem[]>();
  for (const g of galenos) {
    const lista = grupos.get(g.codigo) ?? [];
    lista.push(g);
    grupos.set(g.codigo, lista);
  }

  return [...grupos.values()]
    .map((niveles) => {
      const ordenados = [...niveles].sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0));
      const valores = ordenados.map((g) => g.valor);
      return {
        codigo: ordenados[0].codigo,
        nombre: ordenados[0].nombre,
        niveles: ordenados,
        minimo: Math.min(...valores),
        maximo: Math.max(...valores),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }));
}
