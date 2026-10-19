// Galenos vigentes por obra social, leídos de `nm_galenos`.

import { getJSON } from "@/app/shared/lib/http";
import { aNumero } from "@/app/shared/lib/utiles";

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
/** Hoy en formato `aaaa-mm-dd`, que es lo que espera `vigente_a`. */
export const hoyISO = (): string => {
  const d = new Date();
  const dd = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${dd(d.getMonth() + 1)}-${dd(d.getDate())}`;
};

/** Etiqueta del galeno para una tabla o un export: el nombre y, si está nivelado, el nivel. */
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

/** Todos los galenos vigentes a una fecha, agrupados por obra social. */
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

/** Junta los niveles de cada galeno. */
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
