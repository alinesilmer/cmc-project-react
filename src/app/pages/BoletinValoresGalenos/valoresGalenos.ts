// El boletín de galenos dado vuelta: en vez de «qué paga esta obra social»,
// «cuánto paga cada obra social por este valor».
//
// Los datos llegan agrupados por obra social (`ItemBoletin.galenos`). Acá se
// reordenan una sola vez por tipo de valor, que es como los lee la pantalla.

import { agruparPorCodigo, type GalenoItem } from "@/app/features/nomenclador/galenos";
import type { ItemBoletin } from "@/app/pages/BoletinMedico/boletinMedico.api";

/** Un tipo de valor del boletín: «Galeno Quirúrgico», «Gasto Radiológico»… */
export interface TipoValor {
  codigo: string;
  nombre: string;
  /** Cuántas obras sociales lo tienen cargado. */
  obras: number;
  /** `true` si en alguna obra social tiene más de un nivel. */
  nivelado: boolean;
}

/** Lo que paga una obra social por un tipo de valor. */
export interface FilaValor {
  nro: number;
  nombre: string;
  minimo: number;
  maximo: number;
  /** Uno solo si no está nivelado; si no, uno por nivel, ordenados. */
  niveles: GalenoItem[];
}

export interface IndiceValores {
  tipos: TipoValor[];
  filas: Map<string, FilaValor[]>;
}

export type Orden = "valor" | "nombre";

const porNombre = (a: { nombre: string }, b: { nombre: string }): number =>
  a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });

export function indexarValores(items: ItemBoletin[]): IndiceValores {
  const tipos = new Map<string, TipoValor>();
  const filas = new Map<string, FilaValor[]>();

  for (const item of items) {
    for (const grupo of agruparPorCodigo(item.galenos)) {
      const tipo = tipos.get(grupo.codigo) ?? {
        codigo: grupo.codigo,
        nombre: grupo.nombre,
        obras: 0,
        nivelado: false,
      };
      tipo.obras += 1;
      tipo.nivelado = tipo.nivelado || grupo.niveles.length > 1;
      tipos.set(grupo.codigo, tipo);

      const lista = filas.get(grupo.codigo) ?? [];
      lista.push({
        nro: item.nro,
        nombre: item.nombre,
        minimo: grupo.minimo,
        maximo: grupo.maximo,
        niveles: grupo.niveles,
      });
      filas.set(grupo.codigo, lista);
    }
  }

  // Primero los que tienen casi todas las obras sociales: son los que más se
  // consultan. Los raros (FASO, TAC) quedan al final de su grupo.
  const ordenados = [...tipos.values()].sort(
    (a, b) => b.obras - a.obras || porNombre(a, b)
  );

  return { tipos: ordenados, filas };
}

export function ordenarFilas(filas: FilaValor[], orden: Orden): FilaValor[] {
  const copia = [...filas];
  if (orden === "nombre") return copia.sort(porNombre);
  return copia.sort((a, b) => b.maximo - a.maximo || porNombre(a, b));
}
